import JSZip from 'jszip'
import {describe, expect, it} from 'vitest'

import {build_epub} from '../lib/shamela/epub'
import type {BookInfo, BookPage} from '../lib/shamela/types'

const info: BookInfo = {
    id: 42,
    url: 'https://shamela.ws/book/42',
    title: 'Test Book',
    author: 'Author',
    about: '<div>Test Book</div>',
    toc: [
        {page: 1, text: 'Intro'},
        [{page: 2, text: 'Part One'}, [{page: 2, text: 'Chapter One'}]],
    ],
}

const pages: BookPage[] = [
    {page_number: 1, page: 1, text_html: '<div><p>Page 1</p></div>'},
    {page_number: 2, page: 2, text_html: '<div><p>Page 2</p></div>'},
]

const extract_hrefs = (content: string, pattern: RegExp) =>
    Array.from(content.matchAll(pattern))
        .map(match => String(match[1] ?? '').trim())
        .filter(Boolean)

const split_target = (href: string) => {
    const [path, fragment = ''] = href.split('#')
    return {path, fragment}
}

describe('build_epub', () => {
    it('creates an epub with expected files', async () => {
        const {blob, filename} = await build_epub(info, pages, {update_hamesh: false})

        expect(filename).toContain('(42).epub')

        const zip = await JSZip.loadAsync(await blob.arrayBuffer())
        const mimetype = await zip.file('mimetype')?.async('string')
        const opf = await zip.file('OEBPS/content.opf')?.async('string')
        const nav = await zip.file('OEBPS/nav.xhtml')?.async('string')
        const info_page = await zip.file('OEBPS/info.xhtml')?.async('string')
        const page_key = Object.keys(zip.files).find(
            key => key.startsWith('OEBPS/text/') && key.endsWith('.xhtml'),
        )
        expect(page_key).toBeTruthy()
        const page = page_key ? await zip.file(page_key)?.async('string') : ''

        expect(mimetype).toBe('application/epub+zip')
        expect(opf).toContain('<dc:title>Test Book</dc:title>')
        expect(info_page).toContain('Test Book')
        expect(nav).toContain('Intro')
        expect(page).toContain('Page 1')
    })

    it('flattens toc when option enabled', async () => {
        const nested = await build_epub(info, pages, {flatten_toc: false})
        const flat = await build_epub(info, pages, {flatten_toc: true})

        const nested_zip = await JSZip.loadAsync(await nested.blob.arrayBuffer())
        const flat_zip = await JSZip.loadAsync(await flat.blob.arrayBuffer())

        const nested_nav = await nested_zip.file('OEBPS/nav.xhtml')?.async('string')
        const flat_nav = await flat_zip.file('OEBPS/nav.xhtml')?.async('string')

        const nested_count = (nested_nav?.match(/<ol>/g) ?? []).length
        const flat_count = (flat_nav?.match(/<ol>/g) ?? []).length

        expect(nested_count).toBeGreaterThan(1)
        expect(flat_count).toBe(1)
    })

    it('supports local metadata and custom filename', async () => {
        const local_info: BookInfo = {
            id: 0,
            url: '',
            title: 'Local Book',
            author: 'Local Author',
            output_filename: 'local-book.epub',
            local_identifier: 'urn:local:test-id',
            publisher: 'Local Conversion',
            toc: [{page: 1, text: 'Intro', anchor: 'toc_1'}],
        }

        const {blob, filename} = await build_epub(local_info, pages, {include_toc_page: false})
        expect(filename).toBe('local-book.epub')

        const zip = await JSZip.loadAsync(await blob.arrayBuffer())
        const opf = await zip.file('OEBPS/content.opf')?.async('string')
        const nav = await zip.file('OEBPS/nav.xhtml')?.async('string')
        const ncx = await zip.file('OEBPS/toc.ncx')?.async('string')
        expect(opf).toContain('<dc:identifier id="bookid">urn:local:test-id</dc:identifier>')
        expect(opf).toContain('<dc:publisher>Local Conversion</dc:publisher>')
        expect(opf).not.toContain('<itemref idref="nav" />')
        expect(nav).not.toContain('<a href="nav.xhtml">')
        expect(ncx).not.toContain('<content src="nav.xhtml"/>')
    })

    it('uses page part value in generated xhtml filenames', async () => {
        const part_pages: BookPage[] = [
            {page_number: 1, page: 1, part: 2, text_html: '<div><p>Part page</p></div>'},
        ]

        const {blob} = await build_epub(info, part_pages, {update_hamesh: false})
        const zip = await JSZip.loadAsync(await blob.arrayBuffer())
        const keys = Object.keys(zip.files)

        expect(keys.some(key => key.includes('OEBPS/text/page_2_'))).toBe(true)
    })

    it('uses plain page_ prefix when part is missing', async () => {
        const no_part_pages: BookPage[] = [
            {page_number: 1, page: 1, text_html: '<div><p>No part</p></div>'},
            {page_number: 2, page: 2, text_html: '<div><p>No part 2</p></div>'},
        ]

        const {blob} = await build_epub(info, no_part_pages, {update_hamesh: false})
        const zip = await JSZip.loadAsync(await blob.arrayBuffer())
        const keys = Object.keys(zip.files)

        expect(keys.some(key => key.includes('OEBPS/text/page_1_'))).toBe(false)
        expect(keys.some(key => key.includes('OEBPS/text/page1_'))).toBe(false)
        expect(keys.some(key => key.includes('OEBPS/text/page_01.xhtml'))).toBe(true)
    })

    it('keeps metadata and toc links epubcheck-safe', async () => {
        const strict_info: BookInfo = {
            id: 0,
            url: '',
            title: 'Strict Book',
            author: 'Author',
            local_identifier: 'urn:local:strict-id',
            toc: [
                {page: 1, text: 'Has Anchor', anchor: 'toc_10'},
                {page: 2, text: 'Missing Anchor Fallback', anchor: 'toc_999'},
            ],
        }

        const strict_pages: BookPage[] = [
            {page_number: 1, page: 1, text_html: '<div><h2 id="toc_10">One</h2><p>Body</p></div>'},
            {page_number: 2, page: 2, text_html: '<div><p>Two</p></div>'},
        ]

        const {blob} = await build_epub(strict_info, strict_pages, {include_toc_page: true})
        const zip = await JSZip.loadAsync(await blob.arrayBuffer())
        const opf = (await zip.file('OEBPS/content.opf')?.async('string')) || ''
        const ncx = (await zip.file('OEBPS/toc.ncx')?.async('string')) || ''
        const nav = (await zip.file('OEBPS/nav.xhtml')?.async('string')) || ''
        const css = (await zip.file('OEBPS/styles.css')?.async('string')) || ''

        const modified = opf.match(/<meta property="dcterms:modified">([^<]+)<\/meta>/)?.[1]
        expect(modified).toBeTruthy()
        expect(modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
        expect(opf).toContain('<dc:identifier id="bookid">urn:local:strict-id</dc:identifier>')
        expect(ncx).toContain('<meta content="urn:local:strict-id" name="dtb:uid"/>')
        expect(css).not.toContain('direction:')

        const nav_hrefs = extract_hrefs(nav, /href="([^"]+)"/g).filter(href =>
            href.startsWith('text/'),
        )
        const ncx_hrefs = extract_hrefs(ncx, /<content src="([^"]+)"/g).filter(href =>
            href.startsWith('text/'),
        )
        const all_hrefs = [...new Set([...nav_hrefs, ...ncx_hrefs])]

        for (const href of all_hrefs) {
            const {path, fragment} = split_target(href)
            const full_path = `OEBPS/${path}`
            const target = zip.file(full_path)
            expect(target, `missing target file: ${full_path}`).toBeTruthy()
            if (!target || !fragment) continue
            const target_html = (await target.async('string')) || ''
            expect(
                target_html.includes(`id="${fragment}"`),
                `missing fragment ${fragment} in ${full_path}`,
            ).toBe(true)
        }

        const unresolved_anchor_links = all_hrefs.filter(href => href.includes('#toc_999'))
        expect(unresolved_anchor_links.length).toBe(0)
    })
})

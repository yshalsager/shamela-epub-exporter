import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { build_epub } from '../src/lib/shamela/epub'
import type { BookInfo, BookPage } from '../src/lib/shamela/types'

const info: BookInfo = {
  id: 42,
  url: 'https://shamela.ws/book/42',
  title: 'Test Book',
  author: 'Author',
  about: '<div>Test Book</div>',
  toc: [
    { page: 1, text: 'Intro' },
    [
      { page: 2, text: 'Part One' },
      [{ page: 2, text: 'Chapter One' }],
    ],
  ],
}

const pages: BookPage[] = [
  { page_number: 1, page: 1, text_html: '<div><p>Page 1</p></div>' },
  { page_number: 2, page: 2, text_html: '<div><p>Page 2</p></div>' },
]

describe('build_epub', () => {
  it('creates an epub with expected files', async () => {
    const { blob, filename } = await build_epub(info, pages, { update_hamesh: false })

    expect(filename).toContain('(42).epub')

    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const mimetype = await zip.file('mimetype')?.async('string')
    const opf = await zip.file('OEBPS/content.opf')?.async('string')
    const nav = await zip.file('OEBPS/nav.xhtml')?.async('string')
    const info_page = await zip.file('OEBPS/info.xhtml')?.async('string')
    const page_key = Object.keys(zip.files).find(
      (key) => key.startsWith('OEBPS/text/') && key.endsWith('.xhtml')
    )
    expect(page_key).toBeTruthy()
    const page = page_key ? await zip.file(page_key)?.async('string') : ''

    expect(mimetype).toBe('application/epub+zip')
    expect(opf).toContain('<dc:title>Test Book</dc:title>')
    expect(info_page).toContain('Test Book')
    expect(nav).toContain('Intro')
    expect(page).toContain('Page 1')
  })
})

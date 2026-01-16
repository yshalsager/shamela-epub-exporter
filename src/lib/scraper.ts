import type {Platform} from '@/lib/platform'
import {cut_toc, get_number_from_url, get_start_end_pages} from '@/lib/shamela/scrape-utils'
import type {
    BookInfo,
    BookPage,
    JobOptions,
    JobProgress,
    TocBranch,
    TocItem,
    TocTree,
} from '@/lib/shamela/types'

const SELECTORS = {
    page_content: '.nass',
    search: 'div.text-left',
    index: 'div.betaka-index',
    toc: 'h4 + ul > li',
    toc_nav: '.s-nav',
    chapters: "ul a[href*='/book/']",
    author: 'h1 + div a',
    title: 'h1 a',
    copy_btn: 'a.btn_tag',
    page_number: 'input#fld_goto_bottom',
    page_parts_menu: '#fld_part_top ~ div ul[role="menu"]',
    page_part: '#fld_part_top ~ div button',
    next_page: 'input#fld_goto_bottom + a',
    last_page: 'input#fld_goto_bottom + a + a',
}

export interface ScrapeCallbacks {
    on_meta: (info: BookInfo) => void
    on_page: (page: BookPage) => void
    on_progress: (progress: JobProgress) => void
    on_done: () => void
    on_error: (error: string) => void
}

const fetch_doc = async (
    platform: Platform,
    url: string,
    signal: AbortSignal,
): Promise<Document> => {
    const response = await platform.http.fetch(url, {signal})
    if (response.status === 403) throw new Error('cloudflare_challenge')
    if (!response.ok) throw new Error(`fetch_failed:${response.status}`)
    const html = await response.text()
    return new DOMParser().parseFromString(html, 'text/html')
}

const parse_toc = (items: Element[], seen: Set<string> = new Set()): TocTree => {
    const result: TocTree = []

    for (const item of items) {
        const link = item.querySelector('a')
        const href = link?.getAttribute('href') ?? ''
        if (!href || href.startsWith('javascript') || href.startsWith('#')) continue

        const entry: TocItem = {
            page: get_number_from_url(href),
            text: link?.textContent?.trim() ?? '',
        }
        const key = `${entry.page}:${entry.text}`
        if (seen.has(key)) continue
        seen.add(key)

        const sub_list = Array.from(item.children).find(child => child.tagName === 'UL') as
            | Element
            | undefined
        const sub_items = sub_list
            ? Array.from(sub_list.children).filter(child => child.tagName === 'LI')
            : []
        if (sub_items.length) {
            const branch: TocBranch = [entry, parse_toc(sub_items, seen)]
            result.push(branch)
        } else {
            result.push(entry)
        }
    }

    return result
}

const chapters_by_page = (anchors: Element[]) => {
    const chapters: Record<number, string[]> = {}

    for (const anchor of anchors) {
        const href = anchor.getAttribute('href') ?? ''
        const page = get_number_from_url(href)
        if (!page) continue
        const text = anchor.textContent?.trim() ?? ''
        if (!chapters[page]) chapters[page] = []
        if (text) chapters[page].push(text)
    }

    return chapters
}

const clean_page_html = (page_content: Element) => {
    page_content.querySelectorAll(SELECTORS.copy_btn).forEach(el => el.remove())
    page_content.querySelectorAll('span').forEach(el => {
        if (!el.textContent?.trim()) el.remove()
    })
    page_content.querySelectorAll('p[style="font-size: 15px"]').forEach(el => {
        el.removeAttribute('style')
    })

    const container = page_content.querySelector('div') ?? page_content
    return container.outerHTML
}

const fetch_initial_metadata = async (
    platform: Platform,
    book_id: number,
    existing_doc: Document | null,
    signal: AbortSignal,
): Promise<{meta_doc: Document; first_page_doc: Document}> => {
    const base_url = `https://shamela.ws/book/${book_id}`
    const meta_doc = existing_doc ?? (await fetch_doc(platform, base_url, signal))
    const first_page_doc = await fetch_doc(platform, `${base_url}/1`, signal)
    return {meta_doc, first_page_doc}
}

export const scrape_book = async (
    platform: Platform,
    book_id: number,
    options: JobOptions,
    callbacks: ScrapeCallbacks,
    signal: AbortSignal,
    existing_doc: Document | null = null,
): Promise<void> => {
    try {
        const base_url = `https://shamela.ws/book/${book_id}`

        const {meta_doc, first_page_doc} = await fetch_initial_metadata(
            platform,
            book_id,
            existing_doc,
            signal,
        )

        const meta_content = meta_doc.querySelector(SELECTORS.page_content)
        if (!meta_content) throw new Error('page_content_missing')

        meta_content.querySelector(SELECTORS.search)?.remove()

        const total_pages = get_number_from_url(
            first_page_doc.querySelector(SELECTORS.last_page)?.getAttribute('href') ?? '',
        )

        const toc_els = Array.from(meta_doc.querySelectorAll(SELECTORS.index))
        toc_els.forEach(el =>
            el
                .querySelectorAll('a[href^="javascript"], a[href="#"]')
                .forEach(link => link.remove()),
        )
        let toc_items = toc_els.flatMap(el => Array.from(el.querySelectorAll(SELECTORS.toc)))
        let toc_source: Element | null = toc_els[0] ?? null

        if (!toc_items.length) {
            const nav = first_page_doc.querySelector(SELECTORS.toc_nav)
            if (nav) {
                nav.querySelectorAll('a[href^="javascript"], a[href="#"]').forEach(link =>
                    link.remove(),
                )
                toc_items = Array.from(nav.querySelectorAll('ul > li'))
                toc_source = nav
            }
        }

        const toc = toc_items.length ? parse_toc(toc_items) : []
        let chapter_anchors = toc_source
            ? Array.from(toc_source.querySelectorAll(SELECTORS.chapters))
            : []
        if (!chapter_anchors.length) {
            chapter_anchors = Array.from(meta_content.querySelectorAll(SELECTORS.chapters))
        }
        const page_chapters = chapters_by_page(chapter_anchors)

        const about_el = meta_content.cloneNode(true) as Element
        about_el.querySelector(SELECTORS.search)?.remove()
        about_el.querySelectorAll(SELECTORS.index).forEach(el => el.remove())
        about_el.removeAttribute('class')
        const about = about_el.outerHTML

        const title =
            meta_doc.querySelector(SELECTORS.title)?.textContent?.trim() || `الكتاب ${book_id}`
        const author = meta_doc.querySelector(SELECTORS.author)?.textContent?.trim() || undefined

        let volumes: Record<string, [number, number]> = {}
        const parts_menu = first_page_doc.querySelector(SELECTORS.page_parts_menu)
        if (parts_menu) {
            const parts = Array.from(parts_menu.querySelectorAll('li a')).slice(1)
            const volume_starts: Record<string, number> = {}
            parts.forEach(part => {
                const name = part.textContent?.trim() ?? ''
                const href = part.getAttribute('href') ?? ''
                const page = get_number_from_url(href)
                if (name && page) volume_starts[name] = page
            })
            volumes = get_start_end_pages(volume_starts, total_pages || 1)
        }

        const info: BookInfo = {
            id: book_id,
            url: base_url,
            title,
            author,
            about,
            toc,
            page_chapters,
            volumes,
        }

        let start_page = 1
        let end_page = total_pages || 1

        if (options.volume) {
            const range = volumes[options.volume]
            if (!range) throw new Error(`volume_not_found:${options.volume}`)
            start_page = range[0]
            end_page = range[1]
            info.volumes = {[options.volume]: range}
            info.toc = cut_toc(info.toc ?? [], range)
            info.page_chapters = Object.fromEntries(
                Object.entries(info.page_chapters ?? {}).filter(([key]) => {
                    const page = Number.parseInt(key, 10)
                    return page >= range[0] && page <= range[1]
                }),
            )
            info.title = `${info.title} - ${options.volume}`
        }

        callbacks.on_meta(info)

        const total = Math.max(0, end_page - start_page + 1)
        let current = 0
        const batch_size = 5

        for (let start = start_page; start <= end_page; start += batch_size) {
            if (signal.aborted) return

            const batch_numbers: number[] = []
            for (
                let page_number = start;
                page_number <= end_page && page_number < start + batch_size;
                page_number += 1
            ) {
                batch_numbers.push(page_number)
            }

            const batch_docs = batch_numbers.map(async page_number => {
                if (page_number === 1) {
                    return {page_number, doc: first_page_doc}
                }
                const doc = await fetch_doc(platform, `${base_url}/${page_number}`, signal)
                return {page_number, doc}
            })

            const pages = await Promise.all(batch_docs)
            pages.sort((a, b) => a.page_number - b.page_number)

            for (const {page_number, doc} of pages) {
                if (signal.aborted) return

                const page_content = doc.querySelector(SELECTORS.page_content)
                if (!page_content) continue

                const page_value = Number.parseInt(
                    doc.querySelector(SELECTORS.page_number)?.getAttribute('value') ??
                        `${page_number}`,
                    10,
                )

                const payload: BookPage = {
                    page_number,
                    page: Number.isNaN(page_value) ? page_number : page_value,
                    text_html: clean_page_html(page_content),
                }

                callbacks.on_page(payload)

                current += 1
                callbacks.on_progress({current, total})
            }
        }

        callbacks.on_done()
    } catch (error) {
        if (signal.aborted) return
        callbacks.on_error(String((error as Error).message ?? error))
    }
}

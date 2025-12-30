import {cut_toc, get_number_from_url, get_start_end_pages} from '@/lib/shamela/scrape-utils'
import type {
    BookInfo,
    BookPage,
    JobOptions,
    RuntimeMessage,
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

const fetch_doc = async (url: string, signal: AbortSignal) => {
    const response = await fetch(url, {credentials: 'include', signal})
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

const scrape_book = async (
    job_id: string,
    book_id: number,
    options: JobOptions,
    signal: AbortSignal,
) => {
    const base_url = `https://shamela.ws/book/${book_id}`
    const meta_doc = document.cloneNode(true) as Document
    const meta_content = meta_doc.querySelector(SELECTORS.page_content)
    if (!meta_content) throw new Error('page_content_missing')

    meta_content.querySelector(SELECTORS.search)?.remove()
    const first_page_doc = await fetch_doc(`${base_url}/1`, signal)
    const total_pages = get_number_from_url(
        first_page_doc.querySelector(SELECTORS.last_page)?.getAttribute('href') ?? '',
    )

    const toc_els = Array.from(meta_doc.querySelectorAll(SELECTORS.index))
    toc_els.forEach(el =>
        el.querySelectorAll('a[href^="javascript"], a[href="#"]').forEach(link => link.remove()),
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

    browser.runtime.sendMessage({
        type: 'scrape/meta',
        job_id,
        payload: info,
    })

    const total = Math.max(0, end_page - start_page + 1)
    let current = 0

    for (let page_number = start_page; page_number <= end_page; page_number += 1) {
        if (signal.aborted) return
        const doc =
            page_number === 1
                ? first_page_doc
                : await fetch_doc(`${base_url}/${page_number}`, signal)
        const page_content = doc.querySelector(SELECTORS.page_content)
        if (!page_content) continue

        const page_value = Number.parseInt(
            doc.querySelector(SELECTORS.page_number)?.getAttribute('value') ?? `${page_number}`,
            10,
        )

        const payload: BookPage = {
            page_number,
            page: Number.isNaN(page_value) ? page_number : page_value,
            text_html: clean_page_html(page_content),
        }

        browser.runtime.sendMessage({
            type: 'scrape/page',
            job_id,
            payload,
        })

        current += 1
        browser.runtime.sendMessage({
            type: 'scrape/progress',
            job_id,
            payload: {current, total},
        })
    }

    browser.runtime.sendMessage({type: 'scrape/done', job_id})
}

export default defineContentScript({
    matches: ['https://shamela.ws/book/*'],
    main() {
        const controllers = new Map<string, AbortController>()

        browser.runtime.onMessage.addListener((message: RuntimeMessage) => {
            if (!message || typeof message.type !== 'string') return
            if (message.type === 'scrape/start') {
                const {book_id, options} = message.payload || {}
                if (!book_id || !message.job_id) return
                const controller = new AbortController()
                controllers.set(message.job_id, controller)

                scrape_book(message.job_id, Number(book_id), options ?? {}, controller.signal)
                    .catch(error => {
                        if (controller.signal.aborted) return
                        browser.runtime.sendMessage({
                            type: 'scrape/error',
                            job_id: message.job_id,
                            payload: {message: String(error.message ?? error)},
                        })
                    })
                    .finally(() => {
                        controllers.delete(message.job_id)
                    })
            }

            if (message.type === 'scrape/cancel' && message.job_id) {
                controllers.get(message.job_id)?.abort()
                controllers.delete(message.job_id)
                browser.runtime.sendMessage({
                    type: 'scrape/error',
                    job_id: message.job_id,
                    payload: {message: 'canceled'},
                })
            }
        })
    },
})

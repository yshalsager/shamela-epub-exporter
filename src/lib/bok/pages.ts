import type {BookInfo, BookPage, TocItem, TocTree} from '@/lib/shamela/types'

import {parse_raw_toc} from './analyze'
import {decode_value, to_int} from './encoding'
import type {
    book_payload,
    book_selection,
    mdb_reader,
    page_reader,
    table_meta_map,
    toc_item_raw,
} from './types'

const XHTML_VOID_ELEMENTS_PATTERN =
    /<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)(\s[^>]*)?\/?>/gi

export const escape_xml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

export const sanitize_filename = (value: string) =>
    value
        .replace(/[/:*?"<>|]+/g, '_')
        .replace(/\s+/g, ' ')
        .trim()

export const sanitize_html_for_xhtml = (html: string) =>
    html.replace(XHTML_VOID_ELEMENTS_PATTERN, '<$1$2 />')

export const lower = (value: unknown) => String(value ?? '').toLowerCase()

export const looks_like_html = (text: string) => /<\/?(p|br|div|span|h[1-6]|font)\b/i.test(text)

export const is_heading_text = (text: string) => /^(?:تفسير\s+سورة|سورة)\s+/.test(text)
const heading_tag_for_level = (level: number | null) =>
    `h${Math.min(4, Math.max(2, (Number(level) || 1) + 1))}`
const normalize_match_text = (text: string) =>
    String(text ?? '')
        .replace(/\s+/g, ' ')
        .trim()
const plain_text_from_html = (html: string) =>
    normalize_match_text(String(html ?? '').replace(/<[^>]+>/g, ' '))
const first_heading_text_from_html = (html: string) => {
    const match = String(html ?? '')
        .trim()
        .match(/^<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)
    return match ? plain_text_from_html(match[1]) : ''
}

export const split_plain_text = (raw: unknown) => {
    const text = String(raw ?? '')
        .replaceAll('\0', '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/بسم الله الرحمن الرحيم\s+(?=سورة|تفسير\s+سورة)/g, 'بسم الله الرحمن الرحيم\n')
        .replace(/(?<!^)(\s+)(?=تفسير\s+سورة\s+)/g, '\n')
        .trim()
    if (!text) return []

    const lines = text
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean)
    const out: string[] = []
    const numbered_pat =
        /(?=(?:^|[\s\u00A0])(?:[0-9]{1,4}|[\u0660-\u0669]{1,4}|[\u06F0-\u06F9]{1,4})\s*[-–—]\s+)/g

    lines.forEach(line => {
        if (line.length < 220) {
            out.push(line)
            return
        }
        const parts = line
            .split(numbered_pat)
            .map(part => part.trim())
            .filter(Boolean)
        if (parts.length >= 2) out.push(...parts)
        else out.push(line)
    })

    return out
}

export const to_html_paragraphs = (text: unknown) => {
    const raw = decode_value(text).replaceAll('\0', '').trim()
    if (!raw) return []
    if (looks_like_html(raw)) return [raw]
    const parts = split_plain_text(raw)
    if (!parts.length) return [`<p>${escape_xml(raw)}</p>`]
    return parts.map(part => `<p>${escape_xml(part)}</p>`)
}

const nest_by_level = (items: Array<toc_item_raw & {anchor: string; page: number}>): TocTree => {
    if (!items.length) return []
    const root: TocTree = []
    const stack: Array<{level: number; children: TocTree}> = [{level: 0, children: root}]

    const get_level = (item: toc_item_raw) =>
        typeof item.level === 'number' && Number.isFinite(item.level) && item.level > 0
            ? item.level
            : 1

    items.forEach(item => {
        const level = get_level(item)
        while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
        const parent = stack[stack.length - 1]
        const children: TocTree = []
        const entry: TocItem = {text: item.text, page: item.page, anchor: item.anchor}
        parent.children.push([entry, children])
        stack.push({level, children})
    })

    return root
}

export const create_pages_reader = (
    mdb: mdb_reader,
    table_meta: table_meta_map,
    selection: book_selection,
    toc_items: toc_item_raw[] | null = null,
): page_reader => {
    const content_table = selection.content_table
    const text_col = selection.content_text_col
    if (!content_table || !text_col) throw new Error('حدد جدول المحتوى وعمود النص')

    const toc_starts = toc_items?.map(item => item.start) ?? null
    const toc_by_start = new Map<number, toc_item_raw>()
    ;(toc_items ?? []).forEach(item => {
        if (typeof item?.start !== 'number' || toc_by_start.has(item.start)) return
        toc_by_start.set(item.start, item)
    })

    let id_col = selection.content_id_col || null
    const page_col = selection.content_page_col || null
    const part_col = selection.content_part_col || null
    const chunk_size = Math.max(200, Math.min(20000, Number(selection.chunk_size) || 2000))
    const split_numbered = !!selection.split_numbered

    const table = mdb.getTable(content_table)
    const row_count = table.rowCount

    if (toc_starts?.length && !selection.content_id_col_locked) {
        const columns = table_meta.get(content_table)?.column_names ?? []
        const toc_start_col = selection.toc_start_col || ''
        const sample = table.getData({rowOffset: 0, rowLimit: Math.min(500, row_count)})
        const is_numeric_like_col = (column: string) =>
            sample.some(row => to_int(row?.[column]) != null)
        const same_name = toc_start_col
            ? columns.find(
                  column =>
                      lower(column).trim() === lower(toc_start_col).trim() &&
                      is_numeric_like_col(column),
              )
            : null
        const excluded = (column: string | null) =>
            !column || column === text_col || column === page_col || column === part_col

        const starts_set = new Set(
            toc_starts.filter(
                value => typeof value === 'number' && Number.isFinite(value) && value > 0,
            ),
        )
        const score = (column: string) =>
            sample.reduce(
                (acc, row) => acc + (starts_set.has(to_int(row?.[column]) ?? -1) ? 1 : 0),
                0,
            )
        const by_name =
            columns.find(column => lower(column).trim() === 'id' && is_numeric_like_col(column)) ??
            columns.find(column => lower(column).trim() === 'na' && is_numeric_like_col(column)) ??
            null
        const numeric_cols = columns.filter(is_numeric_like_col)
        const candidates = [...new Set([same_name, by_name, ...numeric_cols])].filter(
            (column): column is string => typeof column === 'string' && !excluded(column),
        )
        const best = candidates
            .map(column => [column, score(column)] as const)
            .sort((first, second) => second[1] - first[1])[0]
        const current_score = id_col ? score(id_col) : -1
        if (best?.[1] > Math.max(0, current_score)) id_col = best[0]
        else if (!id_col && same_name && !excluded(same_name)) id_col = same_name
        else if (!id_col && by_name && !excluded(by_name)) id_col = by_name
    }

    const has_page_col = !!page_col
    const has_id_col = !!id_col

    const pages: BookPage[] = []
    const id_to_page_number = new Map<number, number>()
    const id_to_snippet = new Map<number, string>()
    const page_value_to_page_number = new Map<number, number>()

    const starts = toc_starts ? new Set(toc_starts) : null
    const is_numbered = (text: string) =>
        /^(?:[0-9\u0660-\u0669\u06F0-\u06F9]{1,4})\s*[-–—]\s+/.test(text)

    let offset = 0

    const load_more: page_reader['load_more'] = async ({
        max_pages = 80,
        until_id = null,
        until_page = null,
    }: {max_pages?: number; until_id?: number | null; until_page?: number | null} = {}) => {
        const start_pages = pages.length
        const max_total = start_pages + Math.max(1, Number(max_pages) || 1)

        const need_more = () => {
            if (until_id != null) return !id_to_page_number.has(until_id)
            if (until_page != null) return !page_value_to_page_number.has(until_page)
            return true
        }

        while (offset < row_count && pages.length < max_total && need_more()) {
            const batch_offset = offset
            const batch = table.getData({rowOffset: batch_offset, rowLimit: chunk_size})
            if (!batch.length) {
                offset = row_count
                break
            }
            let stop = false

            for (let index = 0; index < batch.length; index += 1) {
                offset = batch_offset + index + 1
                const row = batch[index]
                const raw = decode_value(row?.[text_col]).replaceAll('\0', '').trim()
                if (!raw) continue

                const id_value = id_col ? to_int(row?.[id_col]) : null
                const page_value = page_col ? to_int(row?.[page_col]) : null
                const part_raw = part_col ? row?.[part_col] : null
                const part_value = part_col ? to_int(part_raw) : null
                const part_text =
                    part_col && part_value == null
                        ? decode_value(part_raw).replaceAll('\0', '').trim()
                        : ''
                const part_display = part_value != null ? String(part_value) : part_text || ''

                const footer = [
                    part_display ? `الجزء: ${part_display}` : null,
                    page_value ? `الصفحة: ${page_value}` : null,
                ]
                    .filter(Boolean)
                    .join(' - ')

                let chunks: string[][] = []
                if (!split_numbered || looks_like_html(raw)) {
                    const paragraphs = to_html_paragraphs(raw)
                    if (!paragraphs.length) continue
                    chunks = [paragraphs]
                } else {
                    const parts = split_plain_text(raw)
                    let current: string[] = []
                    parts.forEach(part => {
                        const value = String(part).trim()
                        if (!value) return
                        const split_here =
                            current.length && (is_heading_text(value) || is_numbered(value))
                        if (split_here) {
                            chunks.push(current)
                            current = [value]
                        } else {
                            current.push(value)
                        }
                    })
                    if (current.length) chunks.push(current)
                    chunks = chunks.map(list =>
                        list.map((item, index) =>
                            index === 0 && is_heading_text(item)
                                ? `<h3>${escape_xml(item)}</h3>`
                                : `<p>${escape_xml(item)}</p>`,
                        ),
                    )
                    if (!chunks.length) continue
                }

                let anchor_chunk_index = 0
                if (starts && id_value != null && starts.has(id_value)) {
                    const heading_index = chunks.findIndex(chunk => {
                        const first = chunk?.[0]?.replace(/<[^>]+>/g, '').trim() ?? ''
                        return is_heading_text(first)
                    })
                    if (heading_index >= 0) anchor_chunk_index = heading_index
                }

                chunks.forEach((paragraphs, chunk_index) => {
                    const out: string[] = []
                    const paras = [...paragraphs]
                    if (
                        starts &&
                        id_value != null &&
                        starts.has(id_value) &&
                        chunk_index === anchor_chunk_index
                    ) {
                        const toc_entry = toc_by_start.get(id_value)
                        const first = paras[0] ?? ''
                        const first_text = normalize_match_text(plain_text_from_html(first))
                        const first_heading_text = first_heading_text_from_html(first)
                        const heading_text = normalize_match_text(
                            String(toc_entry?.text ?? '').trim(),
                        )
                        const heading_tag = heading_tag_for_level(toc_entry?.level ?? null)

                        if (heading_text && first_heading_text === heading_text) {
                            paras[0] = first
                                .replace(
                                    /^<h[1-6]\b[^>]*>/i,
                                    `<${heading_tag} id="toc_${id_value}">`,
                                )
                                .replace(/<\/h[1-6]>/i, `</${heading_tag}>`)
                        } else if (
                            heading_text &&
                            first_text === heading_text &&
                            /^<p\b/i.test(first)
                        ) {
                            paras[0] = `<${heading_tag} id="toc_${id_value}">${escape_xml(heading_text)}</${heading_tag}>`
                        } else if (
                            heading_text &&
                            first_text === heading_text &&
                            /^<h[1-6]\b/i.test(first)
                        ) {
                            paras[0] = first
                                .replace(
                                    /^<h[1-6]\b[^>]*>/i,
                                    `<${heading_tag} id="toc_${id_value}">`,
                                )
                                .replace(/<\/h[1-6]>/i, `</${heading_tag}>`)
                        } else if (heading_text) {
                            out.push(
                                `<${heading_tag} id="toc_${id_value}">${escape_xml(heading_text)}</${heading_tag}>`,
                            )
                        } else if (
                            first_text &&
                            /^<p\b/i.test(first) &&
                            is_heading_text(first_text)
                        ) {
                            paras[0] = `<h3 id="toc_${id_value}">${escape_xml(first_text)}</h3>`
                        } else if (/^<h[1-6]\b/i.test(first)) {
                            paras[0] = first
                                .replace(/^<h[1-6]\b[^>]*>/i, `<h3 id="toc_${id_value}">`)
                                .replace(/<\/h[1-6]>/i, '</h3>')
                        } else {
                            out.push(`<a id="toc_${id_value}"></a>`)
                        }
                    }
                    out.push(...paras)
                    const body = `<div>${out.join('')}</div>`
                    const text_html = footer
                        ? `${body}<div class="text-center">${footer}</div>`
                        : body
                    const page_number = pages.length + 1
                    pages.push({
                        page_number,
                        page: page_value ?? 0,
                        part: part_value,
                        text_html: sanitize_html_for_xhtml(text_html),
                    })

                    if (
                        id_value != null &&
                        (!starts || !starts.has(id_value) || chunk_index === anchor_chunk_index)
                    ) {
                        id_to_page_number.set(id_value, page_number)
                    }
                    if (
                        page_value != null &&
                        page_value > 0 &&
                        !page_value_to_page_number.has(page_value)
                    ) {
                        page_value_to_page_number.set(page_value, page_number)
                    }
                })

                if (id_value != null && !id_to_snippet.has(id_value)) {
                    const flat = chunks.flat()
                    const first =
                        flat[0]
                            ?.replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim() ?? ''
                    const second =
                        flat[1]
                            ?.replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim() ?? ''
                    id_to_snippet.set(id_value, `${first}\n${second}`.trim())
                }

                if (pages.length >= max_total) {
                    const reached_target =
                        (!until_id && !until_page) ||
                        (until_id != null && id_to_page_number.has(until_id)) ||
                        (until_page != null && page_value_to_page_number.has(until_page))
                    if (reached_target) {
                        stop = true
                        break
                    }
                }
            }

            if (stop) break
            await new Promise(resolve => setTimeout(resolve, 0))
        }

        return {
            done: offset >= row_count,
            loaded_pages: pages.length,
            added_pages: pages.length - start_pages,
        }
    }

    const progress = () => ({done: offset >= row_count, offset, row_count, pages: pages.length})

    return {
        pages,
        id_to_page_number,
        id_to_snippet,
        page_value_to_page_number,
        has_id_col,
        has_page_col,
        load_more,
        progress,
        volumes: {},
    }
}

export const parse_pages = async (
    mdb: mdb_reader,
    table_meta: table_meta_map,
    selection: book_selection,
    toc_items: toc_item_raw[] | null = null,
) => {
    const reader = create_pages_reader(mdb, table_meta, selection, toc_items)
    await reader.load_more({max_pages: Number.POSITIVE_INFINITY})
    return {
        pages: reader.pages,
        id_to_page_number: reader.id_to_page_number,
        id_to_snippet: reader.id_to_snippet,
    }
}

export const auto_toc_from_pages = (pages: BookPage[]): TocTree | null => {
    const items: TocItem[] = []
    const seen = new Set<string>()

    const first_paragraph = (html: string) => {
        const match = html.match(/<(?:h[1-6]|p)[^>]*>([\s\S]*?)<\/(?:h[1-6]|p)>/i)
        if (!match) return ''
        return match[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    }

    pages.forEach(page => {
        const text = first_paragraph(page.text_html)
        if (!text) return
        if (text.length > 100) return
        if (!/^(?:تفسير\s+سورة|سورة)\s+/.test(text)) return
        if (seen.has(text)) return
        seen.add(text)
        items.push({page: page.page_number, text})
    })

    return items.length ? items : null
}

export const map_toc = (
    raw_toc: toc_item_raw[] | null,
    id_to_page_number: Map<number, number>,
    id_to_snippet: Map<number, string>,
): TocTree | null => {
    if (!raw_toc?.length) return null

    const items: Array<toc_item_raw & {page: number; anchor: string}> = []
    const seen = new Set<string>()

    raw_toc.forEach(entry => {
        const page_number = id_to_page_number.get(entry.start) ?? (entry.start === 0 ? 1 : null)
        if (typeof page_number !== 'number' || !page_number) return

        let text = entry.text
        const snippet = id_to_snippet.get(entry.start) ?? ''
        if (/^سورة\s+/.test(text)) {
            const alt = `تفسير ${text}`
            if (snippet.includes(alt)) text = alt
        }

        const key = `${page_number}|${entry.level ?? ''}|${text}`
        if (seen.has(key)) return
        seen.add(key)

        items.push({
            ...entry,
            text,
            page: page_number,
            anchor: entry.start === 0 ? '' : `toc_${entry.start}`,
        })
    })

    if (!items.length) return null

    const has_levels = items.some(
        item => typeof item.level === 'number' && Number.isFinite(item.level),
    )
    if (!has_levels) {
        return items
            .sort((first, second) => first.page - second.page)
            .map(item => ({
                page: item.page,
                text: item.text,
                anchor: item.anchor,
            }))
    }

    return nest_by_level(items)
}

export const make_output_filename = (
    title: string,
    author: string,
    ext: string,
    include_author_filename: boolean,
) => {
    const base = include_author_filename && author ? `${title} - ${author}` : title
    return sanitize_filename(`${base || 'book'}.${ext}`)
}

export const build_book_payload = async (params: {
    mdb: mdb_reader
    table_meta: table_meta_map
    selection: book_selection
    title: string
    author: string
    card?: string
    include_author_filename: boolean
}) => {
    const {mdb, table_meta, selection, title, author, card, include_author_filename} = params
    const raw_toc = parse_raw_toc(mdb, selection)
    const {pages, id_to_page_number, id_to_snippet} = await parse_pages(
        mdb,
        table_meta,
        selection,
        raw_toc,
    )
    const toc = map_toc(raw_toc, id_to_page_number, id_to_snippet) ?? auto_toc_from_pages(pages)

    const card_html = card ? sanitize_html_for_xhtml(to_html_paragraphs(card).join('')) : ''
    const about = `<div><h1>${escape_xml(title)}</h1>${author ? `<p>المؤلف: ${escape_xml(author)}</p>` : ''}${card_html}</div>`

    const uuid = globalThis.crypto?.randomUUID?.() ?? `bok-${Math.random().toString(16).slice(2)}`

    const info: BookInfo = {
        id: 0,
        url: '',
        title,
        author,
        about,
        toc: toc ?? undefined,
        output_filename: make_output_filename(title, author, 'epub', include_author_filename),
        local_identifier: `urn:bok:${uuid}`,
        publisher: 'Local Conversion',
        page_footer_included: true,
    }

    return {
        info,
        pages,
        toc,
    } satisfies book_payload
}

import {decode_value, digits_to_ascii, to_int} from './encoding'
import type {analyze_result, book_selection, mdb_reader, table_meta_map} from './types'

export const lower = (value: unknown) => String(value ?? '').toLowerCase()

export const make_file_key = (file: File) => `${file.name}|${file.size}|${file.lastModified}`

export const read_table_preview = (mdb: mdb_reader, table_name: string, row_limit = 80) => {
    try {
        const table = mdb.getTable(table_name)
        return table.getData({rowLimit: row_limit})
    } catch {
        return []
    }
}

export const build_table_meta = (mdb: mdb_reader, table_names: string[]) => {
    const table_meta: table_meta_map = new Map()
    table_names.forEach(name => {
        let row_count = 0
        let column_names: string[] = []
        try {
            const table = mdb.getTable(name)
            row_count = table.rowCount
            column_names = table.getColumnNames()
        } catch {
            // keep defaults
        }
        table_meta.set(name, {row_count, column_names})
    })
    return table_meta
}

export const pick_best_text_column = (
    rows: Array<Record<string, unknown>>,
    column_names: string[],
) => {
    const scores = new Map<string, number>()
    column_names.forEach(column => scores.set(column, 0))
    const sample = rows.slice(0, 60)

    sample.forEach(row => {
        column_names.forEach(column => {
            const value = row?.[column]
            if (typeof value !== 'string') return
            const length = decode_value(value).trim().length
            if (length < 10) return
            scores.set(column, (scores.get(column) ?? 0) + Math.min(5000, length))
        })
    })

    return (
        [...scores.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ??
        column_names[0] ??
        ''
    )
}

export const pick_numeric_column = (
    rows: Array<Record<string, unknown>>,
    column_names: string[],
) => {
    const numeric_columns = column_names.filter(column =>
        rows.some(row => typeof row?.[column] === 'number'),
    )
    if (!numeric_columns.length) return ''

    const sample = rows.slice(0, 120)
    const score_column = (column: string) => {
        let previous: number | null = null
        let increasing = 0
        let unique = 0
        const seen = new Set<number>()
        sample.forEach(row => {
            const value = row?.[column]
            if (typeof value !== 'number') return
            if (!seen.has(value)) unique += 1
            seen.add(value)
            if (previous != null && value >= previous) increasing += 1
            previous = value
        })
        return increasing * 2 + unique
    }

    return (
        numeric_columns
            .map(column => [column, score_column(column)] as const)
            .sort((first, second) => second[1] - first[1])[0]?.[0] ?? numeric_columns[0]
    )
}

const is_numeric_like = (value: unknown) => to_int(value) != null

const pick_id_column = (
    mdb: mdb_reader,
    preview: Array<Record<string, unknown>>,
    column_names: string[],
    num_like_columns: string[],
    toc_table: string,
    toc_start_col: string,
) => {
    let toc_id_guess = ''

    if (toc_table && toc_start_col) {
        const toc_preview = read_table_preview(mdb, toc_table, 200)
        const starts_set = new Set(
            toc_preview
                .map(row => to_int(row?.[toc_start_col]))
                .filter((value): value is number => value != null && value > 0),
        )

        if (starts_set.size) {
            const score = (column: string) =>
                preview.reduce(
                    (acc, row) => acc + (starts_set.has(to_int(row?.[column]) ?? -1) ? 1 : 0),
                    0,
                )

            const same_name =
                num_like_columns.find(
                    column => lower(column).trim() === lower(toc_start_col).trim(),
                ) ?? ''
            const by_name =
                num_like_columns.find(column => lower(column).trim() === 'id') ??
                num_like_columns.find(column => lower(column).trim() === 'na') ??
                ''
            const candidates = [
                ...new Set([same_name, by_name, ...num_like_columns].filter(Boolean)),
            ]
            const best = candidates
                .map(column => [column, score(column)] as const)
                .sort((first, second) => second[1] - first[1])[0]
            toc_id_guess = best?.[1] > 0 ? best[0] : same_name || by_name || ''
        }
    }

    const id_col = column_names.find(column => lower(column).trim() === 'id') ?? ''
    const na_col = column_names.find(column => lower(column).trim() === 'na') ?? ''

    return (
        toc_id_guess ||
        (id_col && num_like_columns.includes(id_col) ? id_col : '') ||
        (na_col && num_like_columns.includes(na_col) ? na_col : '') ||
        pick_numeric_column(preview, column_names)
    )
}

export const guess_tables = (table_names: string[], table_meta: table_meta_map) => {
    const content_preferred = ['page', 'nass']
    const toc_preferred = ['tit', 'title']

    const looks_like_content_table = (name: string) => /^[bt]\d+$/i.test(name)
    const looks_like_toc_table = (name: string) => /^t\d+$/i.test(name)

    const score_content_table = (name: string) => {
        const meta = table_meta.get(name)
        const columns = meta?.column_names ?? []
        const columns_lc = new Set(columns.map(column => lower(column)))
        const has_nass = columns_lc.has('nass') || columns_lc.has('text')
        const has_page =
            columns_lc.has('page') || [...columns_lc].some(column => column.includes('page'))
        const has_id = columns_lc.has('id')

        let score = meta?.row_count ?? 0
        if (has_nass) score += 20000
        if (has_page) score += 5000
        if (has_id) score += 800
        if (looks_like_content_table(name)) score += 1500
        if (content_preferred.includes(lower(name))) score += 4000
        return score
    }

    const content_guess =
        table_names.find(name => content_preferred.includes(lower(name))) ??
        table_names
            .slice()
            .sort((first, second) => score_content_table(second) - score_content_table(first))[0] ??
        ''

    const find_exact = (name: string) => table_names.find(table_name => lower(table_name) === name)
    const toc_guess =
        table_names.find(name => toc_preferred.includes(lower(name))) ??
        find_exact('tit') ??
        find_exact('title') ??
        table_names
            .filter(looks_like_toc_table)
            .sort(
                (first, second) =>
                    (table_meta.get(second)?.row_count ?? 0) -
                    (table_meta.get(first)?.row_count ?? 0),
            )[0] ??
        ''

    return {content_guess, toc_guess}
}

const get_num_like_columns = (rows: Array<Record<string, unknown>>, column_names: string[]) =>
    column_names.filter(column =>
        rows.some(row => {
            const value = row?.[column]
            if (typeof value === 'number') return true
            if (typeof value === 'string')
                return /^\s*[0-9\u0660-\u0669\u06F0-\u06F9]+\s*$/.test(value)
            return false
        }),
    )

export const guess_content_columns = (
    mdb: mdb_reader,
    table_meta: table_meta_map,
    content_table: string,
    toc_table = '',
    toc_start_col = '',
): Pick<
    book_selection,
    'content_text_col' | 'content_id_col' | 'content_page_col' | 'content_part_col'
> => {
    const meta = table_meta.get(content_table) ?? {column_names: []}
    const preview = read_table_preview(mdb, content_table, 80)
    const column_names = meta.column_names ?? []

    const text_columns = column_names.filter(column =>
        preview.some(row => typeof row?.[column] === 'string'),
    )
    const num_like_columns = column_names.filter(column =>
        preview.some(row => is_numeric_like(row?.[column])),
    )

    const text_guess = pick_best_text_column(preview, text_columns)
    const id_guess = pick_id_column(
        mdb,
        preview,
        column_names,
        num_like_columns,
        toc_table,
        toc_start_col,
    )
    let page_guess =
        column_names.find(column => lower(column).trim() === 'page') ??
        column_names.find(column => lower(column).includes('page')) ??
        ''
    const part_guess =
        column_names.find(column => lower(column).trim() === 'part') ??
        column_names.find(column => lower(column).includes('part')) ??
        ''

    const hno_guess = column_names.find(column => lower(column).trim() === 'hno')
    if (hno_guess && num_like_columns.includes(hno_guess)) {
        const values = preview
            .map(row => row?.[hno_guess])
            .map(value =>
                typeof value === 'number'
                    ? value
                    : typeof value === 'string'
                      ? Number(digits_to_ascii(value))
                      : null,
            )
            .filter((value): value is number => typeof value === 'number')
        const max = values.length ? Math.max(...values) : 0

        const page_values = page_guess
            ? preview
                  .map(row => row?.[page_guess])
                  .map(value =>
                      typeof value === 'number'
                          ? value
                          : typeof value === 'string'
                            ? Number(digits_to_ascii(value))
                            : null,
                  )
                  .filter((value): value is number => typeof value === 'number')
            : []

        const page_max = page_values.length ? Math.max(...page_values) : 0
        if (max > Math.max(50, page_max + 50)) page_guess = hno_guess
    }

    return {
        content_text_col: text_guess,
        content_id_col: id_guess,
        content_page_col: page_guess && num_like_columns.includes(page_guess) ? page_guess : '',
        content_part_col: part_guess && num_like_columns.includes(part_guess) ? part_guess : '',
    }
}

export const guess_toc_columns = (
    mdb: mdb_reader,
    table_meta: table_meta_map,
    toc_table: string,
): Pick<book_selection, 'toc_text_col' | 'toc_start_col' | 'toc_level_col'> => {
    if (!toc_table) return {toc_text_col: '', toc_start_col: '', toc_level_col: ''}

    const meta = table_meta.get(toc_table) ?? {column_names: []}
    const preview = read_table_preview(mdb, toc_table, 120)
    const column_names = meta.column_names ?? []

    const text_columns = column_names.filter(column =>
        preview.some(row => typeof row?.[column] === 'string'),
    )
    const num_like_columns = get_num_like_columns(preview, column_names)

    const text_guess = pick_best_text_column(preview, text_columns)
    const start_guess =
        column_names.find(column => ['page', 'p', 'start', 'id'].includes(lower(column).trim())) ??
        column_names.find(column => lower(column).includes('page')) ??
        pick_numeric_column(preview, column_names)
    const level_guess =
        column_names.find(column => ['lvl', 'level', 'lev'].includes(lower(column).trim())) ?? ''

    return {
        toc_text_col: text_guess,
        toc_start_col: start_guess && num_like_columns.includes(start_guess) ? start_guess : '',
        toc_level_col: level_guess && num_like_columns.includes(level_guess) ? level_guess : '',
    }
}

const get_meta_guess = (table_names: string[]) => {
    const main_exact = table_names.find(name => name === 'main' || name === 'Main')
    if (main_exact) return main_exact
    return table_names.find(name => lower(name) === 'main') ?? ''
}

export const extract_title_author = (
    mdb: mdb_reader,
    table_names: string[],
    table_meta: table_meta_map,
    fallback_name = '',
    override_title = '',
    override_author = '',
) => {
    let title = override_title.trim()
    let author = override_author.trim()
    let card = ''

    const meta_table = get_meta_guess(table_names)
    if (meta_table) {
        const rows = read_table_preview(mdb, meta_table, 5)
        const row = rows[0] ?? {}
        const keys = Object.keys(row)

        const pick = (candidates: string[], fallback = '') => {
            const key =
                keys.find(name => candidates.includes(lower(name))) ??
                keys.find(name => candidates.some(candidate => lower(name).includes(candidate))) ??
                ''
            return key ? decode_value(row[key]).trim() : fallback
        }

        if (!title) title = pick(['title', 'book', 'bk', 'name'])
        if (!author) author = pick(['author', 'auth'])
        if (!card) card = pick(['betaka', 'card', 'about'])
    }

    if (!card) {
        const table_with_card = table_names.find(name =>
            (table_meta.get(name)?.column_names ?? []).some(column =>
                lower(column).includes('betaka'),
            ),
        )
        if (table_with_card) {
            const rows = read_table_preview(mdb, table_with_card, 3)
            const row = rows[0] ?? {}
            const keys = Object.keys(row)
            const key = keys.find(name => lower(name).includes('betaka')) ?? ''
            if (key) card = decode_value(row[key]).trim()
        }
    }

    const default_name = fallback_name || 'كتاب'
    if (!title) title = default_name.replace(/\.(bok|mdb|accdb)$/i, '')

    return {title: title.trim(), author: author.trim(), card: card.trim()}
}

export const create_default_selection = (
    mdb: mdb_reader,
    table_names: string[],
    table_meta: table_meta_map,
) => {
    const {content_guess, toc_guess} = guess_tables(table_names, table_meta)
    const toc_columns = guess_toc_columns(mdb, table_meta, toc_guess)
    const content_columns = guess_content_columns(
        mdb,
        table_meta,
        content_guess,
        toc_guess,
        toc_columns.toc_start_col,
    )

    return {
        content_table: content_guess,
        content_text_col: content_columns.content_text_col,
        content_id_col: content_columns.content_id_col,
        content_id_col_locked: false,
        content_page_col: content_columns.content_page_col,
        content_part_col: content_columns.content_part_col,
        toc_table: toc_guess,
        toc_text_col: toc_columns.toc_text_col,
        toc_start_col: toc_columns.toc_start_col,
        toc_level_col: toc_columns.toc_level_col,
        chunk_size: '2000',
        split_numbered: false,
    } satisfies book_selection
}

export const analyze_mdb = (
    mdb: mdb_reader,
    file_name: string,
    override_title = '',
    override_author = '',
): analyze_result => {
    const table_names = mdb.getTableNames({
        normalTables: true,
        systemTables: false,
        linkedTables: false,
    })
    const table_meta = build_table_meta(mdb, table_names)
    const selection = create_default_selection(mdb, table_names, table_meta)
    const {title, author, card} = extract_title_author(
        mdb,
        table_names,
        table_meta,
        file_name,
        override_title,
        override_author,
    )

    return {
        table_names,
        table_meta,
        title,
        author,
        card,
        selection,
    }
}

export const parse_raw_toc = (mdb: mdb_reader, selection: book_selection) => {
    const toc_table = selection.toc_table
    if (!toc_table || !selection.toc_text_col || !selection.toc_start_col) return null

    const table = mdb.getTable(toc_table)
    const rows = table.getData()
    const seen = new Set<string>()
    const items: Array<{start: number; text: string; level: number | null}> = []

    rows.forEach(row => {
        const text = decode_value(row?.[selection.toc_text_col]).trim()
        const start = to_int(row?.[selection.toc_start_col])
        const level = selection.toc_level_col ? to_int(row?.[selection.toc_level_col]) : null
        if (!text || start == null) return
        if (/^الجزء\s+/.test(text)) return
        const key = `${start}|${level ?? ''}|${text}`
        if (seen.has(key)) return
        seen.add(key)
        items.push({start, text, level})
    })

    const levels = items
        .map(item => item.level)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

    if (levels.length) {
        const min = Math.min(...levels)
        const shift = min <= 0 ? 1 - min : min > 1 ? 1 - min : 0
        if (shift) {
            items.forEach(item => {
                if (typeof item.level === 'number' && Number.isFinite(item.level))
                    item.level += shift
            })
        }
    }

    return items.length ? items : null
}

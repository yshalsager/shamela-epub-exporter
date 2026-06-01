import {describe, expect, it} from 'vitest'

import {parse_raw_toc} from '@/lib/bok/analyze'
import {auto_toc_from_pages, create_pages_reader, map_toc, parse_pages} from '@/lib/bok/pages'
import type {book_selection, mdb_reader, mdb_table} from '@/lib/bok/types'

type table_data = {
    rowCount: number
    columns: string[]
    rows: Array<Record<string, unknown>>
}

const create_mdb = (tables: Record<string, table_data>): mdb_reader => ({
    getTableNames: () => Object.keys(tables),
    getTable: (name: string) => {
        const table = tables[name]
        if (!table) throw new Error(`missing table ${name}`)
        return {
            rowCount: table.rowCount,
            getColumnNames: () => table.columns,
            getData: (options?: {rowOffset?: number; rowLimit?: number}) => {
                const offset = options?.rowOffset ?? 0
                const limit = options?.rowLimit ?? table.rows.length
                return table.rows.slice(offset, offset + limit)
            },
        } satisfies mdb_table
    },
})

const selection: book_selection = {
    content_table: 'b1',
    content_text_col: 'nass',
    content_id_col: 'id',
    content_page_col: 'page',
    content_part_col: '',
    toc_table: 'tit',
    toc_text_col: 'tit',
    toc_start_col: 'start',
    toc_level_col: '',
    chunk_size: '2000',
    split_numbered: false,
}

describe('bok pages', () => {
    it('splits numbered content into multiple generated pages', async () => {
        const mdb = create_mdb({
            b1: {
                rowCount: 1,
                columns: ['id', 'nass', 'page'],
                rows: [
                    {
                        id: 1,
                        page: 1,
                        nass: `1 - ${'أ'.repeat(130)} 2 - ${'ب'.repeat(130)}`,
                    },
                ],
            },
            tit: {
                rowCount: 0,
                columns: ['tit', 'start'],
                rows: [],
            },
        })

        const table_meta = new Map([
            ['b1', {row_count: 1, column_names: ['id', 'nass', 'page']}],
            ['tit', {row_count: 0, column_names: ['tit', 'start']}],
        ])

        const reader = create_pages_reader(
            mdb,
            table_meta,
            {
                ...selection,
                split_numbered: true,
            },
            null,
        )

        await reader.load_more({max_pages: Number.POSITIVE_INFINITY})
        expect(reader.pages.length).toBeGreaterThan(1)
    })

    it('maps raw toc using id-to-page mapping', async () => {
        const mdb = create_mdb({
            b1: {
                rowCount: 2,
                columns: ['id', 'nass', 'page'],
                rows: [
                    {id: 10, nass: 'تفسير سورة الفاتحة', page: 1},
                    {id: 20, nass: 'نص', page: 2},
                ],
            },
            tit: {
                rowCount: 1,
                columns: ['tit', 'start'],
                rows: [{tit: 'سورة الفاتحة', start: 10}],
            },
        })

        const table_meta = new Map([
            ['b1', {row_count: 2, column_names: ['id', 'nass', 'page']}],
            ['tit', {row_count: 1, column_names: ['tit', 'start']}],
        ])

        const raw_toc = parse_raw_toc(mdb, selection)
        const parsed = await parse_pages(mdb, table_meta, selection, raw_toc ?? null)
        const mapped = map_toc(raw_toc, parsed.id_to_page_number, parsed.id_to_snippet)

        expect(mapped).toBeTruthy()
        expect(Array.isArray(mapped)).toBe(true)
        expect((mapped?.[0] as {page: number}).page).toBe(1)
    })

    it('uses mapped page numbers inside leveled toc trees', async () => {
        const mdb = create_mdb({
            b1: {
                rowCount: 2,
                columns: ['id', 'nass', 'page'],
                rows: [
                    {id: 10, nass: 'عنوان رئيسي', page: 1},
                    {id: 20, nass: 'عنوان فرعي', page: 2},
                ],
            },
            tit: {
                rowCount: 2,
                columns: ['tit', 'start', 'lvl'],
                rows: [
                    {tit: 'رئيسي', start: 10, lvl: 1},
                    {tit: 'فرعي', start: 20, lvl: 2},
                ],
            },
        })

        const table_meta = new Map([
            ['b1', {row_count: 2, column_names: ['id', 'nass', 'page']}],
            ['tit', {row_count: 2, column_names: ['tit', 'start', 'lvl']}],
        ])

        const leveled_selection: book_selection = {
            ...selection,
            toc_level_col: 'lvl',
        }

        const raw_toc = parse_raw_toc(mdb, leveled_selection)
        const parsed = await parse_pages(mdb, table_meta, leveled_selection, raw_toc ?? null)
        const mapped = map_toc(raw_toc, parsed.id_to_page_number, parsed.id_to_snippet)

        expect(mapped).toBeTruthy()
        expect(Array.isArray(mapped)).toBe(true)
        const root = mapped?.[0]
        expect(Array.isArray(root)).toBe(true)
        const [parent, children] = root as [{page: number}, Array<[{page: number}, unknown[]]>]
        expect(parent.page).toBe(1)
        expect(children[0]?.[0]?.page).toBe(2)
    })

    it('keeps manual content id column when locked', async () => {
        const mdb = create_mdb({
            b1: {
                rowCount: 2,
                columns: ['id', 'na', 'nass', 'page'],
                rows: [
                    {id: 10, na: 1, nass: 'عنوان', page: 1},
                    {id: 20, na: 2, nass: 'نص', page: 2},
                ],
            },
            tit: {
                rowCount: 1,
                columns: ['tit', 'start'],
                rows: [{tit: 'عنوان', start: 10}],
            },
        })

        const table_meta = new Map([
            ['b1', {row_count: 2, column_names: ['id', 'na', 'nass', 'page']}],
            ['tit', {row_count: 1, column_names: ['tit', 'start']}],
        ])

        const reader = create_pages_reader(
            mdb,
            table_meta,
            {
                ...selection,
                content_id_col: 'na',
                content_id_col_locked: true,
            },
            [{start: 10, text: 'عنوان', level: 1}],
        )

        await reader.load_more({max_pages: Number.POSITIVE_INFINITY})

        expect(reader.id_to_page_number.has(10)).toBe(false)
        expect(reader.id_to_page_number.has(1)).toBe(true)
    })

    it('builds auto toc from heading pages', () => {
        const toc = auto_toc_from_pages([
            {page_number: 1, page: 1, text_html: '<div><p>سورة الإخلاص</p></div>'},
            {page_number: 2, page: 2, text_html: '<div><p>نص عادي</p></div>'},
        ])

        expect(toc).toBeTruthy()
        expect((toc?.[0] as {text: string}).text).toContain('سورة الإخلاص')
    })

    it('does not force id column fallback when toc scoring has no match', async () => {
        const mdb = create_mdb({
            b1: {
                rowCount: 2,
                columns: ['pid', 'nass', 'page'],
                rows: [
                    {pid: 1, nass: 'نص 1', page: 1},
                    {pid: 2, nass: 'نص 2', page: 2},
                ],
            },
            tit: {
                rowCount: 1,
                columns: ['tit', 'start'],
                rows: [{tit: 'عنوان', start: 999}],
            },
        })

        const table_meta = new Map([
            ['b1', {row_count: 2, column_names: ['pid', 'nass', 'page']}],
            ['tit', {row_count: 1, column_names: ['tit', 'start']}],
        ])

        const reader = create_pages_reader(
            mdb,
            table_meta,
            {
                ...selection,
                content_id_col: '',
                content_page_col: 'page',
            },
            [{start: 999, text: 'عنوان', level: 1}],
        )

        await reader.load_more({max_pages: Number.POSITIVE_INFINITY})

        expect(reader.has_id_col).toBe(false)
        expect(reader.id_to_page_number.size).toBe(0)
    })

    it('builds auto toc from heading tags without paragraph wrappers', () => {
        const toc = auto_toc_from_pages([
            {page_number: 1, page: 1, text_html: '<div><h3>سورة الناس</h3><p>نص</p></div>'},
            {page_number: 2, page: 2, text_html: '<div><p>متن</p></div>'},
        ])

        expect(toc).toBeTruthy()
        expect((toc?.[0] as {text: string}).text).toContain('سورة الناس')
    })

    it('injects toc heading anchor using toc entry text/level', async () => {
        const mdb = create_mdb({
            b1: {
                rowCount: 1,
                columns: ['id', 'nass', 'page'],
                rows: [{id: 10, nass: 'سورة الفاتحة\nنص', page: 1}],
            },
            tit: {
                rowCount: 1,
                columns: ['tit', 'start', 'lvl'],
                rows: [{tit: 'سورة الفاتحة', start: 10, lvl: 2}],
            },
        })

        const table_meta = new Map([
            ['b1', {row_count: 1, column_names: ['id', 'nass', 'page']}],
            ['tit', {row_count: 1, column_names: ['tit', 'start', 'lvl']}],
        ])

        const reader = create_pages_reader(mdb, table_meta, selection, [
            {start: 10, text: 'سورة الفاتحة', level: 2},
        ])
        await reader.load_more({max_pages: Number.POSITIVE_INFINITY})

        expect(reader.pages[0]?.text_html).toContain('<h3 id="toc_10">سورة الفاتحة</h3>')
    })

    it('keeps numeric part value on generated pages', async () => {
        const mdb = create_mdb({
            b1: {
                rowCount: 1,
                columns: ['id', 'nass', 'page', 'part'],
                rows: [{id: 1, nass: 'نص', page: 5, part: 2}],
            },
            tit: {
                rowCount: 0,
                columns: ['tit', 'start'],
                rows: [],
            },
        })

        const table_meta = new Map([
            ['b1', {row_count: 1, column_names: ['id', 'nass', 'page', 'part']}],
            ['tit', {row_count: 0, column_names: ['tit', 'start']}],
        ])

        const reader = create_pages_reader(
            mdb,
            table_meta,
            {
                ...selection,
                content_part_col: 'part',
            },
            null,
        )
        await reader.load_more({max_pages: Number.POSITIVE_INFINITY})

        expect(reader.pages[0]?.part).toBe(2)
    })
})

import {describe, expect, it} from 'vitest'

import {analyze_mdb, parse_raw_toc} from '@/lib/bok/analyze'
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

describe('bok analyze', () => {
    it('guesses content and toc tables and columns', () => {
        const mdb = create_mdb({
            Main: {
                rowCount: 1,
                columns: ['bk', 'auth'],
                rows: [{bk: 'كتاب تجريبي', auth: 'مؤلف'}],
            },
            b1: {
                rowCount: 2,
                columns: ['id', 'nass', 'page'],
                rows: [
                    {id: 10, nass: 'سورة الفاتحة', page: 1},
                    {id: 11, nass: 'نص طويل جدا جدا جدا جدا جدا جدا جدا', page: 2},
                ],
            },
            tit: {
                rowCount: 2,
                columns: ['tit', 'id', 'lvl'],
                rows: [
                    {tit: 'سورة الفاتحة', id: 10, lvl: 0},
                    {tit: 'باب', id: 11, lvl: 2},
                ],
            },
        })

        const analyzed = analyze_mdb(mdb, 'sample.bok')

        expect(analyzed.selection.content_table).toBe('b1')
        expect(analyzed.selection.toc_table).toBe('tit')
        expect(analyzed.selection.content_text_col).toBe('nass')
        expect(analyzed.selection.content_id_col).toBe('id')
        expect(analyzed.selection.toc_text_col).toBe('tit')
        expect(analyzed.selection.toc_start_col).toBe('id')
        expect(analyzed.title).toBe('كتاب تجريبي')
        expect(analyzed.author).toBe('مؤلف')
    })

    it('normalizes toc levels and removes duplicates', () => {
        const mdb = create_mdb({
            tit: {
                rowCount: 4,
                columns: ['tit', 'start', 'lvl'],
                rows: [
                    {tit: 'مقدمة', start: 1, lvl: 0},
                    {tit: 'مقدمة', start: 1, lvl: 0},
                    {tit: 'باب أول', start: 2, lvl: 2},
                    {tit: 'الجزء 1', start: 3, lvl: 1},
                ],
            },
        })

        const selection: book_selection = {
            content_table: '',
            content_text_col: '',
            content_id_col: '',
            content_page_col: '',
            content_part_col: '',
            toc_table: 'tit',
            toc_text_col: 'tit',
            toc_start_col: 'start',
            toc_level_col: 'lvl',
            chunk_size: '2000',
            split_numbered: false,
        }

        const raw = parse_raw_toc(mdb, selection)
        expect(raw).toHaveLength(2)
        expect(raw?.[0].level).toBe(1)
        expect(raw?.[1].level).toBe(3)
    })

    it('prefers content id column correlated with toc starts', () => {
        const mdb = create_mdb({
            b1: {
                rowCount: 3,
                columns: ['page', 'na', 'nass'],
                rows: [
                    {page: 1, na: 100, nass: 'أ'},
                    {page: 2, na: 200, nass: 'ب'},
                    {page: 3, na: 300, nass: 'ج'},
                ],
            },
            tit: {
                rowCount: 2,
                columns: ['tit', 'start'],
                rows: [
                    {tit: 'باب 1', start: 100},
                    {tit: 'باب 2', start: 300},
                ],
            },
        })

        const analyzed = analyze_mdb(mdb, 'sample.bok')
        expect(analyzed.selection.content_id_col).toBe('na')
        expect(analyzed.selection.toc_start_col).toBe('start')
    })
})

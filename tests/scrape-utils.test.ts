import {describe, expect, it} from 'vitest'

import {cut_toc, get_number_from_url, get_start_end_pages} from '../src/lib/shamela/scrape-utils'
import type {TocTree} from '../src/lib/shamela/types'

describe('scrape utils', () => {
    it('extracts numbers from urls', () => {
        expect(get_number_from_url('https://shamela.ws/book/123')).toBe(123)
        expect(get_number_from_url('https://shamela.ws/book/123/45#hash')).toBe(45)
    })

    it('computes volume ranges', () => {
        const ranges = get_start_end_pages({'1': 1, '2': 10, appendix: 20}, 30)
        expect(ranges['1']).toEqual([1, 9])
        expect(ranges['2']).toEqual([10, 19])
        expect(ranges.appendix).toEqual([20, 30])
    })

    it('cuts toc to range', () => {
        const toc: TocTree = [
            {page: 1, text: 'Intro'},
            [{page: 5, text: 'Part One'}, [{page: 6, text: 'Chapter'}]],
            {page: 20, text: 'Tail'},
        ]

        const trimmed = cut_toc(toc, [4, 10])
        expect(trimmed.length).toBe(1)
        expect(Array.isArray(trimmed[0])).toBe(true)
    })
})

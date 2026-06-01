import {describe, expect, it} from 'vitest'

import {
    decode_bytes,
    decode_cp1256,
    digits_to_ascii,
    fix_arabic_mojibake,
    to_int,
} from '@/lib/bok/encoding'

describe('bok encoding', () => {
    it('converts arabic digits to ascii', () => {
        expect(digits_to_ascii('١٢٣٤')).toBe('1234')
        expect(digits_to_ascii('۱۲۳۴')).toBe('1234')
    })

    it('parses numeric strings including arabic digits', () => {
        expect(to_int(' ١٢ ')).toBe(12)
        expect(to_int(' ۱۲ ')).toBe(12)
        expect(to_int(42)).toBe(42)
        expect(to_int('abc')).toBeNull()
    })

    it('decodes cp1256 bytes', () => {
        expect(decode_cp1256(Uint8Array.from([0xc7, 0xe1]))).toBe('ال')
    })

    it('repairs mojibake and utf16 bytes', () => {
        const bytes = Uint8Array.from([0xc7, 0xe1, 0xdf, 0xca, 0xc7, 0xc8])
        const mojibake = String.fromCharCode(...bytes)
        expect(fix_arabic_mojibake(mojibake)).toBe(decode_cp1256(bytes))

        const utf16 = Uint8Array.from(
            Array.from('ABCDEFGH').flatMap(char => [char.charCodeAt(0), 0]),
        )
        expect(decode_bytes(utf16)).toBe('ABCDEFGH')
    })

    it('repairs mixed mojibake segments without harming surrounding text', () => {
        const bad = `prefix ${String.fromCharCode(0xc7, 0xe1, 0xdf, 0xca, 0xc7, 0xc8)} suffix`
        const fixed = fix_arabic_mojibake(bad)

        expect(fixed).toContain('prefix')
        expect(fixed).toContain('suffix')
        expect(String(fixed)).toContain('الكتاب')
    })
})

const CP1256_TABLE = [
    0x20ac, 0x067e, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0679, 0x2039,
    0x0152, 0x0686, 0x0698, 0x0688, 0x06af, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
    0x06a9, 0x2122, 0x0691, 0x203a, 0x0153, 0x200c, 0x200d, 0x06ba, 0x00a0, 0x060c, 0x00a2, 0x00a3,
    0x00a4, 0x00a5, 0x00a6, 0x00a7, 0x00a8, 0x00a9, 0x06be, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x00af,
    0x00b0, 0x00b1, 0x00b2, 0x00b3, 0x00b4, 0x00b5, 0x00b6, 0x00b7, 0x00b8, 0x00b9, 0x061b, 0x00bb,
    0x00bc, 0x00bd, 0x00be, 0x061f, 0x06c1, 0x0621, 0x0622, 0x0623, 0x0624, 0x0625, 0x0626, 0x0627,
    0x0628, 0x0629, 0x062a, 0x062b, 0x062c, 0x062d, 0x062e, 0x062f, 0x0630, 0x0631, 0x0632, 0x0633,
    0x0634, 0x0635, 0x0636, 0x00d7, 0x0637, 0x0638, 0x0639, 0x063a, 0x0640, 0x0641, 0x0642, 0x0643,
    0x00e0, 0x0644, 0x00e2, 0x0645, 0x0646, 0x0647, 0x0648, 0x00e7, 0x00e8, 0x00e9, 0x00ea, 0x00eb,
    0x0649, 0x064a, 0x00ee, 0x00ef, 0x064b, 0x064c, 0x064d, 0x064e, 0x00f4, 0x064f, 0x0650, 0x00f7,
    0x0651, 0x00f9, 0x0652, 0x00fb, 0x00fc, 0x200e, 0x200f, 0x06d2,
]

export const digits_to_ascii = (value: string) =>
    String(value)
        .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06f0))

export const to_int = (value: unknown) => {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && /^\s*[0-9\u0660-\u0669\u06F0-\u06F9]+\s*$/.test(value)) {
        return Number(digits_to_ascii(value))
    }
    return null
}

export const decode_cp1256 = (bytes: Uint8Array) => {
    let out = ''
    for (let index = 0; index < bytes.length; index += 1) {
        const value = bytes[index]
        if (value < 0x80) out += String.fromCharCode(value)
        else out += String.fromCharCode(CP1256_TABLE[value - 0x80] ?? 0xfffd)
    }
    return out
}

export const decode_windows_1256 = (bytes: Uint8Array) => {
    try {
        return new TextDecoder('windows-1256').decode(bytes)
    } catch {
        return decode_cp1256(bytes)
    }
}

const decode_cp1256_string = (value: unknown) => {
    const bytes = new Uint8Array(Array.from(String(value), char => char.charCodeAt(0) & 0xff))
    return decode_windows_1256(bytes)
}

export const fix_arabic_mojibake = (value: unknown) => {
    if (typeof value !== 'string') return value
    if (!/[\u00C0-\u00FF]/.test(value)) return value

    const mixed = /[\u0600-\u06FF]/.test(value)
        ? value.replace(/[\u00C0-\u00FF]{2,}/g, part => {
              const decoded = decode_cp1256_string(part)
              return /[\u0600-\u06FF]/.test(decoded) ? decoded : part
          })
        : value
    if (mixed !== value) return mixed

    const high_chars = (value.match(/[\u00C0-\u00FF]/g) ?? []).length
    const min_high = /[A-Za-z]/.test(value) ? 4 : 3
    if (high_chars < Math.max(min_high, Math.floor(value.length * 0.2))) return value

    const decoded = decode_cp1256_string(value)
    if (/[\u0600-\u06FF]/.test(decoded)) return decoded
    return value
}

export const decode_bytes = (bytes: ArrayBuffer | Uint8Array) => {
    const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    let zero_count = 0
    for (let index = 1; index < uint8.length; index += 2) {
        if (uint8[index] === 0) zero_count += 1
    }
    const maybe_utf16 = uint8.length >= 16 && zero_count / Math.max(1, uint8.length / 2) > 0.25

    const try_decode = (encoding: string) => {
        try {
            return new TextDecoder(encoding).decode(uint8)
        } catch {
            return null
        }
    }

    return (
        (maybe_utf16 ? try_decode('utf-16le') : null) ??
        decode_windows_1256(uint8) ??
        try_decode('utf-8') ??
        ''
    )
}

export const decode_value = (value: unknown): string => {
    if (typeof value === 'string') return String(fix_arabic_mojibake(value) ?? '')
    if (value == null) return ''
    if (value instanceof ArrayBuffer || value instanceof Uint8Array) return decode_bytes(value)
    if (
        (globalThis as {Buffer?: {isBuffer?: (input: unknown) => boolean}}).Buffer?.isBuffer?.(
            value,
        )
    ) {
        return decode_bytes(value as Uint8Array)
    }
    return String(value)
}

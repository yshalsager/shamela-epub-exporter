import '@/locales/main.loader.svelte.js'

import {derived, get, writable} from 'svelte/store'
import {loadLocale} from 'wuchale/load-utils'

import {locales as supported_locales} from './data.js'

const STORAGE_KEY = 'shamela_ext.locale'
const DEFAULT_LOCALE = supported_locales[0] ?? 'ar'

export const locale = writable<string>(DEFAULT_LOCALE)
export const locales = supported_locales
export const available_locales = derived(locale, current => {
    const formatter = new Intl.DisplayNames([current], {type: 'language'})
    return supported_locales.map(loc => ({
        locale: loc,
        name: formatter.of(loc) ?? loc,
    }))
})

locale.subscribe(value => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = value
    document.documentElement.dir = value.startsWith('ar') ? 'rtl' : 'ltr'
})

function is_valid_locale(value: string | null | undefined): value is string {
    return typeof value === 'string' && supported_locales.includes(value)
}

export async function apply_locale(new_locale: string) {
    if (!is_valid_locale(new_locale)) return
    await loadLocale(new_locale)
    locale.set(new_locale)
    localStorage.setItem(STORAGE_KEY, new_locale)
}

export async function init_locale(preferred?: string | null) {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (is_valid_locale(stored)) {
        await apply_locale(stored)
        return get(locale)
    }

    if (is_valid_locale(preferred)) {
        await apply_locale(preferred)
        return get(locale)
    }

    await apply_locale(DEFAULT_LOCALE)
    return get(locale)
}

export function format_number(value: number, locale_override?: string) {
    const target = locale_override ?? get(locale)
    return new Intl.NumberFormat(target).format(value)
}

export function format_character_count(count: number, limit = 4096, locale_override?: string) {
    const target = locale_override ?? get(locale)
    const formatter = new Intl.NumberFormat(target)
    const characters = 'characters'
    return `${formatter.format(count)}/${formatter.format(limit)} ${characters}`
}

import type {Platform} from './types'

const is_tauri = (): boolean => {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const is_extension = (): boolean => {
    return typeof browser !== 'undefined' && !!browser?.runtime?.id
}

export const create_platform = async (): Promise<Platform> => {
    if (is_tauri()) {
        const {create_tauri_platform} = await import('./tauri')
        return create_tauri_platform()
    }

    if (is_extension()) {
        const {create_wxt_platform} = await import('./wxt')
        return create_wxt_platform()
    }

    throw new Error('Unknown platform')
}

let platform_instance: Platform | null = null

export const get_platform = async (): Promise<Platform> => {
    if (!platform_instance) {
        platform_instance = await create_platform()
    }
    return platform_instance
}

export {is_extension, is_tauri}
export type {Platform} from './types'

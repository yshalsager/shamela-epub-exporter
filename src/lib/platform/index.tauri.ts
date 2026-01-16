/**
 * Tauri-specific platform entry point.
 * This file is aliased to @/lib/platform during Tauri builds to avoid bundling WXT code.
 */
import {create_tauri_platform} from './tauri'
import type {Platform} from './types'

export const is_tauri = (): boolean => {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export const is_extension = (): boolean => false

export const create_platform = async (): Promise<Platform> => {
    if (is_tauri()) {
        return create_tauri_platform()
    }
    throw new Error('Unknown platform: expected Tauri environment')
}

let platform_instance: Platform | null = null

export const get_platform = async (): Promise<Platform> => {
    if (!platform_instance) {
        platform_instance = await create_platform()
    }
    return platform_instance
}

export type {Platform} from './types'

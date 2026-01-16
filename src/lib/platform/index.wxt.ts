/**
 * WXT-specific platform entry point.
 * This file is aliased to @/lib/platform during WXT builds to avoid bundling Tauri code.
 */
import type {Platform} from './types'
import {create_wxt_platform} from './wxt'

export const is_tauri = (): boolean => false

export const is_extension = (): boolean => {
    return typeof browser !== 'undefined' && !!browser?.runtime?.id
}

export const create_platform = async (): Promise<Platform> => {
    if (is_extension()) {
        return create_wxt_platform()
    }
    throw new Error('Unknown platform: expected WXT extension environment')
}

let platform_instance: Platform | null = null

export const get_platform = async (): Promise<Platform> => {
    if (!platform_instance) {
        platform_instance = await create_platform()
    }
    return platform_instance
}

export type {Platform} from './types'

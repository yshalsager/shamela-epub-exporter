import {storage} from 'wxt/utils/storage'

import type {PlatformStorage} from '../types'

export class WxtStorage implements PlatformStorage {
    async get_value<T>(key: string): Promise<T | null> {
        const item = storage.defineItem<T | null>(`local:${key}`, {fallback: null})
        return item.getValue()
    }

    async set_value<T>(key: string, value: T): Promise<void> {
        const item = storage.defineItem<T>(`local:${key}`)
        await item.setValue(value)
    }

    watch(key: string, callback: (value: unknown) => void): () => void {
        const item = storage.defineItem<unknown>(`local:${key}`)
        return item.watch(new_value => callback(new_value))
    }
}

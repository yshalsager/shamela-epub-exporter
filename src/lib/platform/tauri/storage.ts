import {load, type Store} from '@tauri-apps/plugin-store'

import type {PlatformStorage} from '../types'

export class TauriStorage implements PlatformStorage {
    private store: Store | null = null
    private init_promise: Promise<Store>

    constructor() {
        this.init_promise = load('store.json')
        this.init_promise.then(s => {
            this.store = s
        })
    }

    private async get_store(): Promise<Store> {
        if (this.store) return this.store
        return this.init_promise
    }

    async get_value<T>(key: string): Promise<T | null> {
        const store = await this.get_store()
        return ((await store.get<T>(key)) ?? null) as T | null
    }

    async set_value<T>(key: string, value: T): Promise<void> {
        const store = await this.get_store()
        await store.set(key, value as Parameters<Store['set']>[1])
        await store.save()
    }

    watch(key: string, callback: (value: unknown) => void): () => void {
        let unlisten: (() => void) | null = null

        void (async () => {
            const store = await this.get_store()
            unlisten = await store.onKeyChange(key, value => {
                callback(value ?? null)
            })
        })()

        return () => {
            if (unlisten) {
                unlisten()
            }
        }
    }
}

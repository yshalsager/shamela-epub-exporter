import {storage} from 'wxt/utils/storage'

import type {Job} from '@/lib/shamela/types'

export interface JobStore {
    get_value(): Promise<{jobs: Job[]} | null>
    set_value(value: {jobs: Job[]}): Promise<void>
    watch(callback: (value: {jobs: Job[]} | null) => void): () => void
    fallback: {jobs: Job[]}
}

const FALLBACK: {jobs: Job[]} = {jobs: []}

const wxt_job_store = storage.defineItem<{jobs: Job[]}>('local:jobs', {
    fallback: FALLBACK,
})

export const job_store: JobStore = {
    get_value: () => wxt_job_store.getValue(),
    set_value: (value: {jobs: Job[]}) => wxt_job_store.setValue(value),
    watch: (callback: (value: {jobs: Job[]} | null) => void) => wxt_job_store.watch(callback),
    fallback: FALLBACK,
}

export const create_wxt_job_store = (): JobStore => job_store

export const create_platform_job_store = async (): Promise<JobStore> => {
    const {get_platform, is_tauri} = await import('@/lib/platform')

    if (!is_tauri()) {
        return job_store
    }

    const platform = await get_platform()

    return {
        get_value: async () => {
            const value = await platform.storage.get_value<{jobs: Job[]}>('jobs')
            return value ?? FALLBACK
        },
        set_value: async (value: {jobs: Job[]}) => {
            await platform.storage.set_value('jobs', value)
        },
        watch: (callback: (value: {jobs: Job[]} | null) => void) => {
            return platform.storage.watch('jobs', value => callback(value as {jobs: Job[]} | null))
        },
        fallback: FALLBACK,
    }
}

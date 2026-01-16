import {get_platform} from '@/lib/platform'
import type {Job} from '@/lib/shamela/types'

import {FALLBACK, type JobStore} from './job-store.types'

export const create_platform_job_store = async (): Promise<JobStore> => {
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

export const job_store: JobStore = {
    get_value: async () => FALLBACK,
    set_value: async () => {},
    watch: () => () => {},
    fallback: FALLBACK,
}

export type {JobStore} from './job-store.types'

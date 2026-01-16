import {storage} from 'wxt/utils/storage'

import type {Job} from '@/lib/shamela/types'

import {FALLBACK, type JobStore} from './job-store.types'

const wxt_job_store = storage.defineItem<{jobs: Job[]}>('local:jobs', {
    fallback: FALLBACK,
})

export const job_store: JobStore = {
    get_value: () => wxt_job_store.getValue(),
    set_value: (value: {jobs: Job[]}) => wxt_job_store.setValue(value),
    watch: (callback: (value: {jobs: Job[]} | null) => void) => wxt_job_store.watch(callback),
    fallback: FALLBACK,
}

export const create_platform_job_store = async (): Promise<JobStore> => job_store

export type {JobStore} from './job-store.types'

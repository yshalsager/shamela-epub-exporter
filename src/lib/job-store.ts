import {storage} from 'wxt/utils/storage'

import type {Job} from '@/lib/shamela/types'

export const job_store = storage.defineItem<{jobs: Job[]}>('local:jobs', {
    fallback: {jobs: []},
})

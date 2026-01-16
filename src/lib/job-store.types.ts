import type {Job} from '@/lib/shamela/types'

export interface JobStore {
    get_value(): Promise<{jobs: Job[]} | null>
    set_value(value: {jobs: Job[]}): Promise<void>
    watch(callback: (value: {jobs: Job[]} | null) => void): () => void
    fallback: {jobs: Job[]}
}

export const FALLBACK: {jobs: Job[]} = {jobs: []}

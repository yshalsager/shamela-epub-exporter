import {create_platform_job_store, job_store, type JobStore} from '@/lib/job-store'
import type {Job} from '@/lib/shamela/types'

const FALLBACK = {jobs: [] as Job[]}

class JobState {
    state = $state(FALLBACK)
    private store: JobStore = job_store

    async init() {
        this.store = await create_platform_job_store()
        const initial = await this.store.get_value()
        this.update(initial)
        this.store.watch(this.update)
    }

    update = (new_state: {jobs: Job[]} | null) => {
        this.state = new_state ?? FALLBACK
    }
}

export const job_state = new JobState()

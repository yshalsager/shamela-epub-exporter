import { job_store } from './job-store'
import type { Job } from '@/lib/shamela/types'

class JobState {
  state = $state(job_store.fallback)

  constructor() {
    job_store.getValue().then(this.update)
    job_store.watch(this.update)
  }

  update = (new_state: { jobs: Job[] } | null) => {
    this.state = new_state ?? job_store.fallback
  }
}

export const job_state = new JobState()

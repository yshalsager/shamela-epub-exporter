import type {Platform} from '@/lib/platform'
import {scrape_book, type ScrapeCallbacks} from '@/lib/scraper'
import {build_epub} from '@/lib/shamela/epub'
import type {BookInfo, BookPage, Job, JobOptions, JobProgress} from '@/lib/shamela/types'

export interface JobManagerStore {
    get_value(): Promise<{jobs: Job[]} | null>
    set_value(value: {jobs: Job[]}): Promise<void>
    fallback: {jobs: Job[]}
}

export interface JobManagerCallbacks {
    on_toast?: (job_id: string, level: 'info' | 'success' | 'error', message: string) => void
}

interface JobRuntime {
    pages: BookPage[]
    info?: BookInfo
    options?: JobOptions
    controller: AbortController
}

const MAX_CONCURRENT_JOBS = 3

export class JobManager {
    private platform: Platform
    private store: JobManagerStore
    private callbacks: JobManagerCallbacks
    private job_runtime = new Map<string, JobRuntime>()
    private pending_queue: {job_id: string; book_id: number; options: JobOptions}[] = []
    private job_write = Promise.resolve()

    constructor(platform: Platform, store: JobManagerStore, callbacks: JobManagerCallbacks = {}) {
        this.platform = platform
        this.store = store
        this.callbacks = callbacks
    }

    private update_jobs = (handler: (jobs: Job[]) => Job[] | void | Promise<Job[] | void>) => {
        this.job_write = this.job_write.then(async () => {
            const jobs = (await this.store.get_value())?.jobs ?? []
            const next = await handler(jobs)
            await this.store.set_value({jobs: next ?? jobs})
        })
        return this.job_write
    }

    private run_job = async (job_id: string, book_id: number, options: JobOptions) => {
        const controller = new AbortController()
        this.job_runtime.set(job_id, {pages: [], options, controller})

        await this.update_jobs(jobs => {
            const index = jobs.findIndex(job => job.job_id === job_id)
            if (index === -1) return
            jobs[index] = {...jobs[index], status: 'running'}
        })

        const runtime = this.job_runtime.get(job_id)!

        const callbacks: ScrapeCallbacks = {
            on_meta: (info: BookInfo) => {
                runtime.info = info
                this.update_jobs(jobs => {
                    const index = jobs.findIndex(job => job.job_id === job_id)
                    if (index === -1) return
                    jobs[index] = {
                        ...jobs[index],
                        result: {
                            title: info.title,
                            author: info.author,
                            pages: 0,
                        },
                    }
                })
            },
            on_page: (page: BookPage) => {
                runtime.pages.push(page)
            },
            on_progress: (progress: JobProgress) => {
                this.update_jobs(jobs => {
                    const index = jobs.findIndex(job => job.job_id === job_id)
                    if (index === -1) return
                    jobs[index] = {
                        ...jobs[index],
                        status: 'running',
                        progress,
                    }
                })
            },
            on_done: () => {
                void this.finalize_job(job_id)
            },
            on_error: (error_message: string) => {
                void this.handle_job_error(job_id, error_message)
            },
        }

        await scrape_book(this.platform, book_id, options, callbacks, controller.signal)
    }

    private finalize_job = async (job_id: string) => {
        const runtime = this.job_runtime.get(job_id)
        if (!runtime) return

        const {pages, info, options = {}} = runtime

        await this.update_jobs(jobs => {
            const index = jobs.findIndex(job => job.job_id === job_id)
            if (index === -1) return
            jobs[index] = {
                ...jobs[index],
                status: 'done',
                progress: {
                    current: pages.length,
                    total: pages.length,
                },
                result: info
                    ? {
                          title: info.title,
                          author: info.author,
                          pages: pages.length,
                      }
                    : undefined,
            }
        })

        if (info) {
            const {blob, filename} = await build_epub(info, pages, options)
            await this.platform.downloader.download(blob, filename)
            this.callbacks.on_toast?.(job_id, 'success', 'أُعِدَّ ملف EPUB للتنزيل.')
            await this.platform.notify.show('اكتمل التنزيل', `نُزل الكتاب: ${info.title}`)
        }

        this.job_runtime.delete(job_id)
        void this.process_queue()
    }

    private handle_job_error = async (job_id: string, error_message: string) => {
        const runtime = this.job_runtime.get(job_id)

        await this.update_jobs(jobs => {
            const index = jobs.findIndex(job => job.job_id === job_id)
            if (index === -1) return
            jobs[index] = {
                ...jobs[index],
                status: error_message === 'canceled' ? 'canceled' : 'error',
                error: error_message,
            }
        })

        const level = error_message === 'canceled' ? 'info' : 'error'
        const message = error_message === 'canceled' ? 'أُلغي الاستخلاص.' : error_message
        this.callbacks.on_toast?.(job_id, level, message)

        if (error_message !== 'canceled') {
            await this.platform.notify.show(
                'خطأ في التنزيل',
                `فشل تنزيل الكتاب #${runtime?.info?.id || 'غير معروف'}: ${error_message}`,
            )
        }

        this.job_runtime.delete(job_id)
        void this.process_queue()
    }

    private process_queue = async () => {
        const running_count = this.job_runtime.size
        if (running_count >= MAX_CONCURRENT_JOBS) return

        const next_job = this.pending_queue.shift()
        if (!next_job) return

        await this.run_job(next_job.job_id, next_job.book_id, next_job.options)
        void this.process_queue()
    }

    start_job = async (book_id: number, options: JobOptions = {}) => {
        const job_id = crypto.randomUUID()
        const url = `https://shamela.ws/book/${book_id}`

        const job: Job = {
            job_id,
            book_id,
            url,
            started_at: Date.now(),
            status: 'queued',
            progress: {current: 0},
            options,
        }

        await this.update_jobs(jobs => {
            jobs.push(job)
        })

        this.pending_queue.push({job_id, book_id, options})
        void this.process_queue()
    }

    start_jobs = async (book_ids: number[], options: JobOptions = {}) => {
        for (const book_id of book_ids) {
            await this.start_job(book_id, options)
        }
    }

    cancel_job = async (job_id: string) => {
        const runtime = this.job_runtime.get(job_id)
        if (runtime) {
            runtime.controller.abort()
        }

        await this.update_jobs(jobs => {
            const index = jobs.findIndex(job => job.job_id === job_id)
            if (index === -1) return
            jobs[index] = {...jobs[index], status: 'canceled'}
        })

        this.callbacks.on_toast?.(job_id, 'info', 'أُلغيت المهمة.')
        this.job_runtime.delete(job_id)

        const queue_index = this.pending_queue.findIndex(item => item.job_id === job_id)
        if (queue_index !== -1) {
            this.pending_queue.splice(queue_index, 1)
        }
    }

    retry_job = async (job_id: string) => {
        let next_job: {job_id: string; book_id: number; options: JobOptions} | null = null

        await this.update_jobs(jobs => {
            const index = jobs.findIndex(job => job.job_id === job_id)
            if (index === -1) return
            const job = jobs[index]
            if (job.status !== 'error') return
            jobs[index] = {
                ...job,
                status: 'queued',
                progress: {current: 0},
                error: undefined,
                started_at: Date.now(),
            }
            next_job = {job_id, book_id: job.book_id, options: job.options ?? {}}
        })

        if (!next_job) return

        const queue_index = this.pending_queue.findIndex(item => item.job_id === job_id)
        if (queue_index !== -1) {
            this.pending_queue.splice(queue_index, 1)
        }

        this.pending_queue.push(next_job)
        void this.process_queue()
    }

    clear_jobs = async () => {
        await this.update_jobs(() => this.store.fallback.jobs)

        this.pending_queue.length = 0

        for (const runtime of this.job_runtime.values()) {
            runtime.controller.abort()
        }

        this.job_runtime.clear()
    }
}

let job_manager_instance: JobManager | null = null

export const get_job_manager = async (
    platform: Platform,
    store: JobManagerStore,
    callbacks: JobManagerCallbacks = {},
): Promise<JobManager> => {
    if (!job_manager_instance) {
        job_manager_instance = new JobManager(platform, store, callbacks)
    }
    return job_manager_instance
}

export const create_job_manager = (
    platform: Platform,
    store: JobManagerStore,
    callbacks: JobManagerCallbacks = {},
): JobManager => {
    return new JobManager(platform, store, callbacks)
}

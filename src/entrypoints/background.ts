import {job_store} from '@/lib/job-store'
import type {BookInfo, BookPage, Job, JobOptions, RuntimeMessage} from '@/lib/shamela/types'

const job_runtime = new Map<
    string,
    {
        pages: BookPage[]
        info?: BookInfo
        options?: JobOptions
        tab_id?: number
    }
>()

const read_jobs = async () => {
    const data = await job_store.getValue()
    return data?.jobs ?? []
}

const write_jobs = async (jobs: Job[]) => {
    await job_store.setValue({jobs})
}

let job_write = Promise.resolve()

const queue_jobs = (handler: (jobs: Job[]) => Job[] | void | Promise<Job[] | void>) => {
    job_write = job_write.then(async () => {
        const jobs = await read_jobs()
        const next = await handler(jobs)
        await write_jobs(next ?? jobs)
    })
    return job_write
}

const add_job = (job: Job) =>
    queue_jobs(jobs => {
        jobs.push(job)
    })

const update_job = (job_id: string, patch: Partial<Job>) =>
    queue_jobs(jobs => {
        const index = jobs.findIndex(job => job.job_id === job_id)
        if (index === -1) return
        jobs[index] = {...jobs[index], ...patch}
    })

const send_to_tab = async (tab_id: number, message: RuntimeMessage) => {
    try {
        await browser.tabs.sendMessage(tab_id, message)
    } catch (error) {
        console.warn('Failed to send to tab', error)
    }
}

const start_job = async (book_id: number, options: JobOptions = {}) => {
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

    await add_job(job)

    const tab = await browser.tabs.create({url, active: true})
    const tab_id = tab.id
    if (tab_id == null) return

    job_runtime.set(job_id, {pages: [], options, tab_id})

    const notify = async () => {
        await update_job(job_id, {status: 'running'})
        await send_to_tab(tab_id, {
            type: 'scrape/start',
            job_id,
            payload: {book_id, options},
        })
    }

    if (tab.status === 'complete') {
        await notify()
        return
    }

    const on_updated = async (updated_tab_id: number, change_info: browser.tabs.TabChangeInfo) => {
        if (updated_tab_id !== tab_id) return
        if (change_info.status !== 'complete') return
        browser.tabs.onUpdated.removeListener(on_updated)
        await notify()
    }

    browser.tabs.onUpdated.addListener(on_updated)
}

const cancel_job = async (job_id: string) => {
    const runtime = job_runtime.get(job_id)
    if (runtime?.tab_id != null) {
        await send_to_tab(runtime.tab_id, {type: 'scrape/cancel', job_id})
    }
    await update_job(job_id, {status: 'canceled'})
    browser.runtime.sendMessage({
        type: 'job/toast',
        job_id,
        payload: {level: 'info', message: 'أُلغيت المهمة.'},
    })
    job_runtime.delete(job_id)
}

const clear_jobs = async () => {
    await queue_jobs(() => job_store.fallback.jobs)
    job_runtime.clear()
}

export default defineBackground(() => {
    browser.runtime.onMessage.addListener((message: RuntimeMessage) => {
        if (!message || typeof message.type !== 'string') return

        if (message.type === 'job/start') {
            const {book_id, options} = message.payload || {}
            if (!book_id) return
            start_job(Number(book_id), options)
            return
        }

        if (message.type === 'job/cancel' && message.job_id) {
            cancel_job(message.job_id)
            return
        }

        if (message.type === 'job/clear') {
            clear_jobs()
            return
        }

        if (!message.job_id) return

        const runtime = job_runtime.get(message.job_id)

        if (message.type === 'scrape/meta') {
            const info = message.payload as BookInfo
            if (runtime) runtime.info = info
            update_job(message.job_id, {
                result: {
                    title: info.title,
                    author: info.author,
                    pages: 0,
                },
            })
            return
        }

        if (message.type === 'scrape/page') {
            const page = message.payload as BookPage
            if (runtime) runtime.pages.push(page)
            return
        }

        if (message.type === 'scrape/progress') {
            update_job(message.job_id, {
                status: 'running',
                progress: message.payload,
            })
            return
        }

        if (message.type === 'scrape/error') {
            const error_message = message.payload?.message ?? 'خطأ في الاستخلاص'
            update_job(message.job_id, {
                status: error_message === 'canceled' ? 'canceled' : 'error',
                error: error_message,
            })
            browser.runtime.sendMessage({
                type: 'job/toast',
                job_id: message.job_id,
                payload: {
                    level: error_message === 'canceled' ? 'info' : 'error',
                    message: error_message === 'canceled' ? 'أُلغي الاستخلاص.' : error_message,
                },
            })
            return
        }

        if (message.type === 'scrape/done') {
            const pages = runtime?.pages ?? []
            const info = runtime?.info
            update_job(message.job_id, {
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
            })
            if (info) {
                browser.runtime.sendMessage({
                    type: 'job/done',
                    job_id: message.job_id,
                    payload: {
                        info,
                        pages,
                        options: runtime?.options ?? {},
                    },
                })
            }
            job_runtime.delete(message.job_id)
        }
    })
})

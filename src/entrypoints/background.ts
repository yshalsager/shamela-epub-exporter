import {job_store} from '@/lib/job-store'
import {build_epub} from '@/lib/shamela/epub'
import type {
    BookInfo,
    BookPage,
    Job,
    JobOptions,
    JobProgress,
    JobStartPayload,
    RuntimeMessage,
} from '@/lib/shamela/types'

const job_runtime = new Map<
    string,
    {
        pages: BookPage[]
        info?: BookInfo
        options?: JobOptions
        tab_id?: number
    }
>()

let job_write = Promise.resolve()

const update_badge = async (jobs: Job[]) => {
    const active_count = jobs.filter(
        job => job.status === 'running' || job.status === 'queued',
    ).length
    const error_count = jobs.filter(job => job.status === 'error').length

    if (active_count > 0) {
        await browser.action.setBadgeText({text: String(active_count)})
        await browser.action.setBadgeBackgroundColor({color: '#2563eb'})
        return
    }

    if (error_count > 0) {
        await browser.action.setBadgeText({text: '!'})
        await browser.action.setBadgeBackgroundColor({color: '#ef4444'})
        return
    }

    await browser.action.setBadgeText({text: ''})
}

const update_jobs = (handler: (jobs: Job[]) => Job[] | void | Promise<Job[] | void>) => {
    job_write = job_write.then(async () => {
        const jobs = (await job_store.get_value())?.jobs ?? []
        const next = await handler(jobs)
        const updated_jobs = next ?? jobs
        await job_store.set_value({jobs: updated_jobs})
        await update_badge(updated_jobs)
    })
    return job_write
}

const send_to_tab = async (tab_id: number, message: RuntimeMessage) => {
    try {
        await browser.tabs.sendMessage(tab_id, message)
    } catch (error) {
        console.warn('Failed to send to tab', error)
    }
}

const blob_to_data_url = async (blob: Blob) => {
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return `data:application/epub+zip;base64,${btoa(binary)}`
}

const download_urls = new Map<number, string>()

const download_blob = async (blob: Blob, filename: string) => {
    if (URL?.createObjectURL) {
        const url = URL.createObjectURL(blob)
        const download_id = await browser.downloads.download({url, filename})
        if (download_id) download_urls.set(download_id, url)
        return
    }
    const url = await blob_to_data_url(blob)
    await browser.downloads.download({url, filename})
}

const wait_for_tab_ready = (tab_id: number) =>
    new Promise<void>(resolve => {
        const timeout = setTimeout(() => {
            browser.tabs.onUpdated.removeListener(on_updated)
            resolve()
        }, 30000)

        const on_updated = (updated_tab_id: number, change_info: {status?: string}) => {
            if (updated_tab_id !== tab_id) return
            if (change_info.status !== 'complete') return
            clearTimeout(timeout)
            browser.tabs.onUpdated.removeListener(on_updated)
            resolve()
        }

        browser.tabs.onUpdated.addListener(on_updated)
    })

const MAX_CONCURRENT_JOBS = 3
const pending_queue: {job_id: string; book_id: number; options: JobOptions; tab_id?: number}[] = []

const run_job = async (
    job_id: string,
    book_id: number,
    options: JobOptions,
    existing_tab_id?: number,
) => {
    const url = `https://shamela.ws/book/${book_id}`
    let tab_id: number | undefined

    if (existing_tab_id != null) {
        await browser.tabs.update(existing_tab_id, {url, active: true})
        tab_id = existing_tab_id
        await wait_for_tab_ready(tab_id)
    } else {
        const tab = await browser.tabs.create({url, active: true})
        tab_id = tab.id
        if (tab_id == null) return
        if (tab.status !== 'complete') await wait_for_tab_ready(tab_id)
    }

    job_runtime.set(job_id, {pages: [], options, tab_id})

    await update_jobs(jobs => {
        const index = jobs.findIndex(job => job.job_id === job_id)
        if (index === -1) return
        jobs[index] = {...jobs[index], status: 'running'}
    })

    await send_to_tab(tab_id, {
        type: 'scrape/start',
        job_id,
        payload: {book_id, options},
    })
}

const process_queue = async () => {
    const running_count = Array.from(job_runtime.values()).filter(r => r.tab_id != null).length
    if (running_count >= MAX_CONCURRENT_JOBS) return

    const next_job = pending_queue.shift()
    if (!next_job) return

    await run_job(next_job.job_id, next_job.book_id, next_job.options, next_job.tab_id)
    void process_queue()
}

const start_job = async (book_id: number, options: JobOptions = {}, existing_tab_id?: number) => {
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

    await update_jobs(jobs => {
        jobs.push(job)
    })

    pending_queue.push({job_id, book_id, options, tab_id: existing_tab_id})
    void process_queue()
}

const cancel_job = async (job_id: string) => {
    const runtime = job_runtime.get(job_id)
    if (runtime?.tab_id != null) {
        await send_to_tab(runtime.tab_id, {type: 'scrape/cancel', job_id})
    }
    await update_jobs(jobs => {
        const index = jobs.findIndex(job => job.job_id === job_id)
        if (index === -1) return
        jobs[index] = {...jobs[index], status: 'canceled'}
    })
    browser.runtime.sendMessage({
        type: 'job/toast',
        job_id,
        payload: {level: 'info', message: 'أُلغيت المهمة.'},
    })
    job_runtime.delete(job_id)
}

const retry_job = async (job_id: string) => {
    let next_job: {job_id: string; book_id: number; options: JobOptions; tab_id?: number} | null =
        null

    await update_jobs(jobs => {
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

    const queue_index = pending_queue.findIndex(item => item.job_id === job_id)
    if (queue_index !== -1) {
        pending_queue.splice(queue_index, 1)
    }

    pending_queue.push(next_job)
    void process_queue()
}

const clear_jobs = async () => {
    await update_jobs(() => job_store.fallback.jobs)

    pending_queue.length = 0

    for (const runtime of job_runtime.values()) {
        if (runtime.tab_id != null) {
            try {
                browser.tabs.remove(runtime.tab_id).catch(() => {})
            } catch {
                // Ignore
            }
        }
    }

    job_runtime.clear()
}

export default defineBackground(() => {
    void job_store.get_value().then(value => update_badge(value?.jobs ?? []))

    browser.downloads.onChanged.addListener(delta => {
        const state = delta.state?.current
        if (!state || (state !== 'complete' && state !== 'interrupted')) return
        const url = download_urls.get(delta.id)
        if (!url) return
        URL.revokeObjectURL(url)
        download_urls.delete(delta.id)
    })

    browser.tabs.onRemoved.addListener(tab_id => {
        for (const [job_id, runtime] of job_runtime.entries()) {
            if (runtime.tab_id !== tab_id) continue
            void cancel_job(job_id)
            return
        }
    })

    browser.runtime.onMessage.addListener(async (message: RuntimeMessage) => {
        if (!message || typeof message.type !== 'string') return

        if (message.type === 'job/start') {
            const payload = (message.payload || {}) as JobStartPayload
            const {book_id, book_ids, options, tab_id} = payload

            if (book_ids?.length) {
                const use_tab_id = book_ids.length === 1 ? tab_id : undefined
                for (const id of book_ids) {
                    await start_job(Number(id), options, use_tab_id)
                }
                return
            }

            if (book_id) {
                await start_job(Number(book_id), options, tab_id)
            }
            return
        }

        if (message.type === 'job/cancel' && message.job_id) {
            cancel_job(message.job_id)
            return
        }

        if (message.type === 'job/retry' && message.job_id) {
            retry_job(message.job_id)
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
            update_jobs(jobs => {
                const index = jobs.findIndex(job => job.job_id === message.job_id)
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
            return
        }

        if (message.type === 'scrape/page') {
            const page = message.payload as BookPage
            if (runtime) runtime.pages.push(page)
            return
        }

        if (message.type === 'scrape/progress') {
            const progress = message.payload as JobProgress
            update_jobs(jobs => {
                const index = jobs.findIndex(job => job.job_id === message.job_id)
                if (index === -1) return
                jobs[index] = {
                    ...jobs[index],
                    status: 'running',
                    progress,
                }
            })
            return
        }

        if (message.type === 'scrape/error') {
            const payload = message.payload as {message?: string} | undefined
            const error_message = payload?.message ?? 'خطأ في الاستخلاص'
            update_jobs(jobs => {
                const index = jobs.findIndex(job => job.job_id === message.job_id)
                if (index === -1) return
                jobs[index] = {
                    ...jobs[index],
                    status: error_message === 'canceled' ? 'canceled' : 'error',
                    error: error_message,
                }
            })
            browser.runtime.sendMessage({
                type: 'job/toast',
                job_id: message.job_id,
                payload: {
                    level: error_message === 'canceled' ? 'info' : 'error',
                    message: error_message === 'canceled' ? 'أُلغي الاستخلاص.' : error_message,
                },
            })

            if (error_message !== 'canceled') {
                browser.notifications.create({
                    type: 'basic',
                    iconUrl: '/icon/128.png',
                    title: 'خطأ في التنزيل',
                    message: `فشل تنزيل الكتاب #${runtime?.info?.id || 'غير معروف'}: ${error_message}`,
                })
            }

            // Close tab for failed job
            if (runtime?.tab_id) {
                try {
                    browser.tabs.remove(runtime.tab_id).catch(() => {})
                } catch {
                    // Ignore
                }
            }
            job_runtime.delete(message.job_id)
            void process_queue()

            return
        }

        if (message.type === 'scrape/done') {
            const pages = runtime?.pages ?? []
            const info = runtime?.info
            const options = runtime?.options ?? {}
            update_jobs(jobs => {
                const index = jobs.findIndex(job => job.job_id === message.job_id)
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
                await download_blob(blob, filename)
                browser.runtime.sendMessage({
                    type: 'job/toast',
                    job_id: message.job_id,
                    payload: {level: 'success', message: 'أُعِدَّ ملف EPUB للتنزيل.'},
                })
                browser.notifications.create({
                    type: 'basic',
                    iconUrl: '/icon/128.png',
                    title: 'اكتمل التنزيل',
                    message: `نُزل الكتاب: ${info.title}`,
                })
            }

            // Close tab for completed job
            if (runtime?.tab_id) {
                try {
                    browser.tabs.remove(runtime.tab_id).catch(() => {})
                } catch {
                    // Ignore
                }
            }
            job_runtime.delete(message.job_id)
            void process_queue()
        }
    })
})

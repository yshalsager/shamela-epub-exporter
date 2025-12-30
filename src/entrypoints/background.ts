import {job_store} from '@/lib/job-store'
import {build_epub} from '@/lib/shamela/epub'
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

let job_write = Promise.resolve()

const update_jobs = (handler: (jobs: Job[]) => Job[] | void | Promise<Job[] | void>) => {
    job_write = job_write.then(async () => {
        const jobs = (await job_store.getValue())?.jobs ?? []
        const next = await handler(jobs)
        await job_store.setValue({jobs: next ?? jobs})
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
        const on_updated = (updated_tab_id: number, change_info: browser.tabs.TabChangeInfo) => {
            if (updated_tab_id !== tab_id) return
            if (change_info.status !== 'complete') return
            browser.tabs.onUpdated.removeListener(on_updated)
            resolve()
        }

        browser.tabs.onUpdated.addListener(on_updated)
    })

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

    await update_jobs(jobs => {
        jobs.push(job)
    })

    const tab = await browser.tabs.create({url, active: true})
    const tab_id = tab.id
    if (tab_id == null) return

    job_runtime.set(job_id, {pages: [], options, tab_id})

    if (tab.status !== 'complete') await wait_for_tab_ready(tab_id)
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

const clear_jobs = async () => {
    await update_jobs(() => job_store.fallback.jobs)
    job_runtime.clear()
}

export default defineBackground(() => {
    browser.downloads.onChanged.addListener(delta => {
        const state = delta.state?.current
        if (!state || (state !== 'complete' && state !== 'interrupted')) return
        const url = download_urls.get(delta.id)
        if (!url) return
        URL.revokeObjectURL(url)
        download_urls.delete(delta.id)
    })

    browser.runtime.onMessage.addListener(async (message: RuntimeMessage) => {
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
            update_jobs(jobs => {
                const index = jobs.findIndex(job => job.job_id === message.job_id)
                if (index === -1) return
                jobs[index] = {
                    ...jobs[index],
                    status: 'running',
                    progress: message.payload,
                }
            })
            return
        }

        if (message.type === 'scrape/error') {
            const error_message = message.payload?.message ?? 'خطأ في الاستخلاص'
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
            }
            job_runtime.delete(message.job_id)
        }
    })
})

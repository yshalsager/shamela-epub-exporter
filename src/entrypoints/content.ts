import type {Platform} from '@/lib/platform/types'
import {scrape_book, type ScrapeCallbacks} from '@/lib/scraper'
import type {JobOptions, RuntimeMessage} from '@/lib/shamela/types'

const create_content_script_platform = (): Platform => ({
    storage: {
        get_value: async () => null,
        set_value: async () => {},
        watch: () => () => {},
    },
    http: {
        fetch: (url: string, options?: RequestInit) =>
            globalThis.fetch(url, {...options, credentials: 'include'}),
    },
    downloader: {
        download: async () => {},
    },
    notify: {
        show: async () => {},
    },
    is_tauri: false,
    is_extension: true,
})

export default defineContentScript({
    matches: ['https://shamela.ws/book/*'],
    main() {
        const controllers = new Map<string, AbortController>()
        const platform = create_content_script_platform()

        browser.runtime.onMessage.addListener((message: RuntimeMessage) => {
            if (!message || typeof message.type !== 'string') return

            if (message.type === 'scrape/start') {
                const payload = message.payload as
                    | {book_id?: number; options?: JobOptions}
                    | undefined
                const book_id = payload?.book_id
                const options = payload?.options ?? {}

                if (!book_id || !message.job_id) return

                const controller = new AbortController()
                controllers.set(message.job_id, controller)
                const job_id = message.job_id

                const callbacks: ScrapeCallbacks = {
                    on_meta: info => {
                        browser.runtime.sendMessage({
                            type: 'scrape/meta',
                            job_id,
                            payload: info,
                        })
                    },
                    on_page: page => {
                        browser.runtime.sendMessage({
                            type: 'scrape/page',
                            job_id,
                            payload: page,
                        })
                    },
                    on_progress: progress => {
                        browser.runtime.sendMessage({
                            type: 'scrape/progress',
                            job_id,
                            payload: progress,
                        })
                    },
                    on_done: () => {
                        browser.runtime.sendMessage({type: 'scrape/done', job_id})
                        controllers.delete(job_id)
                    },
                    on_error: error => {
                        browser.runtime.sendMessage({
                            type: 'scrape/error',
                            job_id,
                            payload: {message: error},
                        })
                        controllers.delete(job_id)
                    },
                }

                scrape_book(
                    platform,
                    Number(book_id),
                    options,
                    callbacks,
                    controller.signal,
                    document.cloneNode(true) as Document,
                )
            }

            if (message.type === 'scrape/cancel' && message.job_id) {
                controllers.get(message.job_id)?.abort()
                controllers.delete(message.job_id)
                browser.runtime.sendMessage({
                    type: 'scrape/error',
                    job_id: message.job_id,
                    payload: {message: 'canceled'},
                })
            }
        })
    },
})

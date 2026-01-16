import type {PlatformHttp} from '../types'
import {webview_fetch} from './cf-bypass'

export class TauriHttp implements PlatformHttp {
    async fetch(url: string, options?: RequestInit): Promise<Response> {
        const signal = options?.signal
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError')
        }
        const method = options?.method ?? 'GET'
        const headers: Record<string, string> = {}

        if (options?.headers) {
            if (options.headers instanceof Headers) {
                options.headers.forEach((v, k) => {
                    headers[k] = v
                })
            } else if (Array.isArray(options.headers)) {
                for (const [k, v] of options.headers) {
                    headers[k] = v
                }
            } else {
                Object.assign(headers, options.headers)
            }
        }

        let body: string | undefined
        if (options?.body) {
            body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
        }

        let abort_handler: (() => void) | null = null
        const abort_promise = signal
            ? new Promise<never>((_, reject) => {
                  abort_handler = () => reject(new DOMException('Aborted', 'AbortError'))
                  signal.addEventListener('abort', abort_handler, {once: true})
              })
            : null

        try {
            const result = await (abort_promise
                ? Promise.race([webview_fetch(url, {method, headers, body}), abort_promise])
                : webview_fetch(url, {method, headers, body}))

            const response_headers = new Headers(result.headers)
            return new Response(result.body, {
                status: result.status,
                headers: response_headers,
            })
        } finally {
            if (signal && abort_handler) {
                signal.removeEventListener('abort', abort_handler)
            }
        }
    }
}

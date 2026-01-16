import {invoke} from '@tauri-apps/api/core'
import {WebviewWindow} from '@tauri-apps/api/webviewWindow'

const CHECK_INTERVAL = 150
const MAX_WAIT_TIME = 120000
const PAGE_LOAD_TIMEOUT = 30000
const CHUNK_SIZE = 100000
const HASH_READY_INTERVAL = 20
const HASH_CHUNK_INTERVAL = 8
const HASH_CHUNK_TIMEOUT = 1500

let cf_webview: WebviewWindow | null = null
let cf_ready = false
let cf_label = 'cf-fetch'
let cf_init_promise: Promise<void> | null = null

async function wait_for_cf_challenge(label: string): Promise<void> {
    const start_time = Date.now()

    while (Date.now() - start_time < MAX_WAIT_TIME) {
        try {
            await invoke('webview_eval', {
                label,
                script: `document.title.includes('moment') ? null : (window.__cf_passed = true)`,
            })
            await new Promise(r => setTimeout(r, 200))
            const url = await invoke<string>('webview_get_url', {label})
            if (!url.includes('challenge') && !url.includes('cdn-cgi')) {
                const check_script = `window.location.hash = window.__cf_passed ? 'CF_PASSED' : 'CF_WAITING'`
                await invoke('webview_eval', {label, script: check_script})
                await new Promise(r => setTimeout(r, 100))
                const check_url = await invoke<string>('webview_get_url', {label})
                if (check_url.includes('#CF_PASSED')) return
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (message.includes('Webview window not found')) {
                throw error
            }
        }
        await new Promise(r => setTimeout(r, CHECK_INTERVAL))
    }

    throw new Error('CF bypass timeout')
}

let transfer_queue = Promise.resolve()

async function start_fetch_in_page(
    request_id: string,
    url: string,
    options?: {method?: string; headers?: Record<string, string>; body?: string},
): Promise<void> {
    const payload = {
        request_id,
        url,
        method: options?.method ?? 'GET',
        headers: options?.headers ?? {},
        body: options?.body,
    }

    const capture_script = `
        (function() {
            const payload = ${JSON.stringify(payload)};
            const request = {
                method: payload.method,
                headers: payload.headers,
                credentials: 'include'
            };
            if (payload.body) {
                request.body = payload.body;
            }

            window.__html_chunks_map = window.__html_chunks_map || {};
            window.__html_single_map = window.__html_single_map || {};
            window.__html_errors = window.__html_errors || {};

            const base64_from_bytes = (bytes) => {
                const chunk_size = 0x8000;
                let binary = '';
                for (let i = 0; i < bytes.length; i += chunk_size) {
                    const slice = bytes.subarray(i, i + chunk_size);
                    binary += String.fromCharCode(...slice);
                }
                return btoa(binary);
            };

            fetch(payload.url, request)
                .then(response => response.text())
                .then(html => {
                    const bytes = new TextEncoder().encode(html);
                    const base64 = base64_from_bytes(bytes);
                    const chunk_size = ${CHUNK_SIZE};
                    if (base64.length <= chunk_size) {
                        window.__html_single_map[payload.request_id] = base64;
                        return;
                    }
                    const chunks = [];
                    for (let i = 0; i < base64.length; i += chunk_size) {
                        chunks.push(base64.slice(i, i + chunk_size));
                    }
                    window.__html_chunks_map[payload.request_id] = chunks;
                })
                .catch(err => {
                    window.__html_errors[payload.request_id] = err.message || 'fetch_failed';
                });
        })();
    `

    await invoke('webview_eval', {label: cf_label, script: capture_script})
}

async function get_page_html_via_hash(request_id: string): Promise<string> {
    await invoke('webview_eval', {label: cf_label, script: `window.location.hash = ''`})

    let chunk_count = 0
    const start_time = Date.now()
    while (Date.now() - start_time < PAGE_LOAD_TIMEOUT) {
        const status_script = `
            (function() {
                const id = ${JSON.stringify(request_id)};
                const singles = window.__html_single_map || {};
                const chunks = window.__html_chunks_map || {};
                const errors = window.__html_errors || {};
                if (errors[id]) {
                    window.location.hash = 'ERROR:' + id + ':' + encodeURIComponent(errors[id]);
                    return;
                }
                if (singles[id]) {
                    window.location.hash = 'SINGLE:' + id + ':' + singles[id];
                    return;
                }
                if (chunks[id]) {
                    window.location.hash = 'READY:' + id + ':' + chunks[id].length;
                    return;
                }
                window.location.hash = 'WAIT:' + id;
            })();
        `
        await invoke('webview_eval', {label: cf_label, script: status_script})
        const url = await invoke<string>('webview_get_url', {label: cf_label})
        const hash = decodeURIComponent(new URL(url).hash.slice(1))
        if (hash.startsWith(`SINGLE:${request_id}:`)) {
            const base64 = hash.slice(`SINGLE:${request_id}:`.length)
            await invoke('webview_eval', {
                label: cf_label,
                script: `delete (window.__html_single_map || {})[${JSON.stringify(request_id)}];`,
            })
            return decode_base64(base64)
        }
        if (hash.startsWith(`READY:${request_id}:`)) {
            chunk_count = parseInt(hash.split(':')[2], 10)
            break
        }
        if (hash.startsWith(`ERROR:${request_id}:`)) {
            const message = decodeURIComponent(hash.slice(`ERROR:${request_id}:`.length))
            await invoke('webview_eval', {
                label: cf_label,
                script: `delete (window.__html_errors || {})[${JSON.stringify(request_id)}];`,
            })
            throw new Error('Capture error: ' + message)
        }
        await new Promise(r => setTimeout(r, HASH_READY_INTERVAL))
    }

    if (chunk_count === 0) {
        throw new Error('Failed to prepare HTML chunks')
    }

    const chunks: string[] = []
    for (let i = 0; i < chunk_count; i++) {
        const get_chunk_script = `
            (function() {
                const id = ${JSON.stringify(request_id)};
                const data = (window.__html_chunks_map || {})[id];
                window.location.hash = 'CHUNK:' + id + ':' + ${i} + ':' + (data ? data[${i}] : '');
            })();
        `
        await invoke('webview_eval', {label: cf_label, script: get_chunk_script})

        const chunk_start = Date.now()
        while (Date.now() - chunk_start < HASH_CHUNK_TIMEOUT) {
            const url = await invoke<string>('webview_get_url', {label: cf_label})
            const hash = new URL(url).hash.slice(1)
            const prefix = `CHUNK:${request_id}:${i}:`
            if (hash.startsWith(prefix)) {
                chunks.push(hash.slice(prefix.length))
                break
            }
            await new Promise(r => setTimeout(r, HASH_CHUNK_INTERVAL))
        }

        if (chunks.length !== i + 1) {
            throw new Error(`Failed to get chunk ${i}`)
        }
    }

    await invoke('webview_eval', {
        label: cf_label,
        script: `delete (window.__html_chunks_map || {})[${JSON.stringify(request_id)}];`,
    })

    const base64 = chunks.join('')
    const html = decode_base64(base64)

    return html
}

function decode_base64(base64: string): string {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
}

export async function ensure_cf_webview(target_url: string): Promise<void> {
    if (cf_ready) {
        return
    }
    if (cf_init_promise) {
        await cf_init_promise
        return
    }

    cf_init_promise = (async () => {
        if (cf_webview) {
            try {
                await cf_webview.close()
            } catch (error) {
                void error
            }
            cf_webview = null
            cf_ready = false
        }

        try {
            cf_webview = new WebviewWindow('cf-fetch', {
                url: target_url,
                title: 'جارٍ التحقق من الاتصال...',
                width: 450,
                height: 550,
                center: true,
                resizable: false,
                focus: true,
            })

            cf_webview.onCloseRequested(() => {
                cf_webview = null
                cf_ready = false
            })

            cf_label = 'cf-fetch'
            const start = Date.now()
            while (Date.now() - start < PAGE_LOAD_TIMEOUT) {
                try {
                    await invoke('webview_get_url', {label: cf_label})
                    break
                } catch {
                    await new Promise(r => setTimeout(r, 100))
                }
            }

            await wait_for_cf_challenge(cf_label)
            await cf_webview.hide()
            cf_ready = true
        } catch (error) {
            cf_webview = null
            throw error
        }
    })()

    try {
        await cf_init_promise
    } finally {
        cf_init_promise = null
    }
}

const ANDROID_READY_EVENT = 'shamela-android-ready'
const android_fetch_pending = new Map<
    string,
    {resolve: (value: string) => void; reject: (reason?: unknown) => void; timeout: number}
>()
let android_listener_ready = false

function ensure_android_listener(): void {
    if (android_listener_ready) return
    const global_any = globalThis as typeof globalThis & {
        addEventListener?: typeof window.addEventListener
    }
    if (!global_any.addEventListener) return

    global_any.addEventListener('shamela-android-fetch', event => {
        const detail = (event as CustomEvent).detail as {
            requestId: string
            html?: string
            error?: string
        }
        const {requestId: request_id, html, error} = detail
        const entry = android_fetch_pending.get(request_id)
        if (!entry) return
        android_fetch_pending.delete(request_id)
        clearTimeout(entry.timeout)
        if (error) {
            entry.reject(new Error(error))
        } else {
            entry.resolve(html ?? '')
        }
    })
    android_listener_ready = true
}

async function get_android_bridge(timeout_ms = 5000): Promise<{
    fetch: (id: string, url: string, opts: string) => void
}> {
    const start = Date.now()
    const global_any = globalThis as typeof globalThis & {
        ShamelaAndroid?: {fetch?: (id: string, url: string, opts: string) => void}
        addEventListener?: typeof window.addEventListener
        removeEventListener?: typeof window.removeEventListener
    }

    const wait_for_ready_event = new Promise<void>(resolve => {
        if (!global_any.addEventListener || !global_any.removeEventListener) {
            resolve()
            return
        }
        const handler = () => {
            global_any.removeEventListener?.(ANDROID_READY_EVENT, handler)
            resolve()
        }
        global_any.addEventListener(ANDROID_READY_EVENT, handler)
    })

    while (Date.now() - start < timeout_ms) {
        const bridge = global_any.ShamelaAndroid
        if (bridge?.fetch) {
            return bridge as {fetch: (id: string, url: string, opts: string) => void}
        }
        await Promise.race([wait_for_ready_event, new Promise(r => setTimeout(r, 200))])
    }
    throw new Error('Android bridge not available')
}

async function get_page_html_via_android(
    url: string,
    options?: {method?: string; headers?: Record<string, string>; body?: string},
): Promise<string> {
    const request_id = crypto.randomUUID()
    const bridge = await get_android_bridge()

    ensure_android_listener()

    const payload = JSON.stringify({
        method: options?.method ?? 'GET',
        headers: options?.headers ?? {},
        body: options?.body,
    })

    return await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            android_fetch_pending.delete(request_id)
            reject(new Error('Android fetch timeout'))
        }, PAGE_LOAD_TIMEOUT)

        android_fetch_pending.set(request_id, {resolve, reject, timeout})
        bridge.fetch(request_id, url, payload)
    })
}

export async function webview_fetch(
    url: string,
    _options?: {method?: string; headers?: Record<string, string>; body?: string},
): Promise<{status: number; body: string; headers: Record<string, string>}> {
    const global_any = globalThis as typeof globalThis & {
        ShamelaAndroid?: {fetch?: unknown}
        __TAURI_INTERNALS__?: {platform?: string}
        navigator?: Navigator
    }
    const user_agent = global_any.navigator?.userAgent ?? ''
    const tauri_platform = global_any.__TAURI_INTERNALS__?.platform
    const has_android_bridge = !!global_any.ShamelaAndroid?.fetch
    const is_android_runtime =
        tauri_platform === 'android' || /Android|RustWebView|wv/i.test(user_agent)

    if (has_android_bridge || is_android_runtime) {
        const html = await get_page_html_via_android(url, _options)
        return {
            status: 200,
            body: html,
            headers: {'content-type': 'text/html'},
        }
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            await ensure_cf_webview(url)

            const request_id = crypto.randomUUID()
            await start_fetch_in_page(request_id, url, _options)

            const queued: Promise<string> = transfer_queue.then(() =>
                get_page_html_via_hash(request_id),
            )
            transfer_queue = queued.then(() => undefined).catch(() => undefined)
            const html = await queued

            return {
                status: 200,
                body: html,
                headers: {'content-type': 'text/html'},
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (attempt === 0 && message.includes('Webview window not found')) {
                close_cf_webview()
                continue
            }
            throw error
        }
    }

    throw new Error('CF webview unavailable')
}

export function close_cf_webview(): void {
    if (cf_webview) {
        cf_webview.close().catch(() => {})
        cf_webview = null
        cf_ready = false
    }
}

import type {PlatformHttp} from '../types'

export class WxtHttp implements PlatformHttp {
    async fetch(url: string, options?: RequestInit): Promise<Response> {
        return globalThis.fetch(url, {...options, credentials: 'include'})
    }
}

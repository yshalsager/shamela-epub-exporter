export interface PlatformStorage {
    get_value<T>(key: string): Promise<T | null>
    set_value<T>(key: string, value: T): Promise<void>
    watch(key: string, callback: (value: unknown) => void): () => void
}

export interface PlatformHttp {
    fetch(url: string, options?: RequestInit): Promise<Response>
}

export interface PlatformDownloader {
    download(blob: Blob, filename: string): Promise<void>
}

export interface PlatformNotify {
    show(title: string, body: string, icon?: string): Promise<void>
}

export interface Platform {
    storage: PlatformStorage
    http: PlatformHttp
    downloader: PlatformDownloader
    notify: PlatformNotify
    is_tauri: boolean
    is_extension: boolean
}

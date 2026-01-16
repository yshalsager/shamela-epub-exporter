import type {Platform} from '../types'
import {TauriDownloader} from './downloader'
import {TauriHttp} from './http'
import {TauriNotify} from './notify'
import {TauriStorage} from './storage'

export const create_tauri_platform = (): Platform => ({
    storage: new TauriStorage(),
    http: new TauriHttp(),
    downloader: new TauriDownloader(),
    notify: new TauriNotify(),
    is_tauri: true,
    is_extension: false,
})

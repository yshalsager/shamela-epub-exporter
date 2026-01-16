import type {Platform} from '../types'
import {WxtDownloader} from './downloader'
import {WxtHttp} from './http'
import {WxtNotify} from './notify'
import {WxtStorage} from './storage'

export const create_wxt_platform = (): Platform => ({
    storage: new WxtStorage(),
    http: new WxtHttp(),
    downloader: new WxtDownloader(),
    notify: new WxtNotify(),
    is_tauri: false,
    is_extension: true,
})

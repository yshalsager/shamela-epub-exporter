import {save} from '@tauri-apps/plugin-dialog'
import {writeFile} from '@tauri-apps/plugin-fs'

import type {PlatformDownloader} from '../types'

export class TauriDownloader implements PlatformDownloader {
    async download(blob: Blob, filename: string): Promise<void> {
        const ext = filename.split('.').pop()?.toLowerCase() || ''
        const filter_map: Record<string, {name: string; extensions: string[]}> = {
            epub: {name: 'EPUB', extensions: ['epub']},
            zip: {name: 'ZIP', extensions: ['zip']},
        }
        const selected_filter = filter_map[ext]

        const file_path = await save({
            defaultPath: filename,
            filters: selected_filter ? [selected_filter] : undefined,
        })

        if (!file_path) return

        const buffer = await blob.arrayBuffer()
        await writeFile(file_path, new Uint8Array(buffer))
    }
}

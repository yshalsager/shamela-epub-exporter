import {save} from '@tauri-apps/plugin-dialog'
import {writeFile} from '@tauri-apps/plugin-fs'

import type {PlatformDownloader} from '../types'

export class TauriDownloader implements PlatformDownloader {
    async download(blob: Blob, filename: string): Promise<void> {
        const file_path = await save({
            defaultPath: filename,
            filters: [
                {
                    name: 'EPUB',
                    extensions: ['epub'],
                },
            ],
        })

        if (!file_path) return

        const buffer = await blob.arrayBuffer()
        await writeFile(file_path, new Uint8Array(buffer))
    }
}

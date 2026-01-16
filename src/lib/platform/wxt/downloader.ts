import type {PlatformDownloader} from '../types'

export class WxtDownloader implements PlatformDownloader {
    private download_urls = new Map<number, string>()

    constructor() {
        browser.downloads.onChanged.addListener(delta => {
            const state = delta.state?.current
            if (!state || (state !== 'complete' && state !== 'interrupted')) return
            const url = this.download_urls.get(delta.id)
            if (!url) return
            URL.revokeObjectURL(url)
            this.download_urls.delete(delta.id)
        })
    }

    async download(blob: Blob, filename: string): Promise<void> {
        const url = URL.createObjectURL(blob)
        const download_id = await browser.downloads.download({url, filename})
        if (download_id) this.download_urls.set(download_id, url)
    }
}

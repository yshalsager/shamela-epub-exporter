import type {PlatformNotify} from '../types'

export class WxtNotify implements PlatformNotify {
    async show(title: string, body: string, icon?: string): Promise<void> {
        await browser.notifications.create({
            type: 'basic',
            title,
            message: body,
            iconUrl: icon ?? '/icon/128.png',
        })
    }
}

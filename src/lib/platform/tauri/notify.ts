import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification'

import type {PlatformNotify} from '../types'

export class TauriNotify implements PlatformNotify {
    private permission_checked = false

    async show(title: string, body: string): Promise<void> {
        try {
            if (/Android/i.test(navigator.userAgent)) {
                return
            }

            const origin = window.location.origin
            if (!origin.includes('tauri.localhost') && !origin.includes('localhost:1420')) {
                return
            }

            if (!this.permission_checked) {
                let granted = await isPermissionGranted()
                if (!granted) {
                    const permission = await requestPermission()
                    granted = permission === 'granted'
                }
                this.permission_checked = true
                if (!granted) return
            }

            await sendNotification({title, body})
        } catch {
            return
        }
    }
}

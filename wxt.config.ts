import {resolve} from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import {wuchale} from '@wuchale/vite-plugin'
import {defineConfig} from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/auto-icons', '@wxt-dev/module-svelte'],
    manifest: {
        name: '__MSG_extName__',
        description: '__MSG_extDescription__',
        default_locale: 'ar',
        permissions: ['tabs', 'storage', 'downloads', 'notifications'],
        host_permissions: ['https://shamela.ws/*'],
        browser_specific_settings: {
            gecko: {
                id: 'shamela_epub_exporter@yshalsager',
                // @ts-expect-error - WXT doesn't support this field yet
                data_collection_permissions: {
                    required: ['none'],
                },
            },
        },
    },
    vite: () => ({
        plugins: [wuchale(), tailwindcss()],
        resolve: {
            alias: {
                '@/lib/platform': resolve(__dirname, 'src/lib/platform/index.wxt.ts'),
                '@/lib/job-store': resolve(__dirname, 'src/lib/job-store.wxt.ts'),
            },
        },
    }),
    zip: {
        excludeSources: [
            'docs/**',
            'tmp/**',
            'src-tauri/**',
            'dist-tauri/**',
            'src/lib/platform/tauri/**',
            'src/lib/platform/index.tauri.ts',
            'src/tauri/**',
        ],
    },
})

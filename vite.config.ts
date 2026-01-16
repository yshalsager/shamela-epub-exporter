import {svelte} from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import {wuchale} from '@wuchale/vite-plugin'
import {resolve} from 'path'
import {defineConfig} from 'vite'

const tauri_root = resolve(__dirname, 'src/tauri')
// keep cwd in sync with Vite root so wuchale computes relative imports correctly
process.chdir(tauri_root)

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
    root: tauri_root,
    plugins: [wuchale(resolve(__dirname, 'wuchale.config.js')), tailwindcss(), svelte()],

    resolve: {
        alias: {
            '@/lib/platform': resolve(__dirname, 'src/lib/platform/index.tauri.ts'),
            '@/lib/job-store': resolve(__dirname, 'src/lib/job-store.tauri.ts'),
            '@': resolve(__dirname, 'src'),
        },
    },

    clearScreen: false,

    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: 'ws',
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            ignored: ['**/src-tauri/**'],
        },
    },

    envPrefix: ['VITE_', 'TAURI_ENV_*'],

    build: {
        outDir: resolve(__dirname, 'dist-tauri'),
        emptyOutDir: true,
        target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
        minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
        sourcemap: !!process.env.TAURI_ENV_DEBUG,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/tauri/index.html'),
            },
        },
    },
})

// @ts-check
import {adapter as svelte} from '@wuchale/svelte'
import {resolve} from 'path'
import {fileURLToPath} from 'url'
import {defineConfig} from 'wuchale'
import {adapter as js} from 'wuchale/adapter-vanilla'

const project_root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
    locales: ['ar', 'en'],
    adapters: {
        main: svelte({
            loader: 'svelte',
            localesDir: resolve(project_root, 'src/locales'),
            files: {
                include: [
                    '@(../entrypoints|src/entrypoints)/**/*.svelte',
                    '@(../lib/components|src/lib/components)/**/*.svelte',
                ],
                ignore: [
                    '@(../components/ui|src/components/ui)/**/*',
                    '@(../lib/hooks|src/lib/hooks)/**/*',
                ],
            },
        }),
        js: js({
            loader: 'vite',
            localesDir: resolve(project_root, 'src/locales'),
            files: [
                '@(../entrypoints|src/entrypoints)/*.{js,ts}',
                'src/tauri/*.{js,ts}',
                'main.{js,ts}',
            ],
        }),
    },
})

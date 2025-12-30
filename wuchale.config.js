// @ts-check
import { adapter as svelte } from "@wuchale/svelte"
import { defineConfig } from "wuchale"
import {adapter as js} from 'wuchale/adapter-vanilla'

export default defineConfig({
  locales: ['ar', 'en'],
  adapters: {
    main: svelte({
      loader: 'svelte',
      files: {
        include: ['src/entrypoints/**/*.svelte', 'src/lib/components/**/*.svelte'],
        ignore: ['src/components/ui/**/*', 'src/lib/hooks/**/*'],
      },
    }),
    js: js({
      loader: 'vite',
      files: ['src/entrypoints/*.{js,ts}'],
  }),
  },
})

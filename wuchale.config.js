// @ts-check
import { adapter as svelte } from "@wuchale/svelte"
import { defineConfig } from "wuchale"

export default defineConfig({
  locales: ['ar', 'en'],
  adapters: {
    main: svelte({
      loader: 'svelte',
      files: {
        include: ['src/entrypoints/**/*.svelte', 'src/lib/components/**/*.svelte'],
        ignore: ['src/components/ui/**/*', 'src/lib/hooks/**/*'],
      },
    })
  },
})

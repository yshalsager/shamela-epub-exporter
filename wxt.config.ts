import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { wuchale } from '@wuchale/vite-plugin'

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Shamela Export',
    description: 'Export Shamela books to EPUB from your active session.',
    permissions: ['tabs', 'scripting', 'storage', 'downloads'],
    host_permissions: ['https://shamela.ws/*'],
  },
  vite: () => ({
    plugins: [wuchale(), tailwindcss()],
  }),
});

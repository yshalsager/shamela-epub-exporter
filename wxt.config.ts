import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { wuchale } from '@wuchale/vite-plugin'

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/auto-icons', '@wxt-dev/module-svelte'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'ar',
    permissions: ['tabs', 'scripting', 'storage', 'downloads'],
    host_permissions: ['https://shamela.ws/*'],
  },
  vite: () => ({
    plugins: [wuchale(), tailwindcss()],
  }),
});

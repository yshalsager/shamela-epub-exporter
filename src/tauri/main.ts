import '../entrypoints/popup/app.css'

import {mount} from 'svelte'

import App from '../entrypoints/popup/App.svelte'

const app = mount(App, {
    target: document.getElementById('app')!,
})

export default app

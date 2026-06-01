import '../popup/app.css'

import {mount} from 'svelte'

import BokConverter from '@/components/BokConverter.svelte'

const app = mount(BokConverter, {
    target: document.getElementById('app')!,
})

export default app

import path from 'node:path'

import {chromium} from 'playwright'

const extension_path = path.resolve('.output/chrome-mv3')
const user_data_dir = path.resolve('tmp/pw-profile')
const screenshot_dir = path.resolve('assets')

const context = await chromium.launchPersistentContext(user_data_dir, {
    headless: false,
    args: [`--disable-extensions-except=${extension_path}`, `--load-extension=${extension_path}`],
    viewport: {width: 360, height: 360},
    deviceScaleFactor: 2,
})

const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
const extension_id = new URL(worker.url()).host

const page = await context.newPage()
const expand_main = async () => {
    await page.waitForSelector('main')
    await page.evaluate(() => {
        const main = document.querySelector('main')
        if (!main) return
        main.style.maxHeight = 'none'
        main.style.height = 'auto'
        main.style.overflow = 'visible'
    })
}
const set_locale = async locale => {
    await page.evaluate(value => {
        localStorage.setItem('shamela_ext.locale', value)
        location.reload()
    }, locale)
    await page.waitForFunction(value => document.documentElement.lang === value, locale)
    await expand_main()
}

await page.goto(`chrome-extension://${extension_id}/popup.html`, {waitUntil: 'domcontentloaded'})
await expand_main()

await set_locale('ar')
await page.screenshot({path: path.join(screenshot_dir, 'screenshot.png'), fullPage: true})
await set_locale('en')
await page.screenshot({path: path.join(screenshot_dir, 'screenshot-en.png'), fullPage: true})

await context.close()

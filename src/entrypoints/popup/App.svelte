<main
    class="max-h-[560px] w-[360px] space-y-3 overflow-y-auto rounded-xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur"
>
    <div class="pointer-events-none fixed top-3 right-3 z-50 flex w-64 flex-col gap-2">
        {#each toasts as toast (toast.id)}
            <Alert
                class="pointer-events-auto text-xs shadow-lg"
                variant={toast.level === 'error' ? 'destructive' : 'default'}
            >
                <AlertTitle>{toast_title(toast.level)}</AlertTitle>
                <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
        {/each}
    </div>

    <div class="space-y-1">
        <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
                <p class="text-xs tracking-[0.3em] text-muted-foreground uppercase">الشاملة</p>
                <h1 class="text-lg font-semibold text-foreground">مُحمل الكتب</h1>
            </div>
            <div class="w-[120px] space-y-1">
                <Label for="locale-select">اللغة</Label>
                <Select
                    type="single"
                    value={$locale}
                    onValueChange={value => void apply_locale(String(value))}
                >
                    <SelectTrigger id="locale-select" class="h-8 w-full text-xs">
                        <span data-slot="select-value">{current_locale_label}</span>
                    </SelectTrigger>
                    <SelectContent>
                        {#each $available_locales as option (option.locale)}
                            <SelectItem value={option.locale}>{option.name}</SelectItem>
                        {/each}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <p class="text-xs text-muted-foreground">
            أضف معرّف كتاب أو قائمة روابط، أو اترك فارغًا لاستخدام التبويب الحالي، ثم ابدأ المهمة
            واترَك تبويب الشاملة مفتوحًا أثناء العمل.
        </p>
    </div>

    <Card>
        <CardHeader class="pb-3">
            <CardTitle>الكتب</CardTitle>
            <CardDescription>أدخل معرّفًا أو روابط، أو اترك فارغًا للتبويب الحالي.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
            <div class="grid gap-2">
                <Label for="input">معرّفات أو روابط الكتب</Label>
                <textarea
                    id="input"
                    rows="2"
                    bind:value={input}
                    class="min-h-[56px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    placeholder="مثال: 8567 أو https://shamela.ws/book/8567&#10;يمكن إدخال عدة معرّفات/روابط (سطر لكل واحد)"
                ></textarea>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div
                    class="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2"
                >
                    <div class="grid gap-0.5">
                        <Label for="update_hamesh" class="cursor-pointer text-sm font-medium"
                            >تحسين الهوامش</Label
                        >
                        <p class="text-[10px] leading-tight text-muted-foreground">
                            تحويل الهوامش إلى نوافذ منبثقة لسهولة التنقل.
                        </p>
                    </div>
                    <Switch id="update_hamesh" bind:checked={update_hamesh} />
                </div>
                <div
                    class="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2"
                >
                    <div class="grid gap-0.5">
                        <Label for="flatten_toc" class="cursor-pointer text-sm font-medium"
                            >تسطيح الفهرس</Label
                        >
                        <p class="text-[10px] leading-tight text-muted-foreground">
                            يُجعل فهرس الموضوعات في مستوى واحد.
                        </p>
                    </div>
                    <Switch id="flatten_toc" bind:checked={flatten_toc} />
                </div>
                <div class="grid gap-1">
                    <Label for="volume" class="text-sm font-medium">الجزء</Label>
                    <Input id="volume" placeholder="مثال: 2" bind:value={volume} class="h-8" />
                </div>
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader class="pb-2">
            <CardTitle>التقدّم</CardTitle>
            <CardDescription
                >{current_job
                    ? `المهمة ${current_job.book_id}`
                    : 'منتَظَر بدء المهمة.'}</CardDescription
            >
        </CardHeader>
        <CardContent class="space-y-3">
            {#if current_job?.error}
                <div
                    class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                    {current_job.error}
                </div>
            {/if}
            <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>الحالة: {status_label(current_job?.status)}</span>
                <span>
                    {current_job?.progress.current ?? 0}
                    /
                    {current_job?.progress.total ?? 0}
                    صفحة
                </span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                    class="h-full rounded-full bg-primary transition-all"
                    style={`width: ${progress_percent}%`}
                ></div>
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader class="pb-2">
            <CardTitle>قائمة الانتظار</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
            {#if jobs.length}
                <ul class="space-y-2 text-xs text-muted-foreground">
                    {#each jobs as job (job.job_id)}
                        <li>
                            <div
                                class={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition ${
                                    current_job?.job_id === job.job_id
                                        ? 'border-primary/50 bg-primary/10 text-foreground'
                                        : 'border-border/60'
                                }`}
                            >
                                <span class="font-medium text-foreground">#{job.book_id}</span>
                                <span
                                    class="text-[10px] tracking-[0.2em] text-muted-foreground uppercase"
                                    >{status_label(job.status)}</span
                                >
                            </div>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="text-xs text-muted-foreground">قائمة الانتظار خالية.</p>
            {/if}
        </CardContent>
    </Card>

    <div class="flex flex-wrap gap-2">
        <Button onclick={start_jobs} class="flex-1">بدء</Button>
        <Button
            variant="secondary"
            onclick={cancel_job}
            class="flex-1"
            disabled={!current_job || current_job.status !== 'running'}>إلغاء</Button
        >
        <Button variant="outline" onclick={clear_jobs} class="flex-1" disabled={!jobs.length}
            >تفريغ</Button
        >
    </div>
</main>

<script lang="ts">
import {onMount} from 'svelte'

import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger} from '@/components/ui/select'
import {Switch} from '@/components/ui/switch'
import {job_state} from '@/lib/job-state.svelte'
import type {JobOptions, RuntimeMessage} from '@/lib/shamela/types'
import {apply_locale, available_locales, init_locale, locale} from '@/locales/locale'

let input = $state('')
let volume = $state('')
let update_hamesh = $state(false)
let flatten_toc = $state(false)
let toasts = $state<Array<{id: string; level: 'info' | 'success' | 'error'; message: string}>>([])

let jobs = $derived(job_state.state.jobs)
let current_job = $derived(
    jobs.find(job => job.status === 'running') ?? jobs[jobs.length - 1] ?? null,
)
let progress_percent = $derived(
    current_job && current_job.progress.total
        ? Math.min(
              100,
              Math.round((current_job.progress.current / current_job.progress.total) * 100),
          )
        : 0,
)
let current_locale_label = $derived.by(() => {
    const current = $locale
    return (
        $available_locales.find(
            (option: {locale: string; name: string}) => option.locale === current,
        )?.name ?? current
    )
})

const get_active_shamela_tab = async (): Promise<{book_id: number; tab_id: number} | null> => {
    try {
        const [tab] = await browser.tabs.query({active: true, currentWindow: true})
        if (tab?.url && tab.id != null) {
            const match = tab.url.match(/shamela\.ws\/book\/(\d+)/)
            if (match) return {book_id: Number.parseInt(match[1], 10), tab_id: tab.id}
        }
    } catch {
        // Ignore errors
    }
    return null
}

const parse_ids = async (): Promise<{ids: number[]; tab_id?: number}> => {
    const ids: number[] = []
    let use_current_tab_id: number | undefined

    input
        .split(/[\s\n]+/)
        .map(value => value.trim())
        .filter(Boolean)
        .forEach(value => {
            const url_match = value.match(/shamela\.ws\/book\/(\d+)/)
            if (url_match) {
                ids.push(Number.parseInt(url_match[1], 10))
                return
            }
            const direct_id = Number.parseInt(value, 10)
            if (!Number.isNaN(direct_id)) ids.push(direct_id)
        })

    if (!ids.length) {
        const active_tab = await get_active_shamela_tab()
        if (active_tab) {
            ids.push(active_tab.book_id)
            use_current_tab_id = active_tab.tab_id
        }
    }

    const unique: number[] = []
    ids.forEach(id => {
        if (!unique.includes(id)) unique.push(id)
    })
    return {ids: unique, tab_id: use_current_tab_id}
}

const push_toast = (level: 'info' | 'success' | 'error', message: string) => {
    const id = crypto.randomUUID()
    toasts = [...toasts, {id, level, message}]
    setTimeout(() => {
        toasts = toasts.filter(toast => toast.id !== id)
    }, 4000)
}

const toast_title = (level: 'info' | 'success' | 'error') => {
    if (level === 'error') return 'خطأ'
    if (level === 'success') return 'اكتمل'
    return 'معلومة'
}

const status_labels: Record<string, string> = {
    queued: 'في قائمة الانتظار',
    running: 'جارٍ التنفيذ',
    done: 'مكتملة',
    error: 'خطأ',
    canceled: 'مُلغاة',
    idle: 'جاهز',
}

const status_label = (status?: string) =>
    status_labels[status ?? 'idle'] ?? status ?? status_labels.idle

const start_jobs = async () => {
    const {ids, tab_id} = await parse_ids()
    if (!ids.length) return

    const options: JobOptions = {
        volume: volume.trim() || undefined,
        update_hamesh,
        flatten_toc,
    }

    for (const id of ids) {
        await browser.runtime.sendMessage({
            type: 'job/start',
            payload: {book_id: id, options, tab_id: ids.length === 1 ? tab_id : undefined},
        })
    }
}

const cancel_job = async () => {
    if (!current_job) return
    await browser.runtime.sendMessage({
        type: 'job/cancel',
        job_id: current_job.job_id,
    })
}

const clear_jobs = async () => {
    await browser.runtime.sendMessage({type: 'job/clear'})
}

onMount(() => {
    void init_locale()
    const handler = (message: RuntimeMessage) => {
        if (message.type === 'job/toast' && message.payload) {
            push_toast(
                (message.payload as {level: 'info' | 'success' | 'error'}).level,
                (message.payload as {message: string}).message,
            )
        }
    }

    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
})
</script>

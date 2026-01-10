<main class="w-[360px] space-y-3 p-4">
    <div class="pointer-events-none fixed top-3 right-3 z-50 flex w-60 flex-col gap-2">
        {#each toasts as toast (toast.id)}
            <Alert
                class="animate-in fade-in slide-in-from-top-2 pointer-events-auto text-xs shadow-xl backdrop-blur-sm duration-300"
                variant={toast.level === 'error' ? 'destructive' : 'default'}
            >
                <AlertTitle>{toast_title(toast.level)}</AlertTitle>
                <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
        {/each}
    </div>

    <header class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
            <div
                class="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-md"
            >
                <BookOpen class="h-5 w-5" />
            </div>
            <div>
                <h1 class="text-base leading-tight font-bold text-foreground">مُحمِّل الكتب</h1>
                <p class="text-[10px] text-muted-foreground">المكتبة الشاملة</p>
            </div>
        </div>
        <Select
            type="single"
            value={$locale}
            onValueChange={value => void apply_locale(String(value))}
        >
            <SelectTrigger class="h-8 w-[85px] text-xs shadow-sm">
                <span data-slot="select-value">{current_locale_label}</span>
            </SelectTrigger>
            <SelectContent>
                {#each $available_locales as option (option.locale)}
                    <SelectItem value={option.locale}>{option.name}</SelectItem>
                {/each}
            </SelectContent>
        </Select>
    </header>

    <Card class="overflow-hidden border-border/60 p-2.5 shadow-sm">
        <div class="space-y-2">
            <div class="space-y-1.5">
                <Label for="input" class="text-xs font-medium">معرّفات أو روابط الكتب</Label>
                <textarea
                    id="input"
                    rows="2"
                    bind:value={input}
                    class="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-inner transition-all outline-none placeholder:text-muted-foreground/70 focus:bg-background focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                    placeholder="معرّف أو رابط (سطر لكل كتاب)&#10;اتركه فارغًا لاستخدام التبويب الحالي"
                ></textarea>
            </div>

            <Separator class="bg-border/50" />

            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div
                    class="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 transition-colors hover:bg-muted"
                >
                    <Switch id="update_hamesh" bind:checked={update_hamesh} />
                    <Label
                        for="update_hamesh"
                        class="cursor-pointer text-xs font-medium"
                        title="تحويل الهوامش إلى نوافذ منبثقة">تحسين الهوامش</Label
                    >
                </div>
                <div
                    class="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 transition-colors hover:bg-muted"
                >
                    <Switch id="flatten_toc" bind:checked={flatten_toc} />
                    <Label
                        for="flatten_toc"
                        class="cursor-pointer text-xs font-medium"
                        title="يُجعل فهرس الموضوعات في مستوى واحد">تسطيح الفهرس</Label
                    >
                </div>
                <div class="flex items-center gap-2">
                    <Label for="volume" class="text-xs font-medium text-muted-foreground"
                        >الجزء:</Label
                    >
                    <Input
                        id="volume"
                        placeholder="الكل"
                        bind:value={volume}
                        class="h-7 w-16 px-2 text-xs shadow-sm"
                    />
                </div>
            </div>
        </div>
    </Card>

    <div class="flex gap-2">
        <Button
            onclick={start_jobs}
            class="h-9 flex-1 gap-1.5 text-sm font-semibold shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
        >
            <Play class="h-4 w-4" />
            بدء
        </Button>
        <Button
            variant="secondary"
            onclick={cancel_job}
            class="h-9 px-4 text-sm shadow-sm transition-all hover:shadow-md"
            disabled={!current_job || current_job.status !== 'running'}>إلغاء</Button
        >
        <Button
            variant="outline"
            onclick={clear_jobs}
            class="h-9 px-4 text-sm shadow-sm transition-all hover:shadow-md"
            disabled={!jobs.length}>تفريغ</Button
        >
    </div>

    {#if current_job || jobs.length}
        <Card
            class="overflow-hidden border-border/60 bg-linear-to-br from-card to-muted/30 p-2.5 shadow-sm"
        >
            {#if current_job}
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div
                                class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary"
                            >
                                <BookOpen class="h-3.5 w-3.5 animate-pulse" />
                            </div>
                            <span class="text-sm font-semibold">#{current_job.book_id}</span>
                        </div>
                        <span
                            class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                        >
                            {status_label(current_job.status)}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <div
                            class="flex items-center justify-between text-[10px] text-muted-foreground"
                        >
                            <span>التقدّم</span>
                            <span class="font-medium"
                                >{current_job.progress.current}/{current_job.progress.total ?? '?'} صفحة</span
                            >
                        </div>
                        <div class="h-2 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                            <div
                                class="h-full rounded-full bg-linear-to-r from-primary to-primary/80 transition-all duration-300 ease-out"
                                style={`width: ${progress_percent}%`}
                            ></div>
                        </div>
                    </div>
                    {#if current_job.error}
                        <div
                            class="rounded-md bg-destructive/10 px-2 py-1 text-[10px] text-destructive"
                        >
                            {current_job.error}
                        </div>
                    {/if}
                </div>
            {/if}
            {#if jobs.length > 1}
                {#if current_job}<Separator class="my-2 bg-border/40" />{/if}
                <div class="space-y-1">
                    <p class="text-[10px] font-medium text-muted-foreground">قائمة الانتظار</p>
                    <div class="flex flex-wrap gap-1.5">
                        {#each jobs.filter(j => j.job_id !== current_job?.job_id) as job (job.job_id)}
                            <span
                                class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium shadow-sm"
                            >
                                #{job.book_id}
                            </span>
                        {/each}
                    </div>
                </div>
            {/if}
        </Card>
    {/if}
</main>

<script lang="ts">
import {BookOpen, Play} from '@lucide/svelte'
import {onMount} from 'svelte'

import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger} from '@/components/ui/select'
import {Separator} from '@/components/ui/separator'
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

    await browser.runtime.sendMessage({
        type: 'job/start',
        payload: {book_ids: ids, options, tab_id: ids.length === 1 ? tab_id : undefined},
    })
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

<ModeWatcher />
<main
    class={[
        'mx-auto flex w-full max-w-sm flex-col gap-3',
        is_tauri_app ? 'h-full min-h-0 p-3' : '',
    ]}
>
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

    <header class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
            <div
                class="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-md md:h-10 md:w-10"
            >
                <BookOpen class="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
                <h1 class="text-base leading-tight font-bold text-foreground md:text-lg">
                    مُحمِّل الكتب
                </h1>
                <p class="text-[10px] text-muted-foreground md:text-xs">المكتبة الشاملة</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <Select
                type="single"
                value={$locale}
                onValueChange={value => void apply_locale(String(value))}
            >
                <SelectTrigger class="h-8 w-[85px] text-xs shadow-sm">
                    <span data-slot="select-value">{current_locale_label}</span>
                </SelectTrigger>
                <SelectContent preventScroll={false}>
                    {#each $available_locales as option (option.locale)}
                        <SelectItem value={option.locale}>{option.name}</SelectItem>
                    {/each}
                </SelectContent>
            </Select>
            <Button onclick={toggleMode} variant="outline" size="icon">
                <Sun
                    class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
                />
                <Moon
                    class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
                />
                <span class="sr-only">تبديل السمة</span>
            </Button>
        </div>
    </header>

    <Card class="overflow-hidden border-border/60 p-2.5 shadow-sm md:p-3 md:shadow-md">
        <div class="space-y-2 md:space-y-3">
            <div class="space-y-1.5">
                <Label for="input" class="text-xs font-medium md:text-sm"
                    >معرّفات أو روابط الكتب</Label
                >
                <textarea
                    id="input"
                    rows="2"
                    bind:value={input}
                    class="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-inner transition-all outline-none placeholder:text-muted-foreground/70 focus:bg-background focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 md:min-h-[100px]"
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
            class="h-9 flex-1 gap-1.5 text-sm font-semibold shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] md:h-10 md:text-base"
        >
            <Play class="h-4 w-4 md:h-5 md:w-5" />
            بدء
        </Button>
        <Button
            variant="secondary"
            onclick={cancel_job}
            class="h-9 px-4 text-sm shadow-sm transition-all hover:shadow-md md:h-10 md:text-base"
            disabled={!current_job || current_job.status !== 'running'}>إلغاء</Button
        >
        <Button
            variant="outline"
            onclick={clear_jobs}
            class="h-9 px-4 text-sm shadow-sm transition-all hover:shadow-md md:h-10 md:text-base"
            disabled={!jobs.length}>تفريغ</Button
        >
    </div>

    {#if jobs.length}
        <Card
            class={[
                'overflow-hidden border-border/60 bg-linear-to-br from-card to-muted/30 shadow-sm',
                `md:shadow-md${is_tauri_app ? ' min-h-0 flex-1' : ''}`,
            ]}
        >
            <div
                class={[
                    'space-y-2 overflow-y-auto p-2.5',
                    `md:p-3${is_tauri_app ? ' min-h-0 flex-1' : ''}`,
                ]}
            >
                {#each [...jobs].reverse() as job (job.job_id)}
                    <div
                        class="rounded-lg border border-border/50 bg-background/50 p-2 shadow-sm transition-all hover:bg-background/80"
                    >
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 overflow-hidden">
                                <div
                                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                                >
                                    {#if job.status === 'running'}
                                        <BookOpen class="h-3.5 w-3.5 animate-pulse" />
                                    {:else if job.status === 'done'}
                                        <BookOpen class="h-3.5 w-3.5" />
                                    {:else}
                                        <BookOpen class="h-3.5 w-3.5 opacity-50" />
                                    {/if}
                                </div>
                                <div class="flex flex-col overflow-hidden">
                                    <div class="flex items-center gap-1">
                                        <span
                                            class="truncate text-xs font-semibold"
                                            title={job.result?.title || `Book #${job.book_id}`}
                                        >
                                            {job.result?.title || `الكتاب #${job.book_id}`}
                                        </span>
                                        <a
                                            href={`https://shamela.ws/book/${job.book_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="text-muted-foreground hover:text-primary"
                                            title="فتح الكتاب في تبويب جديد"
                                        >
                                            <ExternalLink class="h-3 w-3" />
                                        </a>
                                    </div>
                                    {#if job.result?.author}
                                        <span
                                            class="truncate text-[10px] text-muted-foreground/80"
                                            title={job.result.author}
                                        >
                                            {job.result.author}
                                        </span>
                                    {/if}
                                    <div
                                        class="flex items-center gap-1 text-[10px] text-muted-foreground"
                                    >
                                        <span>{status_label(job.status)}</span>
                                        {#if job.options?.volume}
                                            <span class="px-0.5 opacity-50">•</span>
                                            <span>جـ{job.options.volume}</span>
                                        {/if}
                                    </div>
                                </div>
                            </div>

                            {#if job.status === 'running' || job.status === 'queued'}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                    onclick={() => cancel_job_id(job.job_id)}
                                    title="إلغاء"
                                >
                                    <span class="sr-only">إلغاء</span>
                                    <X class="h-3.5 w-3.5" />
                                </Button>
                            {:else if job.status === 'error' || job.status === 'canceled'}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                                    onclick={() => retry_job_id(job.job_id)}
                                    title="إعادة المحاولة"
                                >
                                    <span class="sr-only">إعادة المحاولة</span>
                                    <RotateCcw class="h-3.5 w-3.5" />
                                </Button>
                            {/if}
                        </div>

                        {#if job.status === 'running'}
                            <div class="mt-2 space-y-1">
                                <div
                                    class="flex items-center justify-between text-[10px] text-muted-foreground"
                                >
                                    <span>التقدم</span>
                                    <span>{job.progress.current}/{job.progress.total ?? '?'}</span>
                                </div>
                                <div
                                    class="h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-inner"
                                >
                                    <div
                                        class="h-full rounded-full bg-primary transition-all duration-300"
                                        style={`width: ${job.progress.total ? Math.round((job.progress.current / job.progress.total) * 100) : 0}%`}
                                    ></div>
                                </div>
                            </div>
                        {/if}

                        {#if job.error}
                            <div
                                class="mt-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[10px] text-destructive"
                            >
                                {job.error}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </Card>
    {/if}
</main>

<script lang="ts">
import {BookOpen, ExternalLink, Moon, Play, RotateCcw, Sun, X} from '@lucide/svelte'
import {ModeWatcher, toggleMode} from 'mode-watcher'
import {onMount} from 'svelte'

import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger} from '@/components/ui/select'
import {Separator} from '@/components/ui/separator'
import {Switch} from '@/components/ui/switch'
import {create_job_manager, type JobManager} from '@/lib/job-manager'
import {job_state} from '@/lib/job-state.svelte'
import {is_extension, is_tauri} from '@/lib/platform'
import type {JobOptions, RuntimeMessage} from '@/lib/shamela/types'
import {apply_locale, available_locales, init_locale, locale} from '@/locales/locale'

let input = $state('')
let volume = $state('')
let update_hamesh = $state(false)
let flatten_toc = $state(false)
let toasts = $state<Array<{id: string; level: 'info' | 'success' | 'error'; message: string}>>([])
let job_manager: JobManager | null = $state(null)
const is_tauri_app = is_tauri()

let jobs = $derived(job_state.state.jobs)
let current_job = $derived(
    jobs.find(job => job.status === 'running') ?? jobs[jobs.length - 1] ?? null,
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
    if (!is_extension()) return null
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

    if (!ids.length && is_extension()) {
        const active_tab = await get_active_shamela_tab()
        if (active_tab) {
            ids.push(active_tab.book_id)
            use_current_tab_id = active_tab.tab_id
        }
    }

    const unique_ids = Array.from(new Set(ids))
    return {ids: unique_ids, tab_id: use_current_tab_id}
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

    if (is_tauri() && job_manager) {
        await job_manager.start_jobs(ids, options)
    } else if (is_extension()) {
        await browser.runtime.sendMessage({
            type: 'job/start',
            payload: {book_ids: ids, options, tab_id: ids.length === 1 ? tab_id : undefined},
        })
    }
}

const cancel_job_id = async (job_id: string) => {
    if (is_tauri() && job_manager) {
        await job_manager.cancel_job(job_id)
    } else if (is_extension()) {
        await browser.runtime.sendMessage({
            type: 'job/cancel',
            job_id,
        })
    }
}

const retry_job_id = async (job_id: string) => {
    if (is_tauri() && job_manager) {
        await job_manager.retry_job(job_id)
    } else if (is_extension()) {
        await browser.runtime.sendMessage({
            type: 'job/retry',
            job_id,
        })
    }
}

const cancel_job = async () => {
    if (!current_job) return
    await cancel_job_id(current_job.job_id)
}

const clear_jobs = async () => {
    if (is_tauri() && job_manager) {
        await job_manager.clear_jobs()
    } else if (is_extension()) {
        await browser.runtime.sendMessage({type: 'job/clear'})
    }
}

const init_tauri = async () => {
    const {get_platform} = await import('@/lib/platform')
    const {create_platform_job_store} = await import('@/lib/job-store')

    const platform = await get_platform()
    const store = await create_platform_job_store()

    job_manager = create_job_manager(platform, store, {
        on_toast: (_job_id, level, message) => push_toast(level, message),
    })
}

onMount(() => {
    void init_locale()
    void job_state.init()

    if (is_tauri()) {
        void init_tauri()
    } else if (is_extension()) {
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
    }
})
</script>

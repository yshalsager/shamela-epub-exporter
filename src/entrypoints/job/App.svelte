<script lang='ts'>
  import { onMount } from 'svelte'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { Switch } from '@/components/ui/switch'
  import { job_state } from '@/lib/job-state.svelte'
  import { build_epub } from '@/lib/shamela/epub'
  import type { BookInfo, BookPage, JobOptions, RuntimeMessage } from '@/lib/shamela/types'

  let book_id = $state('')
  let urls = $state('')
  let volume = $state('')
  let update_hamesh = $state(false)
  let is_building = $state(false)
  let last_download = $state<{ url: string; filename: string } | null>(null)
  let selected_job_id = $state<string | null>(null)
  let toasts = $state<Array<{ id: string; level: 'info' | 'success' | 'error'; message: string }>>([])

  let jobs = $derived(job_state.state.jobs)
  let selected_job = $derived(selected_job_id ? jobs.find((job) => job.job_id === selected_job_id) ?? null : null)
  let current_job = $derived(
    selected_job ?? jobs.find((job) => job.status === 'running') ?? jobs[jobs.length - 1] ?? null
  )
  let progress_percent = $derived(
    current_job && current_job.progress.total
      ? Math.min(100, Math.round((current_job.progress.current / current_job.progress.total) * 100))
      : 0
  )

  const parse_ids = () => {
    const ids: number[] = []
    const direct_id = Number.parseInt(book_id.trim(), 10)
    if (!Number.isNaN(direct_id)) ids.push(direct_id)

    urls
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        const match = value.match(/shamela\.ws\/book\/(\d+)/)
        if (match) ids.push(Number.parseInt(match[1], 10))
      })

    const unique: number[] = []
    ids.forEach((id) => {
      if (!unique.includes(id)) unique.push(id)
    })
    return unique
  }

  const push_toast = (level: 'info' | 'success' | 'error', message: string) => {
    const id = crypto.randomUUID()
    toasts = [...toasts, { id, level, message }]
    setTimeout(() => {
      toasts = toasts.filter((toast) => toast.id !== id)
    }, 4000)
  }

  const toast_title = (level: 'info' | 'success' | 'error') => {
    if (level === 'error') return 'Error'
    if (level === 'success') return 'Done'
    return 'Info'
  }

  const start_jobs = async () => {
    const ids = parse_ids()
    if (!ids.length) return

    const options: JobOptions = {
      volume: volume.trim() || undefined,
      update_hamesh,
    }

    for (const id of ids) {
      await browser.runtime.sendMessage({
        type: 'job/start',
        payload: { book_id: id, options },
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
    await browser.runtime.sendMessage({ type: 'job/clear' })
  }

  const download_last = async () => {
    if (!last_download) return
    await browser.downloads.download({ url: last_download.url, filename: last_download.filename })
  }

  const build_and_download = async (info: BookInfo, pages: BookPage[], options: JobOptions) => {
    is_building = true
    const { blob, filename } = await build_epub(info, pages, options)
    if (last_download) URL.revokeObjectURL(last_download.url)
    const url = URL.createObjectURL(blob)
    last_download = { url, filename }
    await browser.downloads.download({ url, filename })
    push_toast('success', 'EPUB is ready for download.')
    is_building = false
  }

  onMount(() => {
    const handler = (message: RuntimeMessage) => {
      if (message.type === 'job/done' && message.payload) {
        const { info, pages, options } = message.payload as {
          info: BookInfo
          pages: BookPage[]
          options: JobOptions
        }
        build_and_download(info, pages, options)
      }
      if (message.type === 'job/toast' && message.payload) {
        push_toast(message.payload.level, message.payload.message)
      }
    }

    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  })

</script>

<main class='min-h-screen'>
  <div class='pointer-events-none fixed right-6 top-6 z-50 flex w-72 flex-col gap-2'>
    {#each toasts as toast (toast.id)}
      <Alert class='pointer-events-auto text-xs shadow-lg' variant={toast.level === 'error' ? 'destructive' : 'default'}>
        <AlertTitle>{toast_title(toast.level)}</AlertTitle>
        <AlertDescription>{toast.message}</AlertDescription>
      </Alert>
    {/each}
  </div>

  <div class='mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8'>
    <header class='space-y-2'>
      <p class='text-xs uppercase tracking-[0.35em] text-muted-foreground'>Shamela</p>
      <h1 class='font-serif text-3xl font-semibold text-foreground'>Export job</h1>
      <p class='max-w-2xl text-sm text-muted-foreground'>Queue a book id or a list of URLs, then keep the Shamela tab open while the job runs.</p>
    </header>

    <div class='grid gap-6 lg:grid-cols-[1.25fr_0.9fr]'>
      <Card>
        <CardHeader>
          <CardTitle>Book source</CardTitle>
          <CardDescription>Paste URLs or use a single id to open the book tab.</CardDescription>
        </CardHeader>
        <CardContent class='space-y-4'>
          <div class='grid gap-2'>
            <Label for='book_id'>Book id</Label>
            <Input id='book_id' placeholder='e.g. 8567' bind:value={book_id} />
          </div>
          <div class='grid gap-2'>
            <Label for='urls'>Book URLs (one per line)</Label>
            <textarea
              id='urls'
              rows='7'
              bind:value={urls}
              class='min-h-[140px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40'
              placeholder='https://shamela.ws/book/8567'
            ></textarea>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          <CardDescription>Light tweaks applied during export.</CardDescription>
        </CardHeader>
        <CardContent class='space-y-4'>
          <div class='flex items-center justify-between gap-4 rounded-lg border border-border bg-background/60 px-3 py-3'>
            <div class='space-y-1'>
              <p class='text-sm font-medium text-foreground'>Improve hamesh</p>
              <p class='text-xs text-muted-foreground'>Normalize notes layout and spacing.</p>
            </div>
            <Switch bind:checked={update_hamesh} />
          </div>
          <div class='grid gap-2'>
            <Label for='volume'>Volume (optional)</Label>
            <Input id='volume' placeholder='e.g. 2' bind:value={volume} />
          </div>
          <div class='rounded-lg border border-dashed border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground'>
            Volume selection trims toc and pages after scraping the first page.
          </div>
        </CardContent>
      </Card>
    </div>

    <div class='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>{current_job ? `Job ${current_job.book_id}` : 'Waiting for a job to start.'}</CardDescription>
        </CardHeader>
        <CardContent class='space-y-3'>
          {#if current_job?.error}
            <div class='rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
              {current_job.error}
            </div>
          {/if}
          <div class='flex items-center justify-between text-xs text-muted-foreground'>
            <span>Status: {current_job?.status ?? 'idle'}</span>
            <span>
              {current_job?.progress.current ?? 0}
              /
              {current_job?.progress.total ?? 0}
              pages
            </span>
          </div>
          <div class='h-2 w-full overflow-hidden rounded-full bg-muted'>
            <div class='h-full rounded-full bg-primary transition-all' style={`width: ${progress_percent}%`}></div>
          </div>
          {#if is_building}
            <p class='text-xs text-muted-foreground'>Building EPUB…</p>
          {/if}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>Latest jobs and their status.</CardDescription>
        </CardHeader>
        <CardContent class='space-y-2'>
          {#if jobs.length}
            <ul class='space-y-2 text-xs text-muted-foreground'>
              {#each jobs as job (job.job_id)}
                <li>
                  <button
                    class={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition ${
                      current_job?.job_id === job.job_id ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border/60'
                    }`}
                    onclick={() => (selected_job_id = job.job_id)}
                  >
                    <span class='font-medium text-foreground'>#{job.book_id}</span>
                    <span class='text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>{job.status}</span>
                  </button>
                </li>
              {/each}
            </ul>
            <div class='pt-2'>
              <Button variant='ghost' onclick={() => (selected_job_id = null)}>Follow active</Button>
            </div>
          {:else}
            <p class='text-xs text-muted-foreground'>Queue is empty.</p>
          {/if}
        </CardContent>
      </Card>
    </div>

    <div class='flex flex-wrap gap-3'>
      <Button onclick={start_jobs}>Start</Button>
      <Button variant='secondary' onclick={cancel_job} disabled={!current_job || current_job.status !== 'running'}>Cancel</Button>
      <Button variant='outline' onclick={clear_jobs} disabled={!jobs.length}>Clear</Button>
      <Button variant='ghost' onclick={download_last} disabled={!last_download}>Download last</Button>
    </div>
  </div>
</main>

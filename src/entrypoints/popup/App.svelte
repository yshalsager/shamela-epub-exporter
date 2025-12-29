<script lang='ts'>
  import { Button } from '@/components/ui/button'

  const open_job_tab = () => {
    browser.tabs.create({ url: browser.runtime.getURL('job.html') })
  }
</script>

<main class='w-[360px] space-y-4 rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur'>
  <div class='space-y-1'>
    <p class='text-xs uppercase tracking-[0.3em] text-muted-foreground'>Shamela</p>
    <h1 class='text-lg font-semibold text-foreground'>EPUB exporter</h1>
    <p class='text-sm text-muted-foreground'>Open the job tab to start scraping from your active Shamela session.</p>
  </div>
  <Button class='w-full' onclick={open_job_tab}>Open job tab</Button>
</main>

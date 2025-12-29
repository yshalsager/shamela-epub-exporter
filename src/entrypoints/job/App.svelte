<script lang='ts'>
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { Switch } from '@/components/ui/switch'

  let book_id = $state('')
  let urls = $state('')
  let volume = $state('')
  let update_hamesh = $state(false)
</script>

<main class='min-h-screen'>
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
            <Input id='book_id' placeholder='e.g. 1' bind:value={book_id} />
          </div>
          <div class='grid gap-2'>
            <Label for='urls'>Book URLs (one per line)</Label>
            <textarea
              id='urls'
              rows='7'
              bind:value={urls}
              class='min-h-[140px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40'
              placeholder='https://shamela.ws/book/1'
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
            Volume selection will trim the toc and pages later in the pipeline.
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Progress</CardTitle>
        <CardDescription>Waiting for a job to start.</CardDescription>
      </CardHeader>
      <CardContent class='space-y-3'>
        <div class='flex items-center justify-between text-xs text-muted-foreground'>
          <span>Status: idle</span>
          <span>0 / 0 pages</span>
        </div>
        <div class='h-2 w-full overflow-hidden rounded-full bg-muted'>
          <div class='h-full w-[0%] rounded-full bg-primary'></div>
        </div>
        <ul class='space-y-1 text-xs text-muted-foreground'>
          <li>Queue is empty.</li>
        </ul>
      </CardContent>
    </Card>

    <div class='flex flex-wrap gap-3'>
      <Button>Start</Button>
      <Button variant='secondary'>Cancel</Button>
      <Button variant='outline'>Clear</Button>
      <Button variant='ghost'>Download last</Button>
    </div>
  </div>
</main>

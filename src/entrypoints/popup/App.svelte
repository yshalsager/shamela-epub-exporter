<main
    class="w-[360px] space-y-4 rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur"
>
    <div class="space-y-1">
        <p class="text-xs tracking-[0.3em] text-muted-foreground uppercase">الشاملة</p>
        <h1 class="text-lg font-semibold text-foreground">مُحمل الكتب</h1>
        <p class="text-sm text-muted-foreground">
            افتح أداة التحميل من موقع المكتبة الشاملة والتصدير إلى كتاب إلكتروني بصيغة EPUB.
        </p>
    </div>
    <Button class="w-full" onclick={open_job_tab}>فتح الأداة</Button>
</main>

<script lang="ts">
import {Button} from '@/components/ui/button'
import {init_locale} from '@/locales/locale'

const open_job_tab = () => {
    browser.tabs.create({url: browser.runtime.getURL('job.html')})
}

onMount(() => {
    void init_locale()
})
</script>

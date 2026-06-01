<section class="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 md:p-4" bind:this={preview_wrap}>
    <header class="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
        <h1 class="text-xl font-bold">محول كتب الشاملة القديمة (.bok)</h1>
        <p class="mt-1 text-sm text-muted-foreground">
            تحويل ملفات <code>.bok/.mdb/.accdb</code> إلى EPUB (وPDF اختياري) محليًا بدون رفع أي ملف
        </p>
    </header>

    <Card class="border-border/70 bg-card/85 p-4 shadow-sm">
        <div class="grid gap-3 md:grid-cols-[2fr,1fr]">
            <label class="grid gap-1.5 text-sm">
                <span class="text-muted-foreground">الملفات</span>
                <input
                    type="file"
                    accept=".bok,.mdb,.accdb"
                    multiple
                    class="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    onchange={on_files_change}
                />
            </label>

            <label class="grid gap-1.5 text-sm">
                <span class="text-muted-foreground">كلمة المرور (اختياري)</span>
                <Input bind:value={db_password} placeholder="اختياري" />
            </label>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
            <Button onclick={analyze_all_files} disabled={!selected_files.length || busy}
                >تحليل كل الملفات</Button
            >
            <Button
                variant="secondary"
                onclick={analyze_active_file}
                disabled={!selected_files.length || busy}>تحليل الملف المحدد</Button
            >
            <Button variant="outline" onclick={open_preview} disabled={!can_convert_active || busy}
                >استعراض</Button
            >
            <Button
                variant="default"
                onclick={convert_active}
                disabled={!can_convert_active || busy}>تحويل المحدد</Button
            >
            <Button
                variant="secondary"
                onclick={convert_batch}
                disabled={!can_convert_batch || busy}
            >
                {download_each_mode ? 'تحويل جماعي (تنزيل مباشر)' : 'تحويل جماعي (ZIP)'}
            </Button>
        </div>

        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" bind:checked={download_each_mode} />
                <span>تنزيل كل ملف مباشرة</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" bind:checked={include_pdf} />
                <span>إنشاء PDF مع EPUB</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" bind:checked={include_html} />
                <span>إنشاء HTML مع EPUB</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" bind:checked={include_author_filename} />
                <span>إضافة المؤلف لاسم الملف</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" bind:checked={include_toc_page} />
                <span>إدراج صفحة الفهرس في ترتيب الصفحات</span>
            </label>
            <label class="grid gap-1 text-sm">
                <span class="text-muted-foreground">خط PDF</span>
                <select
                    class="rounded-md border border-input bg-background px-2 py-2"
                    bind:value={pdf_font}
                    disabled={!include_pdf}
                >
                    <option value="Cairo">Cairo</option>
                    <option value="AmiriQuran">AmiriQuran</option>
                </select>
            </label>
            <div class="text-sm text-muted-foreground">
                {busy ? 'جارٍ التنفيذ...' : status_text}
            </div>
        </div>

        {#if error_message}
            <div
                class="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
                {error_message}
            </div>
        {/if}

        {#if warn_message}
            <div
                class="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
            >
                {warn_message}
            </div>
        {/if}

        {#if ok_message}
            <div
                class="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
            >
                {ok_message}
            </div>
        {/if}
    </Card>

    <div class="grid gap-3 lg:grid-cols-[2fr,1fr]">
        <Card class="border-border/70 bg-card/85 p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
                <h2 class="font-semibold">التحليل المسبق</h2>
                <div class="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onclick={go_prev_book}
                        disabled={!analysis_results.length}>السابق</Button
                    >
                    <span class="text-xs text-muted-foreground">{book_nav_label}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onclick={go_next_book}
                        disabled={!analysis_results.length}>التالي</Button
                    >
                </div>
            </div>

            <div class="max-h-60 overflow-auto rounded-lg border border-border/70">
                <table class="w-full border-collapse text-xs">
                    <thead class="bg-muted/50">
                        <tr>
                            <th class="p-2 text-right">#</th>
                            <th class="p-2 text-right">الملف</th>
                            <th class="p-2 text-right">الحالة</th>
                            <th class="p-2 text-right">الكتاب</th>
                            <th class="p-2 text-right">الجداول</th>
                            <th class="p-2 text-right">الجدول</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if analysis_results.length}
                            {#each analysis_results as item, index (item.key)}
                                <tr
                                    class={[
                                        'cursor-pointer border-t border-border/60',
                                        index === active_book_index ? 'bg-primary/10' : '',
                                        item.status === 'error' ? 'bg-destructive/10' : '',
                                    ]}
                                    onclick={() => select_book(index)}
                                >
                                    <td class="p-2">{index + 1}</td>
                                    <td class="max-w-48 truncate p-2" title={item.file_name}
                                        >{item.file_name}</td
                                    >
                                    <td class="p-2"
                                        >{item.status === 'ready'
                                            ? 'جاهز'
                                            : `خطأ: ${item.error}`}</td
                                    >
                                    <td class="max-w-52 truncate p-2" title={item.title}
                                        >{item.title || '-'}</td
                                    >
                                    <td class="p-2"
                                        >{item.status === 'ready' ? item.tables_count : '-'}</td
                                    >
                                    <td class="p-2">{item.selection?.content_table || '-'}</td>
                                </tr>
                            {/each}
                        {:else}
                            <tr>
                                <td colspan="6" class="p-3 text-center text-muted-foreground"
                                    >لم يتم التحليل بعد</td
                                >
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>

            {#if active_entry}
                <div
                    class="mt-4 grid gap-3 rounded-xl border border-border/70 bg-background/30 p-3 md:grid-cols-2"
                >
                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">عنوان الكتاب (تجاوز)</span>
                        <Input
                            value={active_entry.override_title}
                            oninput={on_override_title_change}
                        />
                    </label>
                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">المؤلف (تجاوز)</span>
                        <Input
                            value={active_entry.override_author}
                            oninput={on_override_author_change}
                        />
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">جدول المحتوى</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.content_table || ''}
                            onchange={on_content_table_change}
                        >
                            {#each active_entry.table_names as table_name (table_name)}
                                <option value={table_name}>{table_name}</option>
                            {/each}
                        </select>
                    </label>
                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">عمود النص</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.content_text_col || ''}
                            onchange={on_content_text_col_change}
                        >
                            {#each content_columns as column (column)}
                                <option value={column}>{column}</option>
                            {/each}
                        </select>
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">عمود المعرّف (اختياري)</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.content_id_col || ''}
                            onchange={on_content_id_col_change}
                        >
                            <option value="">بدون</option>
                            {#each content_numeric_columns as column (column)}
                                <option value={column}>{column}</option>
                            {/each}
                        </select>
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">عمود الصفحة (اختياري)</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.content_page_col || ''}
                            onchange={on_content_page_col_change}
                        >
                            <option value="">بدون</option>
                            {#each content_numeric_columns as column (column)}
                                <option value={column}>{column}</option>
                            {/each}
                        </select>
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">عمود الجزء (اختياري)</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.content_part_col || ''}
                            onchange={on_content_part_col_change}
                        >
                            <option value="">بدون</option>
                            {#each content_numeric_columns as column (column)}
                                <option value={column}>{column}</option>
                            {/each}
                        </select>
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">حجم الدفعة</span>
                        <Input
                            type="number"
                            min="200"
                            max="20000"
                            step="100"
                            value={active_entry.selection?.chunk_size || '2000'}
                            oninput={on_chunk_size_change}
                        />
                    </label>

                    <label class="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={!!active_entry.selection?.split_numbered}
                            onchange={on_split_numbered_change}
                        />
                        <span>تقسيم النص حسب الترقيم</span>
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">جدول الفهرس (اختياري)</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.toc_table || ''}
                            onchange={on_toc_table_change}
                        >
                            <option value="">بدون</option>
                            {#each active_entry.table_names as table_name (table_name)}
                                <option value={table_name}>{table_name}</option>
                            {/each}
                        </select>
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">عمود عنوان الفهرس</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.toc_text_col || ''}
                            onchange={on_toc_text_col_change}
                        >
                            <option value="">بدون</option>
                            {#each toc_columns as column (column)}
                                <option value={column}>{column}</option>
                            {/each}
                        </select>
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">عمود البداية (صفحة/معرف)</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.toc_start_col || ''}
                            onchange={on_toc_start_col_change}
                        >
                            <option value="">بدون</option>
                            {#each toc_numeric_columns as column (column)}
                                <option value={column}>{column}</option>
                            {/each}
                        </select>
                    </label>

                    <label class="grid gap-1.5 text-sm">
                        <span class="text-muted-foreground">عمود المستوى</span>
                        <select
                            class="rounded-md border border-input bg-background px-2 py-2"
                            value={active_entry.selection?.toc_level_col || ''}
                            onchange={on_toc_level_col_change}
                        >
                            <option value="">بدون</option>
                            {#each toc_numeric_columns as column (column)}
                                <option value={column}>{column}</option>
                            {/each}
                        </select>
                    </label>
                </div>
            {/if}
        </Card>

        <Card class="border-border/70 bg-card/85 p-4 shadow-sm">
            <h2 class="mb-3 font-semibold">ملخص</h2>
            {#if active_entry}
                <div class="space-y-2 text-sm">
                    <div class="rounded-md border border-border/70 bg-background/40 p-2">
                        <div class="text-muted-foreground">الكتاب</div>
                        <div class="font-medium">{effective_title(active_entry)}</div>
                    </div>
                    <div class="rounded-md border border-border/70 bg-background/40 p-2">
                        <div class="text-muted-foreground">المؤلف</div>
                        <div class="font-medium">{effective_author(active_entry) || '-'}</div>
                    </div>
                    <div class="rounded-md border border-border/70 bg-background/40 p-2">
                        <div class="text-muted-foreground">عدد الجداول</div>
                        <div class="font-medium">{active_entry.table_names.length}</div>
                    </div>
                    <div class="rounded-md border border-border/70 bg-background/40 p-2">
                        <div class="text-muted-foreground">الصفحات</div>
                        <div class="font-medium">{active_entry.pages_count || '-'}</div>
                    </div>
                    <div class="rounded-md border border-border/70 bg-background/40 p-2">
                        <div class="text-muted-foreground">الملف الناتج</div>
                        <div class="font-medium">
                            {make_output_filename(
                                effective_title(active_entry),
                                effective_author(active_entry),
                                'epub',
                                include_author_filename,
                            )}
                        </div>
                    </div>
                    {#if include_pdf}
                        <div class="rounded-md border border-border/70 bg-background/40 p-2">
                            <div class="text-muted-foreground">PDF</div>
                            <div class="font-medium">
                                {make_output_filename(
                                    effective_title(active_entry),
                                    effective_author(active_entry),
                                    'pdf',
                                    include_author_filename,
                                )}
                            </div>
                        </div>
                    {/if}
                    {#if include_html}
                        <div class="rounded-md border border-border/70 bg-background/40 p-2">
                            <div class="text-muted-foreground">HTML</div>
                            <div class="font-medium">
                                {make_output_filename(
                                    effective_title(active_entry),
                                    effective_author(active_entry),
                                    'html',
                                    include_author_filename,
                                )}
                            </div>
                        </div>
                    {/if}
                </div>

                <div
                    class="mt-3 max-h-72 overflow-auto rounded-lg border border-border/70 bg-background/30 p-2 text-xs"
                >
                    {#each active_entry.table_names as table_name (table_name)}
                        <div class="mb-2 rounded border border-border/60 px-2 py-1">
                            <div class="font-semibold">{table_name}</div>
                            <div class="text-muted-foreground">
                                صفوف: {active_entry.table_meta.get(table_name)?.row_count ?? 0}
                            </div>
                            <div class="break-all text-muted-foreground">
                                {(active_entry.table_meta.get(table_name)?.column_names ?? []).join(
                                    ', ',
                                )}
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <p class="text-sm text-muted-foreground">اختر ملفًا ثم شغّل التحليل.</p>
            {/if}

            <div class="mt-3">
                <div class="mb-1 text-xs text-muted-foreground">ملاحظات/سجل</div>
                <pre
                    class="max-h-52 overflow-auto rounded-lg border border-border/70 bg-black/90 p-2 text-xs leading-5 text-zinc-100">{log_lines.join(
                        '\n',
                    )}</pre>
            </div>
        </Card>
    </div>
</section>

<svelte:window onkeydown={on_preview_window_keydown} />

{#if preview_open}
    <div
        class="fixed inset-0 z-80 bg-black/55 p-3 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        onclick={on_preview_backdrop_click}
        onkeydown={on_preview_overlay_keydown}
    >
        <div
            class="mx-auto grid h-full w-full max-w-7xl grid-rows-[auto,1fr] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            bind:this={preview_modal_panel}
            tabindex="-1"
        >
            <div class="flex items-center justify-between border-b border-border p-3">
                <div>
                    <div class="font-semibold">استعراض المحتوى</div>
                    <div class="text-xs text-muted-foreground">{preview_title}</div>
                    <div class="text-xs text-muted-foreground">{preview_status_text}</div>
                </div>
                <div class="flex gap-2">
                    <Button
                        variant="outline"
                        onclick={preview_load_more}
                        disabled={!preview_reader || preview_done}>تحميل المزيد</Button
                    >
                    <Button variant="secondary" onclick={close_preview} data-preview-close
                        >إغلاق</Button
                    >
                </div>
            </div>

            <div class="grid min-h-0 gap-3 p-3 lg:grid-cols-[1fr,360px]">
                <div
                    class="grid min-h-0 grid-rows-[auto,1fr] overflow-hidden rounded-xl border border-border/70 bg-card/80"
                >
                    <div class="flex flex-wrap items-center gap-2 border-b border-border p-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onclick={preview_prev_page}
                            disabled={preview_current_page <= 1}>السابق</Button
                        >
                        <Button
                            variant="outline"
                            size="sm"
                            onclick={preview_next_page}
                            disabled={!preview_reader ||
                                (preview_done && preview_current_page >= preview_total_pages)}
                            >التالي</Button
                        >
                        <label class="flex items-center gap-2 text-xs">
                            <span>صفحة</span>
                            <Input
                                class="h-8 w-24"
                                type="number"
                                min="1"
                                value={String(preview_current_page)}
                                onkeydown={on_preview_page_keydown}
                                onchange={on_preview_page_change}
                            />
                        </label>
                        <span class="text-xs text-muted-foreground">/ {preview_total_label}</span>
                    </div>
                    <div class="overflow-auto p-4 leading-7" data-preview-scroll>
                        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                        {@html preview_html}
                    </div>
                </div>

                <div
                    class="grid min-h-0 grid-rows-[auto,1fr] overflow-hidden rounded-xl border border-border/70 bg-card/80"
                >
                    <div class="border-b border-border p-2 text-xs text-muted-foreground">
                        الفهرس {preview_toc_status_text}
                    </div>
                    <div
                        class="overflow-auto p-2"
                        data-preview-toc
                        role="tree"
                        tabindex="0"
                        onkeydown={on_preview_toc_keydown}
                        onclick={on_preview_toc_click}
                    >
                        {#if preview_toc_html}
                            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                            {@html preview_toc_html}
                        {:else}
                            <div class="p-2 text-sm text-muted-foreground">لا يوجد فهرس</div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<script lang="ts">
import JSZip from 'jszip'
import {tick} from 'svelte'

import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {
    analyze_mdb,
    guess_content_columns,
    guess_toc_columns,
    make_file_key,
    parse_raw_toc,
    read_table_preview,
} from '@/lib/bok/analyze'
import {build_html} from '@/lib/bok/html'
import {
    build_book_payload,
    create_pages_reader,
    escape_xml,
    make_output_filename,
    sanitize_filename,
} from '@/lib/bok/pages'
import {build_pdf} from '@/lib/bok/pdf'
import {load_bok_libs} from '@/lib/bok/runtime'
import type {book_selection, mdb_reader, page_reader, table_meta_map} from '@/lib/bok/types'
import {get_platform} from '@/lib/platform'
import {build_epub} from '@/lib/shamela/epub'

type analysis_entry = {
    key: string
    file: File
    file_name: string
    status: 'ready' | 'error'
    error: string
    title: string
    author: string
    card: string
    tables_count: number
    content_table: string
    selection: book_selection | null
    table_names: string[]
    table_meta: table_meta_map
    override_title: string
    override_author: string
    pages_count: number
}

type batch_item = {
    key: string
    file: File
    file_name: string
    status: 'ready' | 'error'
    error: string
    selection: book_selection | null
}

type toc_preview_item = {
    start: number
    text: string
    page: number | null
    level: number | null
}

type toc_preview_tree = Array<[toc_preview_item, toc_preview_tree]>

let selected_files = $state<File[]>([])
let analysis_results = $state<analysis_entry[]>([])
let analysis_signature = $state('')
let active_book_index = $state(-1)
let db_password = $state('')
let include_author_filename = $state(false)
let include_toc_page = $state(true)
let download_each_mode = $state(true)
let include_pdf = $state(false)
let include_html = $state(false)
let pdf_font = $state<'Cairo' | 'AmiriQuran'>('Cairo')
let busy = $state(false)
let status_text = $state('جاهز')
let error_message = $state('')
let warn_message = $state('اختر ملف .bok واحدًا أو أكثر ثم اضغط "تحليل كل الملفات".')
let ok_message = $state('')
let log_lines = $state<string[]>(['Ready'])

let preview_open = $state(false)
let preview_reader = $state<page_reader | null>(null)
let preview_current_page = $state(1)
let preview_total_pages = $state(0)
let preview_html = $state('<div class="text-sm text-muted-foreground">لا توجد صفحة</div>')
let preview_title = $state('-')
let preview_active_start = $state<number | null>(null)
let preview_toc_items = $state<toc_preview_item[]>([])
let preview_toc_html = $state('')
let preview_status_text = $state('-')
let preview_toc_status_text = $state('-')
let preview_modal_panel: HTMLElement | null = $state(null)
let preview_wrap: HTMLElement | null = $state(null)
let preview_last_focus: HTMLElement | null = $state(null)
let preview_prev_overflow = $state('')
let content_numeric_columns_state = $state<string[]>([])
let toc_numeric_columns_state = $state<string[]>([])

const active_entry = $derived(active_book_index >= 0 ? analysis_results[active_book_index] : null)

const content_columns = $derived.by(() => {
    if (!active_entry?.selection?.content_table) return []
    return active_entry.table_meta.get(active_entry.selection.content_table)?.column_names ?? []
})

const content_numeric_columns = $derived(content_numeric_columns_state)

const toc_columns = $derived.by(() => {
    if (!active_entry?.selection?.toc_table) return []
    return active_entry.table_meta.get(active_entry.selection.toc_table)?.column_names ?? []
})

const toc_numeric_columns = $derived(toc_numeric_columns_state)

const can_convert_active = $derived(
    !!active_entry && active_entry.status === 'ready' && !!active_entry.selection,
)

const can_convert_batch = $derived(selected_files.length > 1)

const preview_done = $derived(preview_reader?.progress().done ?? true)
const preview_total_label = $derived.by(() => {
    if (!preview_reader) return '?'
    if (preview_done) return String(preview_total_pages || 0)
    return `${preview_total_pages || 0}+`
})

const book_nav_label = $derived.by(() => {
    if (!analysis_results.length || active_book_index < 0) return 'لا يوجد كتاب محدد'
    const entry = analysis_results[active_book_index]
    return `${active_book_index + 1}/${analysis_results.length} - ${entry.file_name}`
})

const push_log = (...parts: unknown[]) => {
    const line = parts
        .map(part => (typeof part === 'string' ? part : JSON.stringify(part)))
        .join(' ')
    log_lines = [...log_lines.slice(-599), line]
}

const reset_messages = () => {
    error_message = ''
    warn_message = ''
    ok_message = ''
}

const set_error = (message: string) => {
    error_message = message
    warn_message = ''
    ok_message = ''
    push_log(`ERR: ${message}`)
}

const set_warn = (message: string) => {
    error_message = ''
    warn_message = message
    ok_message = ''
    push_log(`WARN: ${message}`)
}

const set_ok = (message: string) => {
    ok_message = message
    warn_message = ''
    error_message = ''
    push_log(`OK: ${message}`)
}

const error_text = (error: unknown) => (error instanceof Error ? error.message : String(error))
const error_stack_text = (error: unknown) =>
    error instanceof Error ? error.stack || error.message : String(error)
const is_numeric_like_value = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value)
    if (typeof value === 'string') return /^\s*[0-9\u0660-\u0669\u06F0-\u06F9]+\s*$/.test(value)
    return false
}

const pick_numeric_like_columns = (
    preview_rows: Array<Record<string, unknown>>,
    column_names: string[],
) => column_names.filter(column => preview_rows.some(row => is_numeric_like_value(row?.[column])))

const set_busy = (value: boolean, text = '') => {
    busy = value
    status_text = text || (value ? 'جارٍ التنفيذ...' : 'جاهز')
}

const build_preview_toc_tree = (items: toc_preview_item[]): toc_preview_tree => {
    if (!items.length) return []

    const root: toc_preview_tree = []
    const stack: Array<{level: number; children: toc_preview_tree}> = [{level: 0, children: root}]
    const get_level = (item: toc_preview_item) =>
        typeof item.level === 'number' && Number.isFinite(item.level) && item.level > 0
            ? item.level
            : 1

    items.forEach(item => {
        const level = get_level(item)
        while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
        const parent = stack[stack.length - 1]
        const children: toc_preview_tree = []
        parent.children.push([item, children])
        stack.push({level, children})
    })

    return root
}

const render_preview_toc_html = () => {
    if (!preview_toc_items.length) {
        preview_toc_html = ''
        return
    }

    const tree = build_preview_toc_tree(preview_toc_items)
    const render_items = (nodes: toc_preview_tree): string => {
        if (!nodes.length) return ''
        return `<ol>${nodes.map(render_node).join('')}</ol>`
    }
    const render_node = (node: [toc_preview_item, toc_preview_tree]) => {
        const [entry, children] = node
        const active = entry.start === preview_active_start
        const current_attr = active ? ' aria-current="true"' : ''
        const active_style = active
            ? ' style="background:color-mix(in oklab,var(--primary) 15%,transparent)"'
            : ''
        const page = entry.page
            ? `<span class="mr-2 text-xs text-muted-foreground">(${entry.page})</span>`
            : ''
        return `<li><button type="button" class="w-full rounded px-2 py-1 text-right hover:bg-muted" data-start="${entry.start}"${current_attr}${active_style}><span>${escape_xml(entry.text)}</span>${page}</button>${render_items(children)}</li>`
    }

    preview_toc_html = render_items(tree)
}

const focusable_in = (root: HTMLElement | null) => {
    if (!root) return []
    return Array.from(
        root.querySelectorAll<HTMLElement>(
            'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
    ).filter(
        element =>
            !element.hasAttribute('disabled') &&
            element.getAttribute('aria-hidden') !== 'true' &&
            element.offsetParent !== null,
    )
}

const normalize_selection = (entry: analysis_entry) => {
    if (!entry.selection) return
    const selection = entry.selection
    if (typeof selection.content_id_col_locked !== 'boolean')
        selection.content_id_col_locked = false

    if (!entry.table_names.includes(selection.content_table)) {
        selection.content_table = entry.table_names[0] || ''
    }

    const content_cols = entry.table_meta.get(selection.content_table)?.column_names ?? []
    if (!content_cols.includes(selection.content_text_col))
        selection.content_text_col = content_cols[0] ?? ''
    if (selection.content_id_col && !content_cols.includes(selection.content_id_col)) {
        selection.content_id_col = ''
        selection.content_id_col_locked = false
    }
    if (!selection.content_id_col) selection.content_id_col_locked = false
    if (selection.content_page_col && !content_cols.includes(selection.content_page_col))
        selection.content_page_col = ''
    if (selection.content_part_col && !content_cols.includes(selection.content_part_col))
        selection.content_part_col = ''

    if (selection.toc_table && !entry.table_names.includes(selection.toc_table))
        selection.toc_table = ''

    const toc_cols = selection.toc_table
        ? (entry.table_meta.get(selection.toc_table)?.column_names ?? [])
        : []

    if (selection.toc_text_col && !toc_cols.includes(selection.toc_text_col))
        selection.toc_text_col = ''
    if (selection.toc_start_col && !toc_cols.includes(selection.toc_start_col))
        selection.toc_start_col = ''
    if (selection.toc_level_col && !toc_cols.includes(selection.toc_level_col))
        selection.toc_level_col = ''
}

const update_active_entry = (mutate: (entry: analysis_entry) => void) => {
    if (!active_entry) return
    mutate(active_entry)
    normalize_selection(active_entry)
    analysis_results = [...analysis_results]
}

const effective_title = (entry: analysis_entry) =>
    (
        entry.override_title ||
        entry.title ||
        entry.file_name.replace(/\.(bok|mdb|accdb)$/i, '')
    ).trim()

const effective_author = (entry: analysis_entry) =>
    (entry.override_author || entry.author || '').trim()

const make_unique_filename = (file_name: string, used_names: Set<string>) => {
    if (!used_names.has(file_name)) {
        used_names.add(file_name)
        return file_name
    }

    const dot_index = file_name.lastIndexOf('.')
    const base = dot_index > 0 ? file_name.slice(0, dot_index) : file_name
    const ext = dot_index > 0 ? file_name.slice(dot_index) : ''

    let suffix = 2
    while (used_names.has(`${base} (${suffix})${ext}`)) suffix += 1

    const next = `${base} (${suffix})${ext}`
    used_names.add(next)
    return next
}

const files_signature = (files: File[]) => files.map(file => make_file_key(file)).join('::')

const create_mdb_reader = async (file: File): Promise<mdb_reader> => {
    const {MDBReader} = await load_bok_libs()
    const mdb_reader_class = MDBReader as unknown as new (
        buffer: unknown,
        options?: {password?: string},
    ) => mdb_reader
    const buffer = (globalThis as {Buffer: {from: (value: ArrayBuffer) => unknown}}).Buffer.from(
        await file.arrayBuffer(),
    )
    const password = db_password.trim() || undefined
    return new mdb_reader_class(buffer, password ? {password} : undefined)
}

const refresh_numeric_columns = async (
    entry_key: string,
    content_table: string,
    toc_table: string,
) => {
    const entry = analysis_results.find(item => item.key === entry_key)
    if (!entry || entry.status !== 'ready') {
        content_numeric_columns_state = []
        toc_numeric_columns_state = []
        return
    }

    try {
        const mdb = await create_mdb_reader(entry.file)
        const content_cols = entry.table_meta.get(content_table)?.column_names ?? []
        const toc_cols = toc_table ? (entry.table_meta.get(toc_table)?.column_names ?? []) : []
        const content_preview = content_table ? read_table_preview(mdb, content_table, 80) : []
        const toc_preview = toc_table ? read_table_preview(mdb, toc_table, 120) : []

        const active = active_entry
        if (!active || active.key !== entry_key) return
        if ((active.selection?.content_table || '') !== content_table) return
        if ((active.selection?.toc_table || '') !== toc_table) return

        content_numeric_columns_state = pick_numeric_like_columns(content_preview, content_cols)
        toc_numeric_columns_state = pick_numeric_like_columns(toc_preview, toc_cols)
    } catch (error) {
        push_log(
            `ERR: فشل تحديث الأعمدة الرقمية: ${error instanceof Error ? error.message : String(error)}`,
        )
    }
}

$effect(() => {
    const key = active_entry?.key || ''
    const content_table = active_entry?.selection?.content_table || ''
    const toc_table = active_entry?.selection?.toc_table || ''
    if (!key || !content_table) {
        content_numeric_columns_state = []
        toc_numeric_columns_state = []
        return
    }
    void refresh_numeric_columns(key, content_table, toc_table)
})

const analyze_file = async (file: File, previous?: analysis_entry): Promise<analysis_entry> => {
    try {
        push_log(`Analyze: ${file.name}`)
        const mdb = await create_mdb_reader(file)
        const analyzed = analyze_mdb(
            mdb,
            file.name,
            previous?.override_title || '',
            previous?.override_author || '',
        )

        const entry: analysis_entry = {
            key: make_file_key(file),
            file,
            file_name: file.name,
            status: 'ready',
            error: '',
            title: analyzed.title,
            author: analyzed.author,
            card: analyzed.card,
            tables_count: analyzed.table_names.length,
            content_table: analyzed.selection.content_table,
            selection: previous?.selection ? {...previous.selection} : analyzed.selection,
            table_names: analyzed.table_names,
            table_meta: analyzed.table_meta,
            override_title: previous?.override_title || '',
            override_author: previous?.override_author || '',
            pages_count: previous?.pages_count || 0,
        }

        normalize_selection(entry)
        return entry
    } catch (error) {
        return {
            key: make_file_key(file),
            file,
            file_name: file.name,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            title: previous?.title || '',
            author: previous?.author || '',
            card: previous?.card || '',
            tables_count: 0,
            content_table: '',
            selection: previous?.selection ?? null,
            table_names: [],
            table_meta: new Map(),
            override_title: previous?.override_title || '',
            override_author: previous?.override_author || '',
            pages_count: previous?.pages_count || 0,
        }
    }
}

const on_files_change = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    selected_files = Array.from(target.files ?? [])
    log_lines = [
        '---',
        selected_files.length ? `Selected files: ${selected_files.length}` : 'Ready',
    ]
    reset_messages()
    status_text = selected_files.length ? `${selected_files.length} ملف` : 'جاهز'

    analysis_results = []
    analysis_signature = ''
    active_book_index = -1
    if (preview_open) close_preview()
    if (selected_files.length) {
        set_warn('اضغط "تحليل كل الملفات" للمعاينة المسبقة أو "تحليل الملف المحدد".')
    }
}

const analyze_all_files = async () => {
    if (!selected_files.length) return
    reset_messages()
    set_busy(true, 'تحليل الملفات...')
    analysis_signature = files_signature(selected_files)
    log_lines = ['---']
    let final_status = 'جاهز'
    analysis_results = []
    active_book_index = -1

    for (let index = 0; index < selected_files.length; index += 1) {
        const file = selected_files[index]
        push_log(`[${index + 1}/${selected_files.length}] تحليل ${file.name}`)
        status_text = `تحليل ${index + 1}/${selected_files.length}`
        const entry = await analyze_file(file)
        if (entry.status === 'error')
            push_log(`ERR: ${file.name} -> ${entry.error || 'فشل التحليل'}`)
        analysis_results = [...analysis_results, entry]
        active_book_index = analysis_results.length - 1
    }

    const success_count = analysis_results.filter(entry => entry.status === 'ready').length
    if (success_count) {
        set_ok(
            `تم تحليل ${success_count} من ${analysis_results.length}. استخدم الأسهم أو الجدول للتنقل بين الكتب.`,
        )
        final_status = 'جاهز للتحويل'
    } else {
        set_error('فشل تحليل جميع الملفات')
        final_status = 'خطأ'
    }
    set_busy(false, final_status)
}

const analyze_active_file = async () => {
    if (!selected_files.length) return
    const target_index =
        active_book_index >= 0 && active_book_index < selected_files.length ? active_book_index : 0
    const file = selected_files[target_index]
    if (!file) return

    reset_messages()
    set_busy(true, `تحليل ${file.name}...`)
    log_lines = ['---']
    let final_status = 'جاهز'

    const previous = analysis_results.find(entry => entry.key === make_file_key(file))
    const updated = await analyze_file(file, previous)

    const index_in_results = analysis_results.findIndex(entry => entry.key === updated.key)
    if (index_in_results >= 0) {
        analysis_results[index_in_results] = updated
        analysis_results = [...analysis_results]
        active_book_index = index_in_results
    } else {
        analysis_results = [...analysis_results, updated]
        active_book_index = analysis_results.length - 1
    }

    if (updated.status === 'ready') {
        set_ok(`تم تحليل ${updated.file_name}`)
        final_status = 'جاهز للتحويل'
    } else {
        set_error(updated.error || `فشل تحليل ${updated.file_name}`)
        push_log('ERR', updated.error || `فشل تحليل ${updated.file_name}`)
        final_status = 'خطأ'
    }
    set_busy(false, final_status)
}

const set_active_book = (index: number) => {
    active_book_index = index
    reset_messages()
    const entry = analysis_results[index]
    if (entry?.status === 'error') {
        set_warn(entry.error ? `الملف يحتوي خطأ: ${entry.error}` : 'لا يمكن تحميل هذا الملف')
    }
}

const select_book = (index: number) => {
    set_active_book(index)
}

const go_prev_book = () => {
    if (!analysis_results.length) return
    set_active_book(active_book_index <= 0 ? analysis_results.length - 1 : active_book_index - 1)
}

const go_next_book = () => {
    if (!analysis_results.length) return
    set_active_book(active_book_index >= analysis_results.length - 1 ? 0 : active_book_index + 1)
}

const on_override_title_change = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value
    update_active_entry(entry => {
        entry.override_title = value
    })
}

const on_override_author_change = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value
    update_active_entry(entry => {
        entry.override_author = value
    })
}

const on_content_table_change = async (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    const target_key = active_entry?.key || ''
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.content_table = value
        entry.selection.content_text_col = ''
        entry.selection.content_id_col = ''
        entry.selection.content_id_col_locked = false
        entry.selection.content_page_col = ''
        entry.selection.content_part_col = ''
    })

    if (!value || !target_key) return

    try {
        const entry = analysis_results.find(item => item.key === target_key)
        if (!entry || !entry.selection) return
        const mdb = await create_mdb_reader(entry.file)
        const guessed = guess_content_columns(
            mdb,
            entry.table_meta,
            value,
            entry.selection.toc_table,
            entry.selection.toc_start_col,
        )

        update_active_entry(active => {
            if (!active.selection || active.key !== target_key) return
            if (active.selection.content_table !== value) return
            active.selection.content_text_col = guessed.content_text_col
            active.selection.content_id_col = guessed.content_id_col
            active.selection.content_page_col = guessed.content_page_col
            active.selection.content_part_col = guessed.content_part_col
            active.selection.content_id_col_locked = false
        })
    } catch (error) {
        push_log(
            `ERR: فشل تحديث تخمين أعمدة المحتوى: ${error instanceof Error ? error.message : String(error)}`,
        )
    }
}

const on_content_text_col_change = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.content_text_col = value
    })
}

const on_content_id_col_change = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.content_id_col = value
        entry.selection.content_id_col_locked = true
    })
}

const on_content_page_col_change = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.content_page_col = value
    })
}

const on_content_part_col_change = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.content_part_col = value
    })
}

const on_chunk_size_change = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.chunk_size = value
    })
}

const on_split_numbered_change = (event: Event) => {
    const checked = (event.currentTarget as HTMLInputElement).checked
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.split_numbered = checked
    })
}

const on_toc_table_change = async (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    const target_key = active_entry?.key || ''
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.toc_table = value
        entry.selection.toc_text_col = ''
        entry.selection.toc_start_col = ''
        entry.selection.toc_level_col = ''
    })

    if (!value || !target_key) return

    try {
        const entry = analysis_results.find(item => item.key === target_key)
        if (!entry || !entry.selection) return
        const mdb = await create_mdb_reader(entry.file)
        const guessed = guess_toc_columns(mdb, entry.table_meta, value)
        const guessed_content = !entry.selection.content_id_col_locked
            ? guess_content_columns(
                  mdb,
                  entry.table_meta,
                  entry.selection.content_table,
                  value,
                  guessed.toc_start_col,
              )
            : null

        update_active_entry(active => {
            if (!active.selection || active.key !== target_key) return
            if (active.selection.toc_table !== value) return
            active.selection.toc_text_col = guessed.toc_text_col
            active.selection.toc_start_col = guessed.toc_start_col
            active.selection.toc_level_col = guessed.toc_level_col
            if (!active.selection.content_id_col_locked && guessed_content?.content_id_col) {
                active.selection.content_id_col = guessed_content.content_id_col
            }
        })
    } catch (error) {
        push_log(
            `ERR: فشل تحديث تخمين أعمدة الفهرس: ${error instanceof Error ? error.message : String(error)}`,
        )
    }
}

const on_toc_text_col_change = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.toc_text_col = value
    })
}

const on_toc_start_col_change = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.toc_start_col = value
    })
}

const on_toc_level_col_change = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    update_active_entry(entry => {
        if (!entry.selection) return
        entry.selection.toc_level_col = value
    })
}

const convert_entry_to_outputs = async (
    entry: analysis_entry,
    options: {pdf_mode?: 'blob' | 'download'} = {},
) => {
    if (!entry.selection) throw new Error(`لا توجد إعدادات تحويل للملف ${entry.file_name}`)

    const mdb = await create_mdb_reader(entry.file)
    const payload = await build_book_payload({
        mdb,
        table_meta: entry.table_meta,
        selection: entry.selection,
        title: effective_title(entry),
        author: effective_author(entry),
        card: entry.card,
        include_author_filename,
    })
    entry.pages_count = payload.pages.length
    analysis_results = [...analysis_results]
    status_text = 'بناء EPUB...'
    const epub = await build_epub(payload.info, payload.pages, {include_toc_page})

    let pdf: {
        blob: Blob | null
        filename: string
        download: ((file_name?: string) => Promise<void>) | null
    } | null = null
    let pdf_error = ''
    if (include_pdf) {
        try {
            status_text = 'بناء PDF...'
            pdf = await build_pdf(payload.info, payload.pages, {
                pdf_font,
                mode: options.pdf_mode || 'blob',
                include_author_filename,
                on_progress: (current, total) => {
                    status_text = `بناء PDF... (${current}/${total})`
                },
            })
        } catch (error) {
            pdf_error = error instanceof Error ? error.message : String(error)
            push_log(`ERR: PDF ${entry.file_name} -> ${pdf_error}`)
        }
    }

    let html: {blob: Blob; filename: string} | null = null
    let html_error = ''
    if (include_html) {
        try {
            status_text = 'بناء HTML...'
            html = await build_html(payload.info, payload.pages, {include_author_filename})
        } catch (error) {
            html_error = error instanceof Error ? error.message : String(error)
            push_log(`ERR: HTML ${entry.file_name} -> ${html_error}`)
        }
    }

    return {epub, pdf, pdf_error, html, html_error}
}

const convert_active = async () => {
    if (!active_entry || active_entry.status !== 'ready') return
    reset_messages()
    set_busy(true, `تحويل ${active_entry.file_name}...`)
    let final_status = 'تم'

    try {
        const {epub, pdf, pdf_error, html, html_error} = await convert_entry_to_outputs(
            active_entry,
            {
                pdf_mode: include_pdf ? 'download' : 'blob',
            },
        )
        const platform = await get_platform()
        await platform.downloader.download(epub.blob, epub.filename)
        if (include_pdf && pdf) {
            if (pdf.download) await pdf.download(pdf.filename)
            else if (pdf.blob) await platform.downloader.download(pdf.blob, pdf.filename)
        }
        if (include_html && html) await platform.downloader.download(html.blob, html.filename)

        const outputs = [epub.filename]
        if (include_pdf && pdf?.filename) outputs.push(pdf.filename)
        if (include_html && html?.filename) outputs.push(html.filename)
        const errors = []
        if (include_pdf && pdf_error) errors.push(`PDF: ${pdf_error}`)
        if (include_html && html_error) errors.push(`HTML: ${html_error}`)

        if (errors.length) {
            set_warn(`تم إنشاء ${outputs.join(' + ')} لكن حدث فشل: ${errors.join(' | ')}`)
            status_text = 'تم جزئيًا'
            final_status = 'تم جزئيًا'
        } else {
            set_ok(
                outputs.length > 1
                    ? `تم تنزيل ${outputs.join(' + ')}`
                    : `تم تنزيل ${epub.filename}`,
            )
        }
    } catch (error) {
        set_error(`فشل التحويل: ${error_text(error)}`)
        push_log('ERR', error_stack_text(error))
        final_status = 'خطأ'
    } finally {
        set_busy(false, final_status)
    }
}

const convert_batch = async () => {
    if (selected_files.length < 2) {
        set_warn('اختر ملفين أو أكثر للتحويل الدفعي.')
        return
    }

    reset_messages()
    set_busy(true, download_each_mode ? 'تحويل دفعي (تنزيل مباشر)...' : 'تحويل دفعي...')
    let final_status = 'تم'
    log_lines = ['---']

    try {
        const platform = await get_platform()
        const current_signature = files_signature(selected_files)
        const use_preflight =
            analysis_signature === current_signature &&
            analysis_results.length === selected_files.length
        const items: batch_item[] = use_preflight
            ? analysis_results.map(entry => ({
                  key: entry.key,
                  file: entry.file,
                  file_name: entry.file_name,
                  status: entry.status,
                  error: entry.error,
                  selection: entry.selection ? {...entry.selection} : null,
              }))
            : selected_files.map(file => ({
                  key: make_file_key(file),
                  file,
                  file_name: file.name,
                  status: 'ready' as const,
                  error: '',
                  selection: null,
              }))

        const used_names = new Set<string>()
        const previous_map = new Map(analysis_results.map(entry => [entry.key, entry]))
        let success_count = 0

        if (download_each_mode) {
            let pdf_success_count = 0
            let pdf_error_count = 0
            let html_success_count = 0
            let html_error_count = 0

            for (let index = 0; index < items.length; index += 1) {
                const item = items[index]
                if (item.status === 'error') {
                    push_log(
                        `[${index + 1}/${items.length}] SKIP: ${item.file_name} (خطأ في التحليل)`,
                    )
                    continue
                }
                push_log(`[${index + 1}/${items.length}] ${item.file_name}`)

                const previous = use_preflight ? previous_map.get(item.key) : undefined
                const analyzed = await analyze_file(item.file, previous)
                if (analyzed.status !== 'ready' || !analyzed.selection) {
                    push_log(`ERR: ${item.file_name} -> ${analyzed.error || 'فشل التحليل'}`)
                    continue
                }
                if (item.selection) {
                    analyzed.selection = {...item.selection}
                    normalize_selection(analyzed)
                }

                status_text = `تحويل ${index + 1}/${items.length}`
                const {epub, pdf, pdf_error, html, html_error} = await convert_entry_to_outputs(
                    analyzed,
                    {
                        pdf_mode: include_pdf ? 'download' : 'blob',
                    },
                )
                const epub_name = make_unique_filename(epub.filename, used_names)
                await platform.downloader.download(epub.blob, epub_name)
                push_log(`OK: ${epub_name}`)

                if (include_pdf && pdf) {
                    const pdf_name = make_unique_filename(pdf.filename, used_names)
                    if (pdf.download) await pdf.download(pdf_name)
                    else if (pdf.blob) await platform.downloader.download(pdf.blob, pdf_name)
                    pdf_success_count += 1
                    push_log(`OK: ${pdf_name}`)
                } else if (include_pdf && pdf_error) {
                    pdf_error_count += 1
                    push_log(`ERR: PDF ${item.file_name} -> ${pdf_error}`)
                }

                if (include_html && html) {
                    const html_name = make_unique_filename(html.filename, used_names)
                    await platform.downloader.download(html.blob, html_name)
                    html_success_count += 1
                    push_log(`OK: ${html_name}`)
                } else if (include_html && html_error) {
                    html_error_count += 1
                    push_log(`ERR: HTML ${item.file_name} -> ${html_error}`)
                }

                if (use_preflight) active_book_index = index
                success_count += 1
            }

            if (!success_count) throw new Error('فشل تحويل جميع الملفات')
            const summary = [`تم تنزيل ${success_count} ملف EPUB مباشرة`]
            if (include_pdf) summary.push(`${pdf_success_count} ملف PDF`)
            if (include_html) summary.push(`${html_success_count} ملف HTML`)
            set_ok(summary.join(' و '))
            if (pdf_error_count || html_error_count) status_text = 'تم جزئيًا'
            if (pdf_error_count || html_error_count) final_status = 'تم جزئيًا'
        } else {
            const batch_zip = new JSZip()
            let pdf_success_count = 0
            let pdf_error_count = 0
            let html_success_count = 0
            let html_error_count = 0

            for (let index = 0; index < items.length; index += 1) {
                const item = items[index]
                if (item.status === 'error') {
                    push_log(
                        `[${index + 1}/${items.length}] SKIP: ${item.file_name} (خطأ في التحليل)`,
                    )
                    continue
                }
                push_log(`[${index + 1}/${items.length}] ${item.file_name}`)

                const previous = use_preflight ? previous_map.get(item.key) : undefined
                const analyzed = await analyze_file(item.file, previous)
                if (analyzed.status !== 'ready' || !analyzed.selection) {
                    push_log(`ERR: ${item.file_name} -> ${analyzed.error || 'فشل التحليل'}`)
                    continue
                }
                if (item.selection) {
                    analyzed.selection = {...item.selection}
                    normalize_selection(analyzed)
                }

                status_text = `تجهيز ${index + 1}/${items.length}`
                const {epub, pdf, pdf_error, html, html_error} = await convert_entry_to_outputs(
                    analyzed,
                    {
                        pdf_mode: 'blob',
                    },
                )
                const epub_name = make_unique_filename(epub.filename, used_names)
                batch_zip.file(epub_name, epub.blob)
                push_log(`OK: ${epub_name}`)

                if (include_pdf && pdf) {
                    const pdf_name = make_unique_filename(pdf.filename, used_names)
                    if (pdf.blob) batch_zip.file(pdf_name, pdf.blob)
                    pdf_success_count += 1
                    push_log(`OK: ${pdf_name}`)
                } else if (include_pdf && pdf_error) {
                    pdf_error_count += 1
                    push_log(`ERR: PDF ${item.file_name} -> ${pdf_error}`)
                }

                if (include_html && html) {
                    const html_name = make_unique_filename(html.filename, used_names)
                    batch_zip.file(html_name, html.blob)
                    html_success_count += 1
                    push_log(`OK: ${html_name}`)
                } else if (include_html && html_error) {
                    html_error_count += 1
                    push_log(`ERR: HTML ${item.file_name} -> ${html_error}`)
                }

                if (use_preflight) active_book_index = index
                success_count += 1
            }

            if (!success_count) throw new Error('فشل تحويل جميع الملفات')
            status_text = 'بناء ZIP...'
            const zip_blob = await batch_zip.generateAsync({
                type: 'blob',
                mimeType: 'application/zip',
                compression: 'DEFLATE',
                compressionOptions: {level: 9},
            })

            const stamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19)
            const zip_name = sanitize_filename(`bok-to-epub-batch-${stamp}.zip`)
            await platform.downloader.download(zip_blob, zip_name)
            const summary = [`تم تحويل ${success_count} ملف EPUB`]
            if (include_pdf) summary.push(`${pdf_success_count} ملف PDF`)
            if (include_html) summary.push(`${html_success_count} ملف HTML`)
            set_ok(`${summary.join(' و ')} وتنزيل ${zip_name}`)
            if (pdf_error_count || html_error_count) status_text = 'تم جزئيًا'
            if (pdf_error_count || html_error_count) final_status = 'تم جزئيًا'
        }
    } catch (error) {
        set_error(`فشل التحويل الدفعي: ${error_text(error)}`)
        push_log('ERR', error_stack_text(error))
        final_status = 'خطأ'
    } finally {
        set_busy(false, final_status)
    }
}

const refresh_preview_status = () => {
    if (!preview_reader) {
        preview_status_text = '-'
        preview_toc_status_text = '-'
        return
    }
    const progress = preview_reader.progress()
    const percent = progress.row_count
        ? Math.min(100, Math.round((progress.offset / progress.row_count) * 100))
        : 0
    preview_status_text = progress.done
        ? `تم تحميل ${progress.pages} صفحة (اكتمل)`
        : `تم تحميل ${progress.pages} صفحة... (${percent}%)`
    preview_toc_status_text = progress.done ? 'مكتمل' : `تحميل... (${percent}%)`
    preview_total_pages = progress.pages
    if (progress.done && active_entry && active_entry.pages_count !== progress.pages) {
        active_entry.pages_count = progress.pages
        analysis_results = [...analysis_results]
    }
}

const sync_preview_toc_pages = () => {
    const reader = preview_reader
    if (!reader) return
    preview_toc_items = preview_toc_items.map(item => ({
        ...item,
        page:
            item.start === 0
                ? 1
                : (reader.id_to_page_number.get(item.start) ??
                  reader.page_value_to_page_number.get(item.start) ??
                  item.page),
    }))
    render_preview_toc_html()
}

const ensure_preview_page_loaded = async (target_page: number) => {
    if (!preview_reader) return
    while (preview_reader.pages.length < target_page && !preview_reader.progress().done) {
        await preview_reader.load_more({
            max_pages: Math.max(80, target_page - preview_reader.pages.length),
        })
        sync_preview_toc_pages()
        refresh_preview_status()
    }
}

const show_preview_page = async (target_page: number) => {
    if (!preview_reader) return

    const target = Math.max(1, target_page)
    await ensure_preview_page_loaded(target)

    const max_page = preview_reader.progress().done
        ? preview_reader.pages.length
        : Math.max(preview_reader.pages.length, target)

    const normalized = Math.min(target, Math.max(1, max_page))
    preview_current_page = normalized

    const page = preview_reader.pages[normalized - 1]
    preview_html = page?.text_html
        ? page.text_html
        : '<div class="text-sm text-muted-foreground">لا توجد صفحة بهذا الرقم</div>'
    preview_total_pages = preview_reader.pages.length
}

const open_preview = async () => {
    if (!active_entry || active_entry.status !== 'ready' || !active_entry.selection) return
    reset_messages()
    set_busy(true, 'تجهيز الاستعراض...')
    let final_status = 'جاهز'

    try {
        const mdb = await create_mdb_reader(active_entry.file)
        const raw_toc = parse_raw_toc(mdb, active_entry.selection) ?? []
        preview_reader = create_pages_reader(
            mdb,
            active_entry.table_meta,
            active_entry.selection,
            raw_toc,
        )
        preview_toc_items = raw_toc.map(item => ({
            start: item.start,
            text: item.text,
            page: item.start === 0 ? 1 : null,
            level: item.level,
        }))
        preview_title = `${effective_title(active_entry)}${effective_author(active_entry) ? ` - ${effective_author(active_entry)}` : ''}`
        preview_active_start = null
        render_preview_toc_html()

        preview_last_focus = document.activeElement as HTMLElement | null
        preview_prev_overflow = document.documentElement.style.overflow
        preview_open = true
        document.documentElement.style.overflow = 'hidden'
        if (preview_wrap) {
            preview_wrap.setAttribute('aria-hidden', 'true')
            if ('inert' in preview_wrap)
                (preview_wrap as HTMLElement & {inert: boolean}).inert = true
        }
        await tick()
        const close_button = preview_modal_panel?.querySelector<HTMLElement>('[data-preview-close]')
        close_button?.focus?.()
        if (!close_button) preview_modal_panel?.focus?.()
        preview_html = '<div class="text-sm text-muted-foreground">تحميل...</div>'
        await preview_reader.load_more({max_pages: 80})
        sync_preview_toc_pages()
        refresh_preview_status()
        await show_preview_page(1)
    } catch (error) {
        set_error(`فشل الاستعراض: ${error_text(error)}`)
        push_log('ERR', error_stack_text(error))
        final_status = 'خطأ'
    } finally {
        set_busy(false, final_status)
    }
}

const close_preview = () => {
    preview_open = false
    document.documentElement.style.overflow = preview_prev_overflow || ''
    if (preview_wrap) {
        preview_wrap.removeAttribute('aria-hidden')
        if ('inert' in preview_wrap) (preview_wrap as HTMLElement & {inert: boolean}).inert = false
    }
    preview_reader = null
    preview_toc_items = []
    preview_toc_html = ''
    preview_html = '<div class="text-sm text-muted-foreground">لا توجد صفحة</div>'
    preview_title = '-'
    preview_active_start = null
    preview_current_page = 1
    preview_total_pages = 0
    preview_status_text = '-'
    preview_toc_status_text = '-'

    const last_focus = preview_last_focus
    preview_last_focus = null
    queueMicrotask(() => {
        if (last_focus && document.contains(last_focus)) last_focus.focus?.()
    })
}

const preview_load_more = async () => {
    if (!preview_reader) return
    await preview_reader.load_more({max_pages: 200})
    sync_preview_toc_pages()
    refresh_preview_status()
    await show_preview_page(preview_current_page)
}

const preview_prev_page = async () => {
    await show_preview_page(preview_current_page - 1)
}

const preview_next_page = async () => {
    await show_preview_page(preview_current_page + 1)
}

const preview_jump_to_toc = async (start: number) => {
    if (!preview_reader) return

    const resolve_target = () =>
        start === 0
            ? 1
            : (preview_reader?.id_to_page_number.get(start) ??
              preview_reader?.page_value_to_page_number.get(start) ??
              null)

    let target_page = resolve_target()
    while (!target_page && !preview_reader.progress().done) {
        if (preview_reader.has_id_col) {
            await preview_reader.load_more({max_pages: 200, until_id: start})
        } else if (preview_reader.has_page_col) {
            await preview_reader.load_more({max_pages: 200, until_page: start})
        } else {
            await preview_reader.load_more({max_pages: 200})
        }
        sync_preview_toc_pages()
        refresh_preview_status()
        target_page = resolve_target()
    }

    if (!target_page) {
        preview_status_text =
            preview_reader.has_id_col || preview_reader.has_page_col
                ? 'لم يتم العثور على هذا الموضع.'
                : 'لا يمكن الانتقال: اختر عمود المعرّف أو عمود الصفحة في جدول المحتوى.'
        return
    }

    preview_active_start = start
    render_preview_toc_html()
    await show_preview_page(target_page)
}

const on_preview_page_keydown = async (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const value = Number((event.currentTarget as HTMLInputElement).value)
    if (!Number.isFinite(value) || value <= 0) return
    await show_preview_page(Math.floor(value))
}

const on_preview_page_change = async (event: Event) => {
    const value = Number((event.currentTarget as HTMLInputElement).value)
    if (!Number.isFinite(value) || value <= 0) return
    await show_preview_page(Math.floor(value))
}

const on_preview_backdrop_click = (event: MouseEvent) => {
    if (event.target === event.currentTarget) close_preview()
}

const on_preview_overlay_keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close_preview()
        return
    }

    if (event.key !== 'Tab') return

    const items = focusable_in(preview_modal_panel)
    if (!items.length) {
        event.preventDefault()
        return
    }

    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
        return
    }
    if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
    }
}

const on_preview_toc_keydown = (event: KeyboardEvent) => {
    if (!preview_open) return
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    const root = event.currentTarget as HTMLElement
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-start]'))
    if (!buttons.length) return

    const active = document.activeElement as HTMLElement | null
    const index = active ? buttons.indexOf(active as HTMLButtonElement) : -1
    const next =
        event.key === 'ArrowDown'
            ? buttons[Math.min(buttons.length - 1, index < 0 ? 0 : index + 1)]
            : buttons[Math.max(0, index < 0 ? 0 : index - 1)]
    if (!next) return

    event.preventDefault()
    next.focus()
}

const on_preview_toc_click = async (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest?.('button[data-start]') as HTMLButtonElement | null
    if (!button) return

    event.preventDefault()
    const start = Number(button.dataset.start)
    if (!Number.isFinite(start)) return
    await preview_jump_to_toc(start)
}

const on_preview_window_keydown = async (event: KeyboardEvent) => {
    if (!preview_open) return

    if (event.key === 'Escape') {
        event.preventDefault()
        close_preview()
        return
    }

    const target = event.target as HTMLElement | null
    const tag = (target?.tagName ?? '').toLowerCase()
    const is_typing =
        tag === 'input' || tag === 'textarea' || tag === 'select' || !!target?.isContentEditable
    if (is_typing || !preview_reader) return

    const in_scroll_pane = !!target?.closest?.('[data-preview-scroll], [data-preview-toc]')
    const nav_mod = event.altKey || event.ctrlKey || event.metaKey
    if (in_scroll_pane && !nav_mod) return

    const delta = event.key === 'PageUp' ? -1 : event.key === 'PageDown' ? 1 : 0
    if (delta) {
        event.preventDefault()
        await show_preview_page(Math.max(1, preview_current_page + delta))
        return
    }

    if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        await show_preview_page(event.key === 'Home' ? 1 : preview_reader.pages.length || 1)
    }
}
</script>

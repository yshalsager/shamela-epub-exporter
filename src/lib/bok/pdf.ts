import type {BookInfo, BookPage} from '@/lib/shamela/types'

import {make_output_filename} from './pages'

type pdf_font_name = 'Cairo' | 'AmiriQuran'

type pdf_options = {
    pdf_font: pdf_font_name
    timeout_ms?: number
    mode?: 'blob' | 'download'
    include_author_filename?: boolean
    on_progress?: (current: number, total: number) => void | Promise<void>
}

type pdf_doc = {
    filename: string
    doc_definition: Record<string, unknown>
}

type pdfmake_api = {
    createPdf: (doc_definition: Record<string, unknown>) => {
        getBlob: (callback: (blob: Blob) => void) => void
        download?: (default_file_name?: string, callback?: () => void) => void
    }
    addFonts?: (fonts: unknown) => void
    addVirtualFileSystem?: (vfs: unknown) => void
    addFontContainer?: (container: unknown) => void
    fonts?: Record<string, unknown>
}

const PDF_BLOB_TIMEOUT_MS = 600000
const AMIRI_QURAN_TTF_URL =
    'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiriquran/AmiriQuran-Regular.ttf'

let pdfmake_instance: pdfmake_api | null = null
let amiri_quran_loaded = false

type pdf_block = {
    text: string
    style: 'paragraph' | 'section_heading'
}

const get_global = () =>
    globalThis as unknown as {
        pdfMake?: pdfmake_api
        pdfmake?: pdfmake_api
        Cairo?: unknown
        cairo?: unknown
    }

const load_pdf_libs = async () => {
    if (pdfmake_instance?.createPdf) return pdfmake_instance

    await import('pdfmake-rtl/build/pdfmake.min.js')
    await import('pdfmake-rtl/build/vfs_fonts.js')
    await import('pdfmake-rtl/build/fonts/Cairo.js')

    const libs = get_global()
    const api = libs.pdfMake ?? libs.pdfmake
    if (!api?.createPdf) throw new Error('تعذر تهيئة مكتبات PDF')

    const cairo = libs.Cairo ?? libs.cairo
    if (cairo && api.addFonts) api.addFonts(cairo)

    pdfmake_instance = api
    return api
}

const array_buffer_to_base64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const step = 0x8000
    for (let index = 0; index < bytes.length; index += step) {
        binary += String.fromCharCode(...bytes.subarray(index, index + step))
    }
    return btoa(binary)
}

const load_amiri_quran_font = async (api: pdfmake_api) => {
    if (amiri_quran_loaded) return

    const response = await fetch(AMIRI_QURAN_TTF_URL)
    if (!response.ok) throw new Error('فشل تحميل خط AmiriQuran')
    const buffer = await response.arrayBuffer()
    const vfs = {'AmiriQuran-Regular.ttf': array_buffer_to_base64(buffer)}
    const fonts = {
        AmiriQuran: {
            normal: 'AmiriQuran-Regular.ttf',
            bold: 'AmiriQuran-Regular.ttf',
            italics: 'AmiriQuran-Regular.ttf',
            bolditalics: 'AmiriQuran-Regular.ttf',
        },
    }

    if (api.addFontContainer) api.addFontContainer({vfs, fonts})
    else {
        if (api.addVirtualFileSystem) api.addVirtualFileSystem(vfs)
        if (api.addFonts) api.addFonts(fonts)
    }

    amiri_quran_loaded = true
}

const normalize_block_text = (value: string) =>
    String(value ?? '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r/g, '')
        .replace(/[ \t\f\v]+/g, ' ')
        .replace(/ *\n+ */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

const html_to_pdf_blocks = (text_html: string): pdf_block[] => {
    const raw = String(text_html ?? '')
        .replaceAll('\0', '')
        .trim()
    if (!raw) return []

    if (typeof document === 'undefined') {
        const fallback = normalize_block_text(
            raw
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|blockquote)>/gi, '\n')
                .replace(/<[^>]+>/g, ' '),
        )
        return fallback ? [{text: fallback, style: 'paragraph'}] : []
    }

    const container = document.createElement('div')
    container.innerHTML = raw
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|blockquote)>/gi, '\n')
    container.querySelectorAll('script,style').forEach(node => node.remove())

    const blocks: pdf_block[] = []

    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = normalize_block_text(node.textContent ?? '')
            if (text) blocks.push({text, style: 'paragraph'})
            return
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return
        const element = node as HTMLElement
        const tag = String(element.tagName ?? '').toLowerCase()
        const text = normalize_block_text(element.textContent ?? '')
        if (!text) return

        if (/^h[1-6]$/.test(tag)) {
            blocks.push({text, style: 'section_heading'})
            return
        }

        const has_block_children = !!element.querySelector?.(
            'p,div,li,blockquote,h1,h2,h3,h4,h5,h6',
        )
        if (has_block_children) {
            Array.from(element.childNodes ?? []).forEach(walk)
            return
        }

        if (/^(p|div|li|blockquote)$/.test(tag)) {
            blocks.push({text, style: 'paragraph'})
            return
        }

        Array.from(element.childNodes ?? []).forEach(walk)
    }

    Array.from(container.childNodes ?? []).forEach(walk)
    if (blocks.length) return blocks

    const fallback = normalize_block_text(container.textContent ?? '')
    return fallback ? [{text: fallback, style: 'paragraph'}] : []
}

const compact_pdf_text = (text: string) =>
    String(text ?? '')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

const get_pdf_font_name = (api: pdfmake_api, preferred_font: pdf_font_name) => {
    const fonts = Object.keys(api.fonts ?? {})
    if (preferred_font && fonts.includes(preferred_font)) return preferred_font
    if (fonts.includes('Cairo')) return 'Cairo'
    return fonts[0] ?? 'Cairo'
}

const build_pdf_doc = async (
    api: pdfmake_api,
    info: BookInfo,
    pages: BookPage[],
    options: pdf_options,
): Promise<pdf_doc> => {
    const title = info.title || `الشاملة ${info.id ?? 0}`
    const author = info.author || ''
    const filename = make_output_filename(title, author, 'pdf', !!options.include_author_filename)

    if (options.pdf_font === 'AmiriQuran') {
        try {
            await load_amiri_quran_font(api)
        } catch {
            // fallback font below
        }
    }

    const pdf_font = get_pdf_font_name(api, options.pdf_font)
    const sorted_pages = [...pages].sort((first, second) => first.page_number - second.page_number)
    const total_pages = sorted_pages.length
    const source_groups: Array<{
        key: string
        part: number | null
        page: number
        blocks: pdf_block[]
    }> = []

    for (let index = 0; index < sorted_pages.length; index += 1) {
        const entry = sorted_pages[index]
        const has_source_page = typeof entry.page === 'number' && entry.page > 0
        const key = has_source_page
            ? `${entry.part ?? ''}|${entry.page}`
            : `generated_${entry.page_number}`
        const current = source_groups[source_groups.length - 1]
        if (!current || current.key !== key) {
            source_groups.push({
                key,
                part: typeof entry.part === 'number' ? entry.part : null,
                page: entry.page,
                blocks: [],
            })
        }
        const blocks = html_to_pdf_blocks(entry.text_html)
        if (blocks.length) source_groups[source_groups.length - 1].blocks.push(...blocks)
        if (index % 25 === 0) {
            if (options.on_progress) {
                await Promise.resolve(
                    options.on_progress(Math.min(index + 1, total_pages), total_pages),
                )
            }
            await new Promise(resolve => setTimeout(resolve, 0))
        }
    }

    const content: Array<Record<string, unknown>> = [{text: title, style: 'title'}]
    if (author) content.push({text: `المؤلف: ${author}`, style: 'author'})
    if (source_groups.length) content.push({text: '', margin: [0, 0, 0, 8], pageBreak: 'after'})

    source_groups.forEach((group, index) => {
        const meta = [
            group.part != null ? `الجزء: ${group.part}` : null,
            group.page ? `الصفحة: ${group.page}` : null,
        ]
            .filter(Boolean)
            .join(' - ')
        if (meta) content.push({text: meta, style: 'page_meta'})
        if (group.blocks.length) {
            group.blocks.forEach(block => {
                const text = compact_pdf_text(block.text)
                if (text) content.push({text, style: block.style})
            })
        } else {
            content.push({text: ' ', style: 'paragraph'})
        }
        if (index < source_groups.length - 1) content.push({text: '', pageBreak: 'after'})
    })

    const doc_definition = {
        info: {
            title,
            author,
            producer: 'Shamela (.bok)',
            creator: 'Shamela (.bok) browser converter',
        },
        rtl: true,
        pageSize: 'A4',
        pageMargins: [36, 42, 36, 42],
        defaultStyle: {
            font: pdf_font,
            alignment: 'right',
            fontSize: 13,
            lineHeight: 1.2,
        },
        styles: {
            title: {fontSize: 20, bold: true, alignment: 'center', margin: [0, 0, 0, 10]},
            author: {fontSize: 13, alignment: 'center', margin: [0, 0, 0, 12]},
            page_meta: {fontSize: 10, color: '#4b5563', margin: [0, 0, 0, 8]},
            section_heading: {fontSize: 15, bold: true, margin: [0, 4, 0, 4]},
            paragraph: {margin: [0, 0, 0, 2]},
        },
        content,
    }

    return {filename, doc_definition}
}

const build_pdf_blob = async (api: pdfmake_api, doc: pdf_doc, timeout_ms = PDF_BLOB_TIMEOUT_MS) =>
    await new Promise<Blob>((resolve, reject) => {
        let finished = false
        let timeout_id: ReturnType<typeof setTimeout> | null = null

        const resolve_once = (blob: Blob) => {
            if (finished) return
            finished = true
            if (timeout_id) clearTimeout(timeout_id)
            resolve(blob)
        }

        const reject_once = (error: Error) => {
            if (finished) return
            finished = true
            if (timeout_id) clearTimeout(timeout_id)
            reject(error)
        }

        if (timeout_ms > 0) {
            timeout_id = setTimeout(() => {
                if (finished) return
                finished = true
                reject(new Error('انتهت مهلة إنشاء PDF. جرّب ملفًا أصغر أو عطّل PDF لهذا التحويل.'))
            }, timeout_ms)
        }

        try {
            api.createPdf(doc.doc_definition).getBlob(blob => resolve_once(blob))
        } catch (error) {
            reject_once(error instanceof Error ? error : new Error(String(error)))
        }
    })

const download_pdf_doc = async (
    api: pdfmake_api,
    doc: pdf_doc,
    file_name = doc.filename,
    timeout_ms = PDF_BLOB_TIMEOUT_MS,
) =>
    await new Promise<void>((resolve, reject) => {
        let finished = false
        let timeout_id: ReturnType<typeof setTimeout> | null = null

        const resolve_once = () => {
            if (finished) return
            finished = true
            if (timeout_id) clearTimeout(timeout_id)
            resolve()
        }

        const reject_once = (error: Error) => {
            if (finished) return
            finished = true
            if (timeout_id) clearTimeout(timeout_id)
            reject(error)
        }

        if (timeout_ms > 0) {
            timeout_id = setTimeout(() => {
                if (finished) return
                finished = true
                reject(
                    new Error(
                        'انتهت مهلة تنزيل PDF مباشرة. جرّب التنزيل بصيغة ZIP أو عطّل PDF لهذا التحويل.',
                    ),
                )
            }, timeout_ms)
        }

        try {
            const pdf = api.createPdf(doc.doc_definition)
            if (!pdf.download) {
                reject_once(new Error('تنزيل PDF المباشر غير مدعوم في هذا البيئة'))
                return
            }
            if (pdf.download.length >= 2) pdf.download(file_name, () => resolve_once())
            else {
                pdf.download(file_name)
                resolve_once()
            }
        } catch (error) {
            reject_once(error instanceof Error ? error : new Error(String(error)))
        }
    })

export const build_pdf = async (info: BookInfo, pages: BookPage[], options: pdf_options) => {
    const api = await load_pdf_libs()
    const doc = await build_pdf_doc(api, info, pages, options)
    if (options.mode === 'download') {
        return {
            filename: doc.filename,
            blob: null as Blob | null,
            download: (file_name?: string) =>
                download_pdf_doc(api, doc, file_name ?? doc.filename, options.timeout_ms),
        }
    }
    const blob = await build_pdf_blob(api, doc, options.timeout_ms)
    return {filename: doc.filename, blob, download: null as null}
}

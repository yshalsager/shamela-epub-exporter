import {describe, expect, it} from 'vitest'

import {build_html} from '@/lib/bok/html'
import type {BookInfo, BookPage} from '@/lib/shamela/types'

describe('bok html', () => {
    it('builds html output with toc and pages', async () => {
        const info: BookInfo = {
            id: 0,
            url: '',
            title: 'كتاب تجريبي',
            author: 'مؤلف',
            about: '<div><p>بطاقة الكتاب</p></div>',
            toc: [{page: 1, text: 'مقدمة', anchor: 'toc_1'}],
        }

        const pages: BookPage[] = [
            {
                page_number: 1,
                page: 1,
                text_html: '<div><a id="toc_1"></a><p>نص الصفحة</p></div>',
            },
        ]

        const output = await build_html(info, pages, {include_author_filename: true})
        const html = await output.blob.text()

        expect(output.filename).toBe('كتاب تجريبي - مؤلف.html')
        expect(html).toContain('فهرس الموضوعات')
        expect(html).toContain('href="#toc_1"')
        expect(html).toContain('id="p1"')
        expect(html).toContain('بطاقة الكتاب')
        expect(html).toContain('نص الصفحة')
    })
})

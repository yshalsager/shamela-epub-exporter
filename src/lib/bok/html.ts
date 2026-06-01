import type {BookInfo, BookPage, TocItem, TocTree} from '@/lib/shamela/types'

import {escape_xml, make_output_filename, sanitize_html_for_xhtml} from './pages'

type html_options = {
    include_author_filename?: boolean
}

const BASE_CSS = `
*{direction: rtl}
body{line-height:1.7;margin:1.5rem;color:#1f1f1f}
.text-center,h1,h2,h3{text-align:center}
`.trim()

const render_html_nav_items = (toc: TocTree) => {
    const render_item = (item: TocItem | [TocItem, TocTree]): string => {
        if (Array.isArray(item)) {
            const [entry, children] = item
            const href = entry.anchor ? `#${entry.anchor}` : `#p${entry.page}`
            return `<li><a href="${href}">${escape_xml(entry.text)}</a>${render_list(children)}</li>`
        }

        const href = item.anchor ? `#${item.anchor}` : `#p${item.page}`
        return `<li><a href="${href}">${escape_xml(item.text)}</a></li>`
    }

    const render_list = (items: TocTree): string =>
        items?.length ? `<ol>${items.map(render_item).join('')}</ol>` : ''

    return render_list(toc)
}

export const build_html = async (info: BookInfo, pages: BookPage[], options: html_options = {}) => {
    const title = info.title || `الشاملة ${info.id ?? 0}`
    const author = info.author || ''
    const filename = make_output_filename(title, author, 'html', !!options.include_author_filename)
    const sorted_pages = [...pages].sort((first, second) => first.page_number - second.page_number)
    const toc_source: TocTree = info.toc?.length
        ? info.toc
        : sorted_pages.map(page => ({page: page.page_number, text: `صفحة ${page.page_number}`}))
    const toc_html = render_html_nav_items(toc_source)
    const info_html = sanitize_html_for_xhtml(info.about ?? '')
    const pages_html = sorted_pages
        .map(
            page =>
                `<section id="p${page.page_number}" class="page_block">${page.text_html}</section>`,
        )
        .join('\n')

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escape_xml(title)}</title>
    <style>
${BASE_CSS}
body{font-family:"Noto Naskh Arabic","Amiri","Scheherazade New",serif}
body{max-width:980px;margin:0 auto;padding:24px 18px;background:#fff}
.top{margin-bottom:20px}
.toc{margin:18px 0 24px;padding:12px 14px;border:1px solid #ddd;border-radius:12px;background:#fafafa}
.toc h2{margin:0 0 10px}
.toc ol{margin:0;padding:0 22px 0 0}
.toc li{margin:6px 0}
.toc a{text-decoration:none}
.toc a:hover{text-decoration:underline}
.content{display:grid;gap:14px}
.page_block{padding:14px 12px;border:1px solid #eee;border-radius:12px;background:#fff}
    </style>
  </head>
  <body>
    <section class="top">${info_html}</section>
    <nav class="toc">
      <h2>فهرس الموضوعات</h2>
      ${toc_html || '<ol><li>لا يوجد فهرس</li></ol>'}
    </nav>
    <main class="content">${pages_html}</main>
  </body>
</html>
`

    const blob = new Blob([html], {type: 'text/html;charset=utf-8'})
    return {blob, filename}
}

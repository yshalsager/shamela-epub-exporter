import JSZip from 'jszip'
import type { BookInfo, BookPage, JobOptions, TocBranch, TocItem, TocTree } from './types'

const HAMESH_CONTINUATION_PATTERN = /(?<=>)(=.+?)(?=<br>|<\/p>)/s
const HAMESH_PATTERN = /(\([\u0660-\u0669]+\))(.+?)(?:<\/?br\/?>(?=\([\u0660-\u0669]+\))|<\/p>)/gs
const ARABIC_NUMBER_BETWEEN_BRACKETS_PATTERN = /\([\u0660-\u0669]+\)/g
const ARABIC_NUMBER_BETWEEN_CURLY_BRACES_PATTERN = /{.+?\([\u0660-\u0669]+\).+?}/
const AYAH_PATTERN = /﴿[\s\S]+?﴾/g
const TITLE_PATTERN = /<p><span class="([^"]*)">\[[^\]]*\]<\/span><\/p>/
const CSS_STYLE_COLOR_PATTERN = /style="(color:#[\w\d]{6})"/g
const SPECIAL_CHARACTERS: Record<string, string> = {
  '﵀': 'رحمه الله',
  '﵏': 'رحمهم الله',
  '﷿': 'عز وجل',
  '﵊': 'عليه الصلاة والسلام',
  '﵄': 'رضي الله عنهما',
  '﵃': 'رضي الله عنهم',
  '﵅': 'رضي الله عنهن',
  '﵂': 'رضي الله عنها',
  '﵁': 'رضي الله عنه',
  '﷾': 'سبحانه وتعالى',
  '﵎': 'تبارك وتعالى',
  '﵇': 'عليه السلام',
  '﵍': 'عليها السلام',
  '﵈': 'عليهم السلام',
  '﵉': 'عليهما السلام',
  '﵌': 'صلى الله عليه وآله وسلم',
}
const SPECIAL_CHARACTERS_PATTERN = new RegExp(Object.keys(SPECIAL_CHARACTERS).join('|'), 'g')

const EPUB_NS = 'http://www.idpf.org/2007/ops'

const BASE_CSS = `
*{direction: rtl}
body{font-family: 'Noto Naskh Arabic','Amiri',serif;line-height:1.7;margin:1.5rem;color:#1f1f1f}
.text-center,h1,h2,h3{text-align:center}
`

const HAMESH_CSS = `
.hamesh{font-size:smaller}
.fn{font-size:x-small;vertical-align:super;color:inherit}
.nu{text-decoration:none}
.hamesh .nu{color:#008000}
aside[type=footnote]{-cr-hint: non-linear-combining}
`

const escape_xml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const sanitize_filename = (value: string) =>
  value
    .replace(/[\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

const page_file_name = (page_number: number) => `text/page_${page_number}.xhtml`

const create_footnote_link = (footnote_count: number, number: string) =>
  `<a href="#fn${footnote_count}" epub:type="noteref" role="doc-noteref" id="fnref${footnote_count}" class="fn nu">${number}</a>`

const get_hamesh_items = (hamesh_html: string[]) => {
  const items = new Map<number, string>()
  let counter = 0

  hamesh_html.forEach((html) => {
    let current = html
    const continuation_match = current.match(HAMESH_CONTINUATION_PATTERN)
    if (continuation_match) {
      const continuation_text = continuation_match[1]
      const continuation = `<aside id="fn0" epub:type="footnote"><span>${continuation_text.trim()}</span></aside>`
      items.set(0, continuation)
      current = current.replace(continuation_text, '')
    }

    for (const match of current.matchAll(HAMESH_PATTERN)) {
      counter += 1
      const number = match[1]
      const content = match[2].trim()
      const aside = `<aside id="fn${counter}" epub:type="footnote"><a href="#fnref${counter}" class="nu">${number}</a><span> ${content}</span></aside>`
      items.set(counter, aside)
    }
  })

  return items
}

const is_ayah_match = (text: string, match_index: number, number: string) => {
  const aya_match = text.match(ARABIC_NUMBER_BETWEEN_CURLY_BRACES_PATTERN)
  if (!aya_match || aya_match.index == null) return false
  return aya_match[0].includes(number) && match_index > aya_match.index
}

const update_hamesh_html = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = doc.body.firstElementChild ?? doc.body
  const hamesh_elements = Array.from(root.querySelectorAll('.hamesh'))
  if (!hamesh_elements.length) return html

  const hamesh_items = get_hamesh_items(hamesh_elements.map((el) => el.innerHTML))
  const new_hamesh = doc.createElement('div')
  new_hamesh.className = 'hamesh'

  const continuation = hamesh_items.get(0)
  if (continuation) {
    new_hamesh.insertAdjacentHTML('beforeend', continuation)
    hamesh_items.delete(0)
  }

  const paragraphs = Array.from(root.querySelectorAll('p:not(.hamesh)'))
  let footnote_count = 1

  paragraphs.forEach((paragraph) => {
    let paragraph_html = paragraph.innerHTML
    const ayah_matches = Array.from(paragraph_html.matchAll(AYAH_PATTERN))
    const placeholders: Array<{ key: string; value: string }> = []

    if (ayah_matches.length) {
      ayah_matches.forEach((match, index) => {
        const key = `PLACEHOLDER_${index + 1}`
        placeholders.push({ key, value: match[0] })
        paragraph_html = paragraph_html.replace(match[0], key)
      })
    }

    const replacements: Array<{ start: number; end: number; replacement: string }> = []
    for (const match of paragraph_html.matchAll(ARABIC_NUMBER_BETWEEN_BRACKETS_PATTERN)) {
      const number = match[0]
      const index = match.index ?? -1
      if (index < 0) continue
      if (!hamesh_items.get(footnote_count)) continue
      if (is_ayah_match(paragraph_html, index, number)) continue
      replacements.push({
        start: index,
        end: index + number.length,
        replacement: create_footnote_link(footnote_count, number),
      })
      new_hamesh.insertAdjacentHTML('beforeend', hamesh_items.get(footnote_count) as string)
      footnote_count += 1
    }

    if (!replacements.length) return

    let updated = paragraph_html
    replacements
      .sort((a, b) => b.start - a.start)
      .forEach(({ start, end, replacement }) => {
        updated = updated.slice(0, start) + replacement + updated.slice(end)
      })

    placeholders.forEach((placeholder) => {
      updated = updated.replace(placeholder.key, placeholder.value)
    })

    paragraph.innerHTML = updated
  })

  const first_hamesh = hamesh_elements[0]
  hamesh_elements.slice(1).forEach((el) => el.remove())
  first_hamesh.replaceWith(new_hamesh)

  return root.outerHTML
}

const replace_color_styles_with_class = (
  html: string,
  color_styles_map: Map<string, string>,
  color_css: { value: string }
) =>
  html.replace(CSS_STYLE_COLOR_PATTERN, (_, style: string) => {
    let color_class = color_styles_map.get(style)
    if (!color_class) {
      color_class = `color-${color_styles_map.size + 1}`
      color_styles_map.set(style, color_class)
      color_css.value += `\n.${color_class} { ${style}; }`
    }
    return `class="${color_class}"`
  })

const replace_special_characters = (html: string) =>
  html.replace(SPECIAL_CHARACTERS_PATTERN, (match) => SPECIAL_CHARACTERS[match] ?? match)

const create_toc_depth_map = (toc: TocTree, depth_map: Record<string, number> = {}, depth = 1) => {
  toc.forEach((item) => {
    if (Array.isArray(item)) {
      const [entry, children] = item
      depth_map[entry.text] = Math.max(2, Math.min(depth, 6))
      create_toc_depth_map(children, depth_map, depth + 1)
      return
    }
    depth_map[item.text] = Math.max(2, Math.min(depth, 6))
  })
  return depth_map
}

const replace_titles_with_headers = (
  chapters_in_page: string[],
  text: string,
  toc_depth_map: Record<string, number>
) => {
  let updated = text
  chapters_in_page.forEach((title) => {
    if (!updated.includes(`[${title}]`)) return
    const match = updated.match(TITLE_PATTERN)
    if (!match) return
    const color_class = match[1]
    const depth = Math.max(2, Math.min(toc_depth_map[title] ?? 2, 6))
    updated = updated.replace(
      `<p><span class="${color_class}">[${title}]</span></p>`,
      `<h${depth} class="${color_class}">${title}</h${depth}>`
    )
  })
  return updated
}

const get_page_volume = (volumes: Record<string, [number, number]> | undefined, page: number) => {
  if (!volumes) return { index: 1, name: '' }
  const entries = Object.entries(volumes)
  for (let index = 0; index < entries.length; index += 1) {
    const [name, range] = entries[index]
    if (range[0] <= page && page <= range[1]) return { index, name }
  }
  return { index: 1, name: '' }
}

const render_nav_items = (toc: TocTree, page_map: Map<number, string>): string => {
  const render_item = (item: TocItem | TocBranch) => {
    if (Array.isArray(item)) {
      const [entry, children] = item
      const href = page_map.get(entry.page) ?? page_file_name(entry.page)
      return `<li><a href="${href}">${escape_xml(entry.text)}</a>${render_list(children)}</li>`
    }
    const href = page_map.get(item.page) ?? page_file_name(item.page)
    return `<li><a href="${href}">${escape_xml(item.text)}</a></li>`
  }

  const render_list = (items: TocTree) => {
    if (!items.length) return ''
    return `<ol>${items.map(render_item).join('')}</ol>`
  }

  return render_list(toc)
}

const render_ncx_items = (toc: TocTree, page_map: Map<number, string>) => {
  let sep_index = 0
  const render_item = (item: TocItem | TocBranch): string => {
    if (Array.isArray(item)) {
      const [entry, children] = item
      const href = page_map.get(entry.page) ?? page_file_name(entry.page)
      const id = `sep_${sep_index}`
      sep_index += 1
      return `<navPoint id="${id}"><navLabel><text>${escape_xml(entry.text)}</text></navLabel><content src="${href}"/>${children
        .map(render_item)
        .join('')}</navPoint>`
    }
    const href = page_map.get(item.page) ?? page_file_name(item.page)
    const base = href.split('/').pop() ?? ''
    const id = base.replace('.xhtml', '') || `page_${item.page}`
    return `<navPoint id="${id}"><navLabel><text>${escape_xml(item.text)}</text></navLabel><content src="${href}"/></navPoint>`
  }

  return toc.map(render_item).join('')
}

const render_nav_pages = (pages: BookPage[], page_map: Map<number, string>) => {
  const items = pages
    .map((page) => {
      const href = page_map.get(page.page_number) ?? page_file_name(page.page_number)
      return `<li><a href="${href}">صفحة ${page.page}</a></li>`
    })
    .join('')
  return `<ol>${items}</ol>`
}

const render_page = (page: BookPage, title: string) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>${escape_xml(title)}</title>
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    ${page.text_html}
  </body>
</html>
`

export const build_epub = async (info: BookInfo, pages: BookPage[], options: JobOptions = {}) => {
  const zip = new JSZip()
  const title = info.title || `الشاملة ${info.id}`
  const author = info.author || ''
  const identifier = `urn:shamela:${info.id}`
  const filename = sanitize_filename(`${title}${author ? ` - ${author}` : ''} - (${info.id}).epub`)

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
`
  )

  const sorted_pages = [...pages].sort((a, b) => a.page_number - b.page_number)
  const zfill_length = String(sorted_pages[sorted_pages.length - 1]?.page_number ?? 0).length + 1
  const color_styles_map = new Map<string, string>()
  const color_css = { value: '' }
  const toc_depth_map = info.toc ? create_toc_depth_map(info.toc) : {}

  const page_entries = sorted_pages.map((page) => {
    let text = replace_color_styles_with_class(page.text_html, color_styles_map, color_css)
    text = replace_special_characters(text)

    const chapters_in_page = info.page_chapters?.[page.page_number]
    if (chapters_in_page?.length) {
      text = replace_titles_with_headers(chapters_in_page, text, toc_depth_map)
    }
    if (options.update_hamesh) text = update_hamesh_html(text)

    const volume = get_page_volume(info.volumes, page.page_number)
    const file_name = `${volume.name ? 'page_' : 'page'}${volume.index}_${String(page.page_number).padStart(zfill_length, '0')}.xhtml`

    let footer = ''
    if (volume.name) footer += `الجزء: ${volume.name} - `
    footer += `الصفحة: ${page.page}`

    return {
      page,
      file_name,
      title: chapters_in_page?.[0] ?? '',
      content_html: `${text}<div class="text-center">${footer}</div>`,
    }
  })

  const page_map = new Map<number, string>()
  page_entries.forEach((entry) => page_map.set(entry.page.page_number, `text/${entry.file_name}`))

  const styles = `${BASE_CSS}\n${HAMESH_CSS}${color_css.value}`
  zip.folder('OEBPS')?.file('styles.css', styles.trim())

  const text_folder = zip.folder('OEBPS')?.folder('text')
  page_entries.forEach((entry) => {
    const page_title = entry.title || title
    text_folder?.file(entry.file_name, render_page({ ...entry.page, text_html: entry.content_html }, page_title))
  })

  const info_body = info.about ?? ''
  zip.folder('OEBPS')?.file(
    'info.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>بطاقة الكتاب</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${info_body}
  </body>
</html>
`
  )

  const toc_html = info.toc?.length
    ? render_nav_items(info.toc, page_map)
    : render_nav_pages(sorted_pages, page_map)
  const info_link = '<li><a href="info.xhtml">بطاقة الكتاب</a></li>'
  const nav_link = '<li><a href="nav.xhtml">فهرس الموضوعات</a></li>'
  const nav_items = toc_html.startsWith('<ol>')
    ? toc_html.replace('<ol>', `<ol>${info_link}${nav_link}`)
    : `<ol>${info_link}${nav_link}</ol>`

  zip.folder('OEBPS')?.file(
    'nav.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="${EPUB_NS}" lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>${escape_xml(title)}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>فهرس الموضوعات</h1>
      ${nav_items}
    </nav>
  </body>
</html>
`
  )

  const ncx_toc: TocTree = info.toc?.length
    ? info.toc
    : sorted_pages.map((page) => ({
        page: page.page_number,
        text: `صفحة ${page.page}`,
      }))
  const ncx_items = render_ncx_items(ncx_toc, page_map)
  const ncx_id = crypto.randomUUID()
  zip.folder('OEBPS')?.file(
    'toc.ncx',
    `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta content="${ncx_id}" name="dtb:uid"/>
    <meta content="0" name="dtb:depth"/>
    <meta content="0" name="dtb:totalPageCount"/>
    <meta content="0" name="dtb:maxPageNumber"/>
  </head>
  <docTitle>
    <text>${escape_xml(title)}</text>
  </docTitle>
  <navMap>
    <navPoint id="info">
      <navLabel>
        <text>بطاقة الكتاب</text>
      </navLabel>
      <content src="info.xhtml"/>
    </navPoint>
    <navPoint id="nav">
      <navLabel>
        <text>فهرس الموضوعات</text>
      </navLabel>
      <content src="nav.xhtml"/>
    </navPoint>
    ${ncx_items}
  </navMap>
</ncx>
`
  )

  const manifest_items = page_entries
    .map(
      (entry) =>
        `<item id="p${entry.page.page_number}" href="text/${entry.file_name}" media-type="application/xhtml+xml" />`
    )
    .join('')

  const spine_items = page_entries.map((entry) => `<itemref idref="p${entry.page.page_number}" />`).join('')

  zip.folder('OEBPS')?.file(
    'content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escape_xml(identifier)}</dc:identifier>
    <dc:title>${escape_xml(title)}</dc:title>
    ${author ? `<dc:creator>${escape_xml(author)}</dc:creator>` : ''}
    ${info.url ? `<dc:source>${escape_xml(info.url)}</dc:source>` : ''}
    <dc:publisher>https://shamela.ws</dc:publisher>
    <dc:language>ar</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    <item id="info" href="info.xhtml" media-type="application/xhtml+xml" />
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
    <item id="css" href="styles.css" media-type="text/css" />
    ${manifest_items}
  </manifest>
  <spine toc="ncx" page-progression-direction="rtl">
    <itemref idref="info" />
    <itemref idref="nav" />
    ${spine_items}
  </spine>
</package>
`
  )

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })

  return { blob, filename }
}

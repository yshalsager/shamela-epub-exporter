import type { TocTree, TocBranch } from './types'

export const get_number_from_url = (url: string) => {
  const last = url.split('/').pop() ?? ''
  const cleaned = last.split('#')[0]
  const value = Number.parseInt(cleaned, 10)
  return Number.isNaN(value) ? 0 : value
}

export const get_start_end_pages = (volumes: Record<string, number>, pages: number) => {
  if (!Object.keys(volumes).length) return {}

  const sorted = Object.keys(volumes).sort((a, b) => {
    const a_num = Number.parseInt(a, 10)
    const b_num = Number.parseInt(b, 10)
    if (!Number.isNaN(a_num) && !Number.isNaN(b_num)) return a_num - b_num
    return volumes[a] - volumes[b]
  })

  const ranges: Record<string, [number, number]> = {}

  sorted.forEach((name, index) => {
    const start_page = volumes[name]
    const end_page = index < sorted.length - 1 ? volumes[sorted[index + 1]] - 1 : pages
    ranges[name] = [start_page, end_page]
  })

  return ranges
}

export const cut_toc = (toc: TocTree, range: [number, number]): TocTree => {
  const result: TocTree = []

  for (const item of toc) {
    if (Array.isArray(item)) {
      const [entry, children] = item as TocBranch
      if (entry.page < range[0]) continue
      if (entry.page > range[1]) break
      const sub = cut_toc(children, range)
      result.push(sub.length ? [entry, sub] : entry)
    } else {
      if (item.page < range[0]) continue
      if (item.page > range[1]) break
      result.push(item)
    }
  }

  return result
}

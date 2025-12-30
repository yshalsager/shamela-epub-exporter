export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'canceled'

export type JobOptions = {
    volume?: string
    update_hamesh?: boolean
    flatten_toc?: boolean
}

export type JobProgress = {
    current: number
    total?: number
}

export type TocItem = {
    page: number
    text: string
}

export type TocBranch = [TocItem, TocTree]
export type TocTree = Array<TocItem | TocBranch>

export type BookInfo = {
    id: number
    url: string
    title: string
    author?: string
    about?: string
    toc?: TocTree
    volumes?: Record<string, [number, number]>
    page_chapters?: Record<number, string[]>
}

export type BookPage = {
    page_number: number
    page: number
    text_html: string
}

export type JobResult = {
    title: string
    author?: string
    pages: number
    epub_blob_url?: string
    filename?: string
}

export type Job = {
    job_id: string
    book_id: number
    url: string
    started_at: number
    status: JobStatus
    progress: JobProgress
    options?: JobOptions
    result?: JobResult
    error?: string
}

export type RuntimeMessage = {
    type: string
    job_id?: string
    payload?: unknown
}

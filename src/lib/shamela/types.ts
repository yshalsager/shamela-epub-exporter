export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'canceled'

export type JobOptions = {
    volume?: string
    update_hamesh?: boolean
    flatten_toc?: boolean
    include_toc_page?: boolean
}

export type JobProgress = {
    current: number
    total?: number
}

export type TocItem = {
    page: number
    text: string
    anchor?: string
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
    output_filename?: string
    local_identifier?: string
    publisher?: string
    page_footer_included?: boolean
}

export type BookPage = {
    page_number: number
    page: number
    part?: number | null
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

export type JobStartPayload = {
    book_id?: number
    book_ids?: number[]
    options?: JobOptions
    tab_id?: number
}

export type RuntimeMessage = {
    type: string
    job_id?: string
    payload?: unknown
}

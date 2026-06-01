import type {BookInfo, BookPage, TocTree} from '@/lib/shamela/types'

export type table_meta = {
    row_count: number
    column_names: string[]
}

export type table_meta_map = Map<string, table_meta>

export type book_selection = {
    content_table: string
    content_text_col: string
    content_id_col: string
    content_id_col_locked?: boolean
    content_page_col: string
    content_part_col: string
    toc_table: string
    toc_text_col: string
    toc_start_col: string
    toc_level_col: string
    chunk_size: string
    split_numbered: boolean
}

export type analysis_result = {
    key: string
    file: File
    file_name: string
    status: 'ready' | 'error'
    error: string
    title: string
    author: string
    tables_count: number
    content_table: string
    selection: book_selection | null
}

export type toc_item_raw = {
    start: number
    text: string
    level: number | null
}

export type convert_options = {
    include_author_filename: boolean
    include_toc_page: boolean
    split_numbered: boolean
    chunk_size: number
}

export type analyze_result = {
    table_names: string[]
    table_meta: table_meta_map
    title: string
    author: string
    card: string
    selection: book_selection
}

export type page_reader = {
    pages: BookPage[]
    id_to_page_number: Map<number, number>
    id_to_snippet: Map<number, string>
    page_value_to_page_number: Map<number, number>
    has_id_col: boolean
    has_page_col: boolean
    load_more: (options?: {
        max_pages?: number
        until_id?: number | null
        until_page?: number | null
    }) => Promise<{done: boolean; loaded_pages: number; added_pages: number}>
    progress: () => {done: boolean; offset: number; row_count: number; pages: number}
    volumes: Record<string, [number, number]>
}

export type book_payload = {
    info: BookInfo
    pages: BookPage[]
    toc: TocTree | null
}

export interface mdb_table {
    rowCount: number
    getColumnNames(): string[]
    getData(options?: {
        columns?: string[]
        rowOffset?: number
        rowLimit?: number
    }): Array<Record<string, unknown>>
}

export interface mdb_reader {
    getTableNames(options?: {
        normalTables?: boolean
        systemTables?: boolean
        linkedTables?: boolean
    }): string[]
    getTable(name: string): mdb_table
}

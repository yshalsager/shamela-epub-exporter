# Shamela EPUB Exporter (WXT + Svelte)

Browser extension that scrapes Shamela book pages and builds an EPUB on-device.

## What it does
- Queues book IDs or URLs and keeps a live progress view
- Scrapes pages from `https://shamela.ws/book/*` while the tab stays open
- Builds and downloads an EPUB locally
- Optional hamesh cleanup and volume slicing

## Architecture components
- Popup UI: entrypoint for starting jobs and setting options
- Background: job queue, tab orchestration, progress state
- Content script: HTML scraping + metadata extraction
- EPUB builder: converts pages + metadata into `epub` zip
- Storage: persisted job state for the job page

## Flow (ASCII)
```
Popup UI
   |
   v
Background  <---->  Storage
   |
   v
Content Script  --->  Shamela Book Tab
   |
   v
Pages + Meta
   |
   v
EPUB Builder
   |
   v
Download (.epub)
```

## Development
```
mise x pnpm -- pnpm run dev
```

## Build
```
mise x pnpm -- pnpm run build
```

## Tests
```
mise x pnpm -- pnpm run test -- --run
```

## Notes
- Keep the Shamela tab open while a job is running.
- The extension relies on your browser session if Shamela is protected by Cloudflare.

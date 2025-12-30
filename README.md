# Shamela EPUB Exporter

> Browser extension to download books from the [Shamela Library](https://shamela.ws) into EPUB files locally.

[![en](https://img.shields.io/badge/README-English-AB8B64.svg)](README.md)
[![ara](https://img.shields.io/badge/README-Arabic-AB8B64.svg)](README.ar.md)

<img src="src/assets/icon.png" alt="logo" style="max-width: 120px; height: auto; display: block;" />
<img src="assets/screenshot-en.png" alt="popup screenshot" style="max-width: 100%; height: auto; display: block;" />

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.png?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![GitHub release](https://img.shields.io/github/release/yshalsager/shamela-epub-exporter.svg)](https://github.com/yshalsager/shamela-epub-exporter/releases/)
[![GitHub Downloads](https://img.shields.io/github/downloads/yshalsager/shamela-epub-exporter/total.svg)](https://github.com/yshalsager/shamela-epub-exporter/releases/latest)
[![License](https://img.shields.io/github/license/yshalsager/shamela-epub-exporter.svg)](https://github.com/yshalsager/shamela-epub-exporter/blob/master/LICENSE)

[![PayPal](https://img.shields.io/badge/PayPal-Donate-00457C?style=flat&labelColor=00457C&logo=PayPal&logoColor=white&link=https://www.paypal.me/yshalsager)](https://www.paypal.me/yshalsager)
[![Liberapay](https://img.shields.io/badge/Liberapay-Support-F6C915?style=flat&labelColor=F6C915&logo=Liberapay&logoColor=white&link=https://liberapay.com/yshalsager)](https://liberapay.com/yshalsager)

**Disclaimer:**

* This software is freeware and open source and is only intended for personal or educational use.

## Features

* Creates an [EPUB3](https://www.w3.org/publishing/epub3/epub-spec.html) RTL standard book.
* Automatically adds a page for book information.
* Table of contents with nested chapters (or a flat option).
* Adds volume and page number footer per page.
* Sanitizes book HTML and converts inline colors to CSS classes.
* Optional footnote (hamesh) popup conversion for easier navigation.

## Installation

### Development build (unpacked)

```bash
mise x pnpm -- pnpm run dev
```

Load the extension from:

```bash
.output/chrome-mv3-dev
```

### Production build (unpacked)

```bash
mise x pnpm -- pnpm run build
```

Load the extension from:

```bash
.output/chrome-mv3
```

## Usage

1. Open the extension popup.
2. Paste a book URL or enter a book ID.
3. Click **بدء** and keep the Shamela tab open while it runs.
4. The EPUB downloads automatically when the job finishes.

## Development

This project uses [mise](https://mise.jdx.dev/) for tool versions and environment setup.

1. Install mise.
2. Run `mise install` in the repo root.
3. Start the dev server:

```bash
mise x pnpm -- pnpm run dev
```

## Technology Stack

* TypeScript + Svelte 5 (UI)
* WXT + Vite (extension tooling)
* Tailwind CSS (styles)
* JSZip (EPUB packaging)
* Wuchale (i18n)

## Acknowledgements

This project relies on several open-source tools:

* [Svelte](https://svelte.dev/)
* [WXT](https://wxt.dev/)
* [Vite](https://vitejs.dev/)
* [Tailwind CSS](https://tailwindcss.com/)
* [JSZip](https://stuk.github.io/jszip/)
* [Wuchale](https://github.com/wuchalejs/wuchale)

## Privacy

See `PRIVACY.md`.

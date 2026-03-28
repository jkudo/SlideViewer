# SlideViewer on GitHub

SlideViewer on GitHub is a SlideShare-like app on GitHub Pages.
Upload PowerPoint files to the repository, and the site lists and displays them one slide image at a time.

# Demo
https://jkudo.github.io/slideviewer/?deck=slidedemo&page=1

## How It Works

1. Put `.ppt` or `.pptx` files in `decks/`.
2. Push to `main`.
3. GitHub Actions converts them to PDF and then per-page images during deployment.
4. The app reads `decks/index.json` and shows a deck library + one-slide viewer.

Library features:
- Search by title / filename
- Sort by upload time or name
- Default order: newest upload first

No external viewer service is required.

## Single Slide Viewer

- Slides are rendered one page at a time.
- Use `Prev` / `Next` buttons to move between pages.
- URL keeps the current page: `?deck=<deck-id>&page=<number>`.

## Embed On Other Sites

- Open your deck in SlideViewer and click `Copy Embed Code`.
- Or build manually with:

```html
<iframe src="https://jkudo.github.io/SlideViewer/?deck=slidedemo&embed=1&page=1" width="960" height="540" style="border:0;" loading="lazy" allowfullscreen></iframe>
```

- `embed=1` hides the library pane and header for embedding.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy To GitHub Pages

The repository includes `.github/workflows/deploy.yml`.

1. Open `Settings > Pages`.
2. Set `Source` to `GitHub Actions`.
3. Commit PowerPoint files to `decks/`.
4. Push to `main`.
5. After Actions completes, open your Pages URL.

## Folder Structure

- `decks/` : source `.ppt/.pptx` files you manage in git
- `public/decks/index.json` : generated deck manifest in build artifact
- `public/decks/pdfs/` : generated PDFs in build artifact
- `public/decks/images/<deck>/` : generated slide images in build artifact

## Deck Naming

- `decks/Sales_Q1_2026.pptx` -> title: `Sales Q1 2026`
- Converted PDF path: `decks/pdfs/Sales_Q1_2026.pdf`
- Slide image path example: `decks/images/Sales_Q1_2026/Sales_Q1_2026-1.jpg`

## Notes

- Conversion runs only on GitHub Actions deploy (Node 20 runner + LibreOffice).
- Upload time uses each file's latest commit author time on GitHub (`git log -1 --format=%aI -- decks/<file>`).

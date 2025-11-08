# PyGraph Formatter (Next.js)

A minimal Next.js app to paste Python graph traces (e.g., long PyTorch dumps) and get them prettified with Black plus syntax highlighting.

- Client-side Python via Pyodide
- Formats with Black (installed in-browser using micropip)
- Paste-in-modal flow with spinner while Black loads
- Prism-based syntax highlighting, line numbers, no soft wrap (horizontal scroll)
- LocalStorage remembers your last input

## Run locally

- Install deps: `npm install`
- Start dev server: `npm run dev`
- Open: http://localhost:3000

## Usage

1. Load the app; a modal appears asking you to paste Python.
2. Click "Format". You’ll see a spinner while Pyodide + Black load and run.
3. The page then shows only the formatted code (full width, centered to 120ch).

## Notes

- Black and Pyodide are loaded from a CDN the first time you format, so the initial format may take a few seconds. After that, formatting is instant.
- Default Black line length is set to 120 to better accommodate wide traces.
- Long lines no longer wrap; use horizontal scroll to view extra columns.
- If you need export-to-file or additional themes, let me know and I can add them.
# fxviz

# PyGraph Formatter (Next.js)

A minimal Next.js app to paste Python graph traces (e.g., long PyTorch dumps) and get them prettified with Black plus syntax highlighting.

- Client-side Python via Pyodide
- Formats with Black (installed in-browser using micropip)
- Prism-based syntax highlighting, line numbers, optional soft wrap
- Draggable vertical split: resize editor/preview widths
- LocalStorage remembers your last input

## Run locally

- Install deps: `npm install`
- Start dev server: `npm run dev`
- Open: http://localhost:3000

## Usage

1. Paste your Python/trace into the left pane.
2. It auto-formats with Black after a brief pause. If Black cannot load (offline/no network), it falls back to raw input — highlighting still works. You can still press "Format with Black" to force a re-format.
3. Drag the vertical handle to resize panes. Copy the formatted output from the right pane.

## Notes

- Black and Pyodide are loaded from a CDN the first time you format, so the initial format may take a few seconds. After that, formatting is instant.
- Default Black line length is set to 120 to better accommodate wide traces.
- The preview also wraps long lines at a visual width of 120 characters (120ch) when wrapping is enabled.
- If you need export-to-file or additional themes, let me know and I can add them.
# fxviz

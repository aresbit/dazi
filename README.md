# dazi

A keybr-style typing trainer built as a static site.

## Features

- Full letter keys enabled by default (not limited to F/J)
- Adaptive pseudo-word generator with bigram-like transitions
- Per-key accuracy tracking and keyboard error heatmap
- Two modes:
  - Adaptive words
  - Code lesson (micrograd-c snippets)
- Course config export/import (`dazi-config.json`)
- Chinese / English UI switching
- Works as a pure static website (GitHub Pages friendly)

## Local run

Open `index.html` directly, or use any static server.

## Deploy to GitHub Pages

This repo includes `.github/workflows/pages.yml`.

After pushing to `main`:

1. Open GitHub repo settings → **Pages**
2. In **Build and deployment**, set **Source** to **GitHub Actions**
3. Wait for the workflow to finish
4. Site URL will be:
   - `https://aresbit.github.io/dazi/`

## Notes

The implementation is original code inspired by keybr-style adaptive training principles.
Code lesson text references snippets from `https://github.com/aresbit/micrograd-c`.

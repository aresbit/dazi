# dazi

A keybr-style typing trainer built as a static site.

## Features

- Adaptive lessons that focus on your weak letters
- Per-letter accuracy tracking
- Full letter keys enabled by default (not limited to F/J)
- Progressive unlock logic remains in code for optional future training mode
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

The implementation is original code inspired by keybr-style adaptive training principles, not copied assets or source code.

# imsulaeman.github.io

Personal portfolio site for Ilham Maulana Sulaeman.

**Live:** https://imsulaeman.github.io

## Stack

- [Astro](https://astro.build) 6 — static output, zero JS by default
- TypeScript
- GitHub Pages via GitHub Actions

## Features

- Frame-based hero animation — click to shake, cycles through PNG frames with sakura petals
- Essays system via Astro content collections
- Scroll-reveal animations (GPU-safe: `transform` + `opacity` only)

## Dev

```sh
npm install
npm run dev       # localhost:4321
npm run build     # output to ./dist
npm run preview   # preview build locally
```

## Deploy

Pushes to `main` trigger the GitHub Actions workflow at `.github/workflows/deploy.yml`, which builds and deploys to GitHub Pages automatically.

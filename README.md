# MaxMovies — Frontend (Vanilla JS)

## Overview
MaxMovies is a vanilla JavaScript front-end demo for streaming and downloading movies/series. It uses the public API at `https://movieapi.giftedtech.co.ke` and supports a local mock mode.

## Features
- Single-page app with hash router
- Search, Home, Info, Player, Downloads, Library, Settings
- HLS playback via `hls.js`
- IndexedDB download manager (simple)
- Mock mode for offline dev (`/mock/*.json`)
- PWA-ready (manifest + simple service worker)

## Quick start
1. Copy the project files into a folder.
2. Serve statically (recommended):
   - `npx http-server` or `vercel dev` or any static host.
3. Open `http://localhost:8080` (port may vary).

## Mock mode
To force mock mode from the browser, open Settings and toggle "Use Mock Data". Or in code set `localStorage.setItem('maxmovies.mock','1')`.

## Deploy
- Deploy the folder on Vercel or Netlify. It's a static site.

## Notes
- If API responds with CORS issues, the app will detect and fall back to the local mock files.
- This is a scaffold—add features incrementally (quality selector, resume/hls levels, pause/resume downloads).

## Legal
This repo is a demo front-end. Do not upload copyrighted content. Respect API provider terms.

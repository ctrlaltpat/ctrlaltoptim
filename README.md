# Image Optimiser 
#### One-shot (with 2 minor adjustments) w/ Proton Lumo (prompt), PI Agent (vanilla) and DeepSeek V4 Pro (OpenRouter)

A client-side web application for compressing, resizing, and downloading optimised images. Everything runs in your browser – no files are ever uploaded to a server.

## Features

- **Drag & drop** or browse to upload multiple images at once
- **Adjustable compression** – quality slider from 10% to 100%
- **Three resize presets** – Large (1920px), Medium (1280px), Small (640px)
- **Format conversion** – output as WebP (default), JPEG, or PNG
- **EXIF auto-correction** – portraits and rotated photos display correctly
- **Batch download** – get all outputs as a single ZIP archive
- **Settings persistence** – preferences saved in localStorage
- **Statistics dashboard** – real-time size savings and timing metrics

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript (strict mode) |
| Bundler | Vite |
| Image processing | Canvas API + OffscreenCanvas + createImageBitmap |
| ZIP generation | JSZip |
| Styling | Plain CSS (custom properties, responsive grid) |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Open the URL printed in the terminal (usually http://localhost:5173)
```

## Production Build

```bash
npm run build
```

This compiles TypeScript, bundles the app, and outputs static files to `dist/`. Serve that directory with any static file server.

## Project Structure

```
src/
├── main.ts                   # App entry point & processing pipeline
├── state.ts                  # Central state store (pub/sub pattern)
├── types.ts                  # Shared TypeScript interfaces
├── constants.ts              # Defaults, limits, format maps
├── style.css                 # All application styles
├── components/
│   ├── uploadZone.ts         # Drag & drop / file picker
│   ├── settings.ts           # Quality, format, resize controls
│   ├── imageQueue.ts         # Thumbnail grid + metadata
│   ├── outputGallery.ts      # Results with download buttons
│   └── statsDashboard.ts     # Real-time metrics
├── services/
│   ├── imageProcessor.ts     # Canvas-based resize + re-encode
│   └── zipService.ts         # JSZip archive generation
└── utils/
    ├── exif.ts               # EXIF orientation parsing
    ├── format.ts             # Size/name formatting helpers
    └── storage.ts            # localStorage read/write
```

## Browser Support

Requires a modern browser with support for:

- `OffscreenCanvas` (falls back to regular canvas if unavailable)
- `createImageBitmap` with `imageOrientation: 'from-image'`
- ES2020+

Tested on latest Chrome, Firefox, Safari, and Edge.

## License

MIT
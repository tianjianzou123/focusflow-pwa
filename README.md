# FocusFlow Tasks — React Progressive Web App

FocusFlow is a responsive to-do list created for **COMP10013 Dynamic Web Technologies — Practice Lab W5**. It is installable, works offline after the first visit, and stores tasks locally in the browser.

## Verified results

The production build was verified on 13 October 2026 with Microsoft Edge and Lighthouse:

- Automated PWA checks: **8/8 passed** (manifest, task workflow, persistence, filters, active service worker, offline reload, runtime errors and mobile layout).
- Lighthouse: **Performance 99**, **Accessibility 100**, **Best Practices 100**, **SEO 100**.
- Dependency audit: **0 known vulnerabilities**.

## Run the project

```bash
npm install
npm run dev
```

For a production PWA test (recommended):

```bash
npm run build
npm run preview
```

With the production preview still running, a local Chromium/Edge installation can run the automated PWA smoke test in a second terminal:

```bash
npm run test:pwa
```

Open the local URL shown by Vite in Google Chrome. Service workers require `localhost` or HTTPS.

## Lab requirements completed

### Part 1 — App icon

- Custom 1024 × 1024 source icon with transparent background.
- PNG variants at 48, 72, 96, 144, 168, 192 and 512 pixels.
- A separate 512 pixel maskable icon for Android launchers.

### Part 2 — Web app manifest

`public/manifest.json` defines the app name, short name, description, start URL, scope, standalone display mode, portrait orientation, colours, icons and an app shortcut. `index.html` links the manifest and supplies theme colour and Apple touch icon metadata.

### Part 3 — Service worker

`public/service-worker.js` is written manually and registered from `src/main.jsx`. It:

- pre-caches the app shell during installation;
- removes old versioned caches during activation;
- serves navigation requests from the network with an offline fallback;
- uses cached static resources when the network is unavailable;
- calls `skipWaiting()` and `clients.claim()` to activate updates promptly.

### Part 4 — Lighthouse testing

1. Run `npm run build` and `npm run preview`.
2. Open the preview URL in Chrome.
3. Open DevTools → **Application** and confirm the manifest and service worker are detected.
4. In DevTools → **Lighthouse**, select Mobile and run the available Performance, Accessibility, Best Practices and SEO audits.
5. In DevTools → **Network**, choose Offline and reload to verify that the cached app still works.

> Chrome removed the dedicated Lighthouse PWA category in newer versions. Installation requirements can still be inspected in the Application panel, while Lighthouse audits the remaining quality categories.

### Part 5 — Deployment and real-device testing

Push this folder to GitHub and import the repository into Vercel. Vercel detects Vite automatically; use `npm run build` as the build command and `dist` as the output directory. The generated HTTPS URL can be opened in Chrome on Android and installed with **Add to Home screen / Install app**.

`vercel.json` records the Vite build settings and prevents stale caching of the service worker and manifest after an update.

The lab sheet describes deployment/real-device testing as an **option**, so it is not required for Parts 1–4 unless the separate submission brief or lecturer asks for a live URL. It is still recommended as the clearest evidence for Part 5.

## Main application features

- Add, complete, filter and delete tasks.
- Clear all completed tasks.
- Persistent data using `localStorage`.
- Live daily progress indicator.
- Online/offline status.
- Browser installation prompt when supported.
- Responsive and keyboard-accessible interface.

## Important PWA files

```text
index.html                 Manifest and theme metadata
public/manifest.json       Installation configuration
public/service-worker.js   Offline caching logic
public/icons/              PWA icon set
src/main.jsx               Service worker registration
```

## Notes for demonstration

The service worker deliberately pre-caches fixed production filenames. `vite.config.js` therefore gives the compiled JavaScript and CSS stable names (`assets/app.js` and `assets/app.css`). If the cached files change, increment `CACHE_NAME` in `public/service-worker.js` before deploying so existing installations receive the new version.


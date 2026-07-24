# AETHRYONEXIS — frontend setup

This folder is the static frontend for the AETHRYONEXIS site.

```
index.html · styles.css · app.js · assets/fonts/*.woff2 · .nojekyll
```

There is no build step and no frontend backend dependency. Host this folder on GitHub Pages.

## Contact Flow

The contact section is currently frontend-only:

- The scope quiz assembles a small brief.
- Submit opens the visitor's mail app with the brief pre-filled.
- Copy brief remains available if mailto is not configured on the visitor's machine.
- No submission relay or backend endpoint is wired into this frontend.

When the Render backend is built, it should own contact intake, storage, spam controls, reporting,
and any server-side notification delivery. At that point the frontend can POST to that backend.

## Analytics

Google Analytics 4 is config-gated in `app.js`.

1. Create a GA4 web data stream.
2. Copy the Measurement ID, for example `G-XXXXXXXXXX`.
3. Paste it into `CONFIG.gaMeasurementId` in `app.js`.

If `gaMeasurementId` is empty, the site loads no Google Analytics script. When set, the frontend
sends the normal page view plus custom `section_view` and `section_dwell` events for sections marked
with `data-section`.

## Planned Backend

Keep this frontend on GitHub Pages. Build the backend separately on Render.com.

Expected backend responsibilities:

- Contact submission API.
- Data storage and reporting.
- Server-side spam/rate-limit controls.
- Notification delivery.
- Health endpoint for uptime checks and keep-warm pings.

Do not add backend code to this frontend folder.

## Run Locally

```bash
python3 -m http.server 8000
```

Then open <http://127.0.0.1:8000>.

You can also open `index.html` directly.

## Host On GitHub Pages

This folder is already a git repo. Then:

```bash
git add -A
git commit -m "AETHRYONEXIS frontend"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

On GitHub: Settings -> Pages -> Build and deployment -> Source: "Deploy from a branch" ->
Branch: `main` / Folder: `/ (root)` -> Save.

All asset paths are relative, so the site works under a GitHub Pages repo subpath.

## Editing Content

- The page content lives in `index.html`.
- The visual system lives in `styles.css`.
- Interaction, the quiz, mailto compose, modal behavior, and GA4 tracking live in `app.js`.
- The contact email appears in `app.js` and in `mailto:` links in `index.html`.

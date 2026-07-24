# AETHRYONEXIS — setup, contact form & GitHub Pages hosting

A single-page, **fully static** site (vanilla HTML/CSS/JS). Fonts are embedded locally, there is
no build step, no dependencies, and **no backend** — it is designed to run 100% on GitHub Pages.

```
index.html · styles.css · app.js · assets/fonts/*.woff2 · .nojekyll
```

## Contact form — how it works

The form is a 3-step "scope diagnostic" quiz (domain / stage / timeline) + your email. It has two
delivery paths, both configured by the `CONFIG` object at the top of `app.js`:

- **Relay (default):** the brief is POSTed to **FormSubmit.co**, which emails it to
  `CONFIG.contactEmail` **server-side** — the visitor does *not* need a mail client, and there is
  **no backend to host**. This is what makes it work on plain GitHub Pages.
- **mailto fallback:** if `formTarget` is `""` (or the relay call fails), it opens the visitor's
  mail app pre-filled, plus a **Copy brief** button.

A hidden honeypot field blocks spam bots automatically.

> Why a relay at all? A static site (GitHub Pages) **cannot send email by itself** — something has
> to carry it. FormSubmit is just that carrier; **hosting still lives entirely on GitHub Pages**.
> The only zero-relay option is mailto, which depends on the visitor's mail app.

### One-time activation (required for the relay)

1. Deploy the site (below) or run it locally.
2. Submit the form once yourself.
3. FormSubmit emails **Ae.th.ry.on.ex.is@proton.me** a one-time **activation link** — click it.
4. Done — every submission after that arrives in that inbox.

**Hide your email from the page (optional):** after activating, FormSubmit gives you a random
alias (e.g. `a1b2c3...`). Put that in `formTarget` instead of the email address.

**Turn the relay off:** set `formTarget: ""` in `app.js` to use mailto only.

## End-to-end encryption

Every submission is **encrypted in the visitor's browser** with your public key
(RSA-OAEP-4096 + AES-256-GCM, via the built-in Web Crypto API — no library, still self-contained)
*before* it is sent. The relay, GitHub, and anyone on the network only ever see **ciphertext**;
only your offline **private key** can read it.

- Your keys live in `crypto/`. **`crypto/private-key.jwk` is git-ignored — never commit or push it.**
- **Read an inquiry:** open `crypto/decrypt.html`, load `private-key.jwk`, paste the blob from the
  email, Decrypt.
- **Rotate keys:** open `crypto/keygen.html`, generate a new pair, paste the new public key into
  `CONFIG.publicKeyJwk` in `app.js`, keep the new private key safe. (Old blobs become unreadable
  after rotation.)
- Set `CONFIG.publicKeyJwk` to `null` to send plaintext instead. Full walkthrough: `crypto/README.md`.

## Spam protection (no CAPTCHA, no backend — honest version)

Layered defense for a static site:

- **Honeypot** — a hidden field; bots that fill it are dropped. FormSubmit also enforces this
  **server-side** (`_honey`), so it works even against direct POSTs to the relay.
- **Time-trap** — submissions completed in under 2.5s (bot speed) are silently ignored.
- **Relay filtering + rate limits** — the relay screens known spam and throttles floods.
- **Encryption as a filter** — junk that isn't validly encrypted **won't decrypt**, so
  `decrypt.html` discards it automatically; it never reaches your attention.
- The **site can't be DDoS'd** — GitHub Pages is CDN-served; there's no server of yours to hit.

**Limit:** with no backend and no CAPTCHA, a determined spammer can still POST junk to the relay.
If that happens, **rotate the endpoint** (FormSubmit alias) or switch to a **Web3Forms** key with a
**domain allowlist** + server-side filtering — the strongest no-CAPTCHA posture.

## Run locally

```bash
python3 -m http.server 8000        # then open http://127.0.0.1:8000
```
(or just open `index.html` directly.)

## Host on GitHub Pages

This folder is already a git repo. Then:

```bash
git add -A
git commit -m "AETHRYONEXIS site"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

On GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch" →
Branch: `main` / Folder: `/ (root)` → Save.**

Your site goes live at **`https://<you>.github.io/<repo>/`** in about a minute.

- All asset paths are **relative**, so it works under the `/<repo>/` subpath.
- The included **`.nojekyll`** file tells GitHub to serve files as-is (no Jekyll processing).
- Want it at the root (`https://<you>.github.io`)? Name the repo **`<you>.github.io`**.
- Custom domain: **Settings → Pages → Custom domain**.

## Editing content

- The six-syllable name meanings, the Practice / Method / Engagements copy, and the single project
  (**Bread Crumbs**) are plain text in `index.html`.
- The contact email lives in `app.js` (`CONFIG.contactEmail` / `formTarget`) and in the `mailto:`
  links in `index.html` (contact section + footer).

## Notes

- Client/project source is intentionally **not** linked publicly — more can be walked through on a
  call.
- Everything is self-contained: no CDNs, no web fonts, no trackers. The only network call the page
  ever makes is the FormSubmit POST that happens **when someone submits the form**.

# Abogada de la Tierra

**A client website for Lucía Rico González — an administrative-law and urban-planning attorney based in Alicante, serving all of Spain.**
Built by hand with plain **HTML, vanilla CSS and vanilla JavaScript**. No framework, no bundler, no runtime dependencies, no cookies, no trackers. The only tooling is a ~50-line Node build script.

`Handcrafted` · `No framework` · `0 runtime deps` · `Serverless contact form` · `Perfect Core Web Vitals` · `Cloudflare Pages` · `MIT (code) licensed`

> Live at **[abogadadelatierra.es](https://abogadadelatierra.es/)**

---

## Why this repo is public (and what that means)

This is **real, paid client work**, published openly to show my approach — not a personal demo. That makes the openness a decision with consequences, so it was made *with* the client, not around her.

**Lucía gave informed consent.** Before anything went public I walked her through what publishing the source means in practice, honestly, including the downsides:

- The **structure, copy, styling and logic** of her site become copyable by anyone. A competitor could clone the look with less effort.
- The **contact-form plumbing is visible** — how messages are sent, where they go. (No secrets live in the repo; the API key and destination inbox are Cloudflare environment variables, never committed. But the *shape* of the system is public.)
- Public history is effectively **permanent** — even a later takedown can be cached or forked.

She understood the trade-offs and agreed the upside — transparency, a documented and auditable site, and a portfolio piece that helps the developer who built it — was worth it. As part of that same conversation she also agreed to **credit me** in two low-key places:

- **In the metadata** — the JSON-LD marks me as the site's `creator` (the person who built it), while Lucía remains the `author`/`publisher` (the content and the practice are hers). *Creator, not author* — that distinction is deliberate and it's hers.
- **In the footer** — a small "built by" credit linking to [miguelpv.dev](https://miguelpv.dev).

Everything user-facing — the words, the photos, the brand — is hers. The engineering is what I'm sharing here.

### Maintenance & the 2-month review
This isn't shipped-and-forgotten. **I actively monitor the site and will act immediately if something breaks** (an error, a broken form, a regression). Beyond that, Lucía and I have agreed to a **review roughly two months after launch**: once she has lived with the site and knows what her clients actually do with it, we sit down and fold her feedback and wishes back into the code. Some of the decisions documented below may therefore change at that review — this README describes the site as it is *today*.

---

## Tech & tooling

| Concern | Choice |
| --- | --- |
| Markup | Hand-written HTML, one file per page |
| Styles | Vanilla CSS, design tokens in `:root`, BEM-ish class names |
| Behaviour | One vanilla JS file (`assets/js/main.js`), no modules, no deps |
| Fonts | Lora (headings), DM Sans (body), Caveat (accent) — self-hosted `woff2`, latin subset |
| Contact form | A single **Cloudflare Pages Function** (`functions/api/contact.js`) that relays mail via [Resend](https://resend.com) |
| Build | One Node script (`scripts/build.js`) — **zero npm dependencies** |
| Hosting | Cloudflare Pages (`_headers` for security/cache headers) |

There is **no dev server, no linter, no test runner and no `node_modules`** — that's a deliberate constraint for a site this size, not a gap.

---

## Architecture

### Pages
A small, hand-maintained set — this is a one-practice marketing site, not an app:

- `index.html` — the homepage (hero, about, services, rural-law focus, testimonials, contact form)
- `gracias.html` — the no-JS form success landing page
- `aviso-legal.html`, `politica-de-privacidad.html`, `politica-de-cookies.html` — the legal pages Spanish/EU law requires
- `404.html` — a branded not-found page

### Client JS (`assets/js/main.js`)
One small IIFE, `'use strict'`, no build step of its own — it ships as authored. Every feature **degrades silently** if its elements are absent, so the same file is safe to load on every page. The features:

- **Mobile menu** — an accessible drawer under `960px` that toggles `aria-expanded`/`aria-label`, manages a scroll-locking overlay, and closes on nav-link click, overlay click or `Escape`.
- **Header scroll shadow** — adds a shadow past 50px, throttled through `requestAnimationFrame` on a `passive` scroll listener (no layout thrash).
- **Scroll-spy nav** — highlights the current section with an `IntersectionObserver` watching a thin band near the viewport middle, instead of reading `offsetTop` on every scroll (which would force synchronous reflow).
- **Scroll reveal** — fade-in-on-enter via `IntersectionObserver`, and it **short-circuits to fully visible under `prefers-reduced-motion`** so nothing is ever hidden from motion-sensitive users.
- **Contact form** — inline validation (on blur + on submit) with Spanish error messages, then a progressive-enhancement submit (see below).
- **Right-click → full-resolution** — `contextmenu` on any `picture[data-fullres]` opens the pristine original in a new tab (`noopener,noreferrer`), and `preventDefault()` fires **only if the tab actually opened**, so a popup blocker leaves the native menu intact.
- **Current year** — fills the footer copyright.

### The contact form (progressive enhancement, done properly)
The form is engineered to work in **three degrading tiers**, so a lead is never lost:

1. **JS available (the happy path).** `main.js` validates, then `fetch()`s the form to `/api/contact` with `Accept: application/json`. The Cloudflare Function validates again, emails Lucía via Resend, and returns `{ ok: true }`. The UI shows an inline success panel and resets.
2. **JS fails / backend unreachable.** The `fetch` `.catch()` renders an error panel offering a **`mailto:` fallback** pre-filled with the visitor's message, so they can still reach Lucía in one click.
3. **No JS at all.** The plain `<form>` still POSTs to `/api/contact`. The Function detects the missing `Accept: application/json` and responds with a **303 redirect to `/gracias`** (success) or back to `/#contacto` (failure) — a real page, never raw JSON.

The Function itself (`functions/api/contact.js`):
- **Stores nothing.** It validates, relays the message to Lucía's inbox, and discards it. There is no database and no log of message contents.
- **Validates server-side** — name/email/message length, email shape, a required subject, and the privacy-consent checkbox — so the client checks are convenience, not the security boundary.
- **Has a honeypot.** A hidden `company` field humans never see; if it's filled, the Function returns a *fake success* and sends nothing, so bots get no signal.
- **Escapes all user input** before building the notification HTML.
- **Keeps secrets out of the repo.** `RESEND_API_KEY` and `CONTACT_TO` are Cloudflare environment variables. A browser `GET /api/contact` returns a small health-check JSON so deployment/routing is easy to verify.

### Styles
Authored in `assets/css/style.css` with all design tokens (colour, spacing, fluid `clamp()` type scale, radii, shadows, easing, durations) declared in `:root`, BEM-ish class names throughout. A single mobile breakpoint story at `640px` / `960px` / `1200px`. The palette is deliberately warm and earthy — cream, sage green, earth brown, bark — to match "de la Tierra" (*of the earth*), a world away from a generic corporate-blue law site.

---

## ⚡ Performance & Core Web Vitals

The target was a **perfect Core Web Vitals / Lighthouse** profile, treated as an acceptance criterion. How each metric is defended:

- **LCP** — The **homepage's CSS is inlined** into a `<style id="inline-css">` block by the build, so the landing page (the one marketing traffic hits) has **no render-blocking stylesheet request**. Fonts for the above-the-fold text are `<link rel="preload">`ed. The hero portrait is served responsively.
  > The lighter legal/secondary pages instead link the shared, long-cached `style.css` — inlining everywhere would duplicate CSS across pages for no CWV gain on pages nobody measures.
- **CLS ≈ 0** — Every image and media element has explicit dimensions / `aspect-ratio`, so nothing reflows as assets load. Fonts use `font-display: optional`, which **never causes a layout-shifting swap**.
- **INP** — The JS is tiny, `defer`red, and event handlers avoid layout reads on the hot path (scroll shadow via `rAF`; scroll-spy and reveal via `IntersectionObserver` rather than scroll math).
- **Images** — Screenshots and photos ship as **AVIF → WebP → raster** through `<picture>` with a `srcset`/`sizes` ladder, so the browser paints the smallest variant that fits. The right-click-for-full-res handler exists precisely so this aggressive downscaling never costs anyone the ability to see the real image.
- **Fonts** — Self-hosted, latin-subset `woff2`, cached `immutable` — **no font-CDN request**, which is a performance *and* a privacy win (no visitor IP leaks to a third party for typography).

---

## 🛡️ Security

Security headers ship from `_headers` (Cloudflare Pages), targeting an A+ profile:

- **Content-Security-Policy** — strict, **no `unsafe-inline`**. The one inline `<style>` block is allow-listed by a **sha256 hash the build recomputes on every run**, so inline CSS is permitted without opening the door to arbitrary inline styles. Plus `default-src 'self'`, `base-uri 'none'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `upgrade-insecure-requests`.
- **HSTS** — `max-age=63072000; includeSubDomains; preload` (2 years, preload-ready).
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`.
- **Permissions-Policy** denies accelerometer, camera, geolocation, gyroscope, magnetometer, microphone, payment and usb, plus `interest-cohort=()` to opt out of FLoC.
- Fonts served `Cache-Control: public, max-age=31536000, immutable`.

The contact-form secrets never touch the repo (Cloudflare env vars), and all form input is validated and HTML-escaped server-side.

---

## 🔒 Privacy

For a lawyer's site — where a visitor is often about to share something sensitive — privacy is a feature, not an afterthought.

- **No cookies, no analytics, no trackers, no consent banner** — there is nothing to consent to for tracking. (The cookie policy page exists because Spanish/EU law expects the disclosure, and it truthfully says the site sets none.)
- **Zero third-party network requests.** The strict CSP forbids them and the site never needs one — fonts, images, styles and scripts are all first-party.
- **The contact form stores nothing.** Messages are relayed to Lucía and discarded; there's no database and no content logging.
- Self-hosted fonts mean **no visitor IP leaks to a font CDN**.

---

## 🔍 SEO & structured data

- Unique `<title>` / `<meta name="description">`, a `canonical`, and full **Open Graph + Twitter Card** tags with a dedicated share image.
- **JSON-LD `@graph`** describing the practice as a `LegalService` (name, address, geo, phone, opening hours, area served = Alicante + Spain), wired to `WebSite`/`WebPage` nodes. This is where `author`/`publisher` = **Lucía** and `creator` = **Miguel** are declared.
- `sitemap.xml` + `robots.txt` allowing crawl.

---

## ♿ Accessibility

- A `.skip-link` to main content, semantic landmarks, and `:focus-visible` outlines on every interactive control.
- Correct ARIA on the menu toggle (`aria-expanded`/`aria-label`), nav (`aria-current`), and form errors.
- **`prefers-reduced-motion`** is honoured everywhere — reveal animations resolve to visible, smooth-scroll and transitions are neutralised.
- Form fields have associated labels and inline, text-based error messaging (not colour alone).

---

## Build & deploy

One command:

```bash
npm run build      # node scripts/build.js
```

**What the build does** (`scripts/build.js`, no dependencies):
1. Reads `assets/css/style.css`, rewrites `../fonts/` URLs to root-absolute (so they resolve once inlined into the root page), and conservatively minifies it (strip comments, collapse whitespace).
2. **Inlines** the result into the `<style id="inline-css">` block of `index.html`.
3. **Recomputes the sha256** of that exact CSS and writes it into the CSP `style-src` in `_headers`, so the header hash always matches the bytes the browser sees. It's idempotent and re-runnable.

> ⚠️ After editing `assets/css/style.css`, you **must** re-run `npm run build`, or the homepage's inlined CSS and the CSP hash will be stale. Never hand-edit the inlined `<style id="inline-css">` block — it's generated.

`main.js` ships as-authored (it's small; there's no JS build step). Deployment is Cloudflare Pages: push and it builds; `functions/api/contact.js` is auto-routed to `/api/contact`. Set `RESEND_API_KEY` and `CONTACT_TO` in the Pages dashboard, plus the sending-domain DNS records Resend requires.

### Preview locally
There's no dev server. Serve the project root with any static file server (the contact-form Function only runs on Cloudflare — locally the form falls back to its `mailto:` route).

---

## Project structure

```
abogadadelatierra/
├── index.html                    # homepage (CSS inlined by the build)
├── gracias.html                  # no-JS form success page
├── aviso-legal.html              # legal notice
├── politica-de-privacidad.html   # privacy policy
├── politica-de-cookies.html      # cookie policy (declares: none set)
├── 404.html                      # branded not-found
├── functions/
│   └── api/contact.js            # Cloudflare Pages Function — relays mail via Resend, stores nothing
├── scripts/
│   └── build.js                  # inline CSS + sync CSP hash (zero deps)
├── assets/
│   ├── css/style.css             # source of truth for styles
│   ├── js/main.js                # single vanilla JS file
│   ├── img/                      # avif/webp/raster, favicons, OG image
│   └── fonts/                    # self-hosted Lora / DM Sans / Caveat woff2
├── _headers                      # security + cache headers (Cloudflare Pages)
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── package.json                  # one "build" script, no dependencies
```

---

## Credits

- **Client, content & practice:** Lucía Rico González — [Abogada de la Tierra](https://abogadadelatierra.es/) · Derecho Administrativo y Urbanismo (Alicante · toda España).
- **Design & development:** Miguel Payá Vañó — [miguelpv.dev](https://miguelpv.dev) · [GitHub @miguelpv26](https://github.com/miguelpv26).

Fonts: **Lora**, **DM Sans** and **Caveat**, all under the [SIL Open Font License 1.1](https://openfontlicense.org/).

## License

The **source code** — the HTML/CSS/JS I wrote, the Cloudflare Function and the build script — is released under the [MIT License](LICENSE). Use it, learn from it, build on it.

The **site content is not.** The **"Abogada de la Tierra" name and branding, all copy/text, the photographs of Lucía, and the logos** are © Lucía Rico González and are **not** covered by the MIT license. In short: **take the code, not the client's identity.** If you reuse the code, please also swap out anything of hers.

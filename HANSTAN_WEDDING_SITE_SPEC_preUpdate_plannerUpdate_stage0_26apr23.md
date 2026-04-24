# Hanstan Wedding Website — Complete Specification

**Domain:** hanstan.wedding
**Ceremony:** Sunday, June 7, 2026 at 2 PM
**Venue:** Willamette Mission State Park, 10991 Wheatland Road NE, Keizer, OR 97303
**Couple:** Hannah Joy Shipman & Ranjit Stanzin Sanyal

---

## 1. Repo Structure

```
F:\Wedding Website\hanstan-wedding\
├── index.html                    Homepage / save-the-date
├── styles.css                    Homepage + FAQ/registry base styles
├── package.json                  Deps (only @netlify/blobs)
├── _redirects                    Netlify redirect rules → functions
├── ve-loader.js                  Visual-element injector loader
├── css-panel.js                  CSS override panel (224 lines)
├── .gitattributes                Line-ending normalization
├── assets/                       Images (favicon, invitation, mosaics, OG)
├── data/                         Seed JSON for registry (gifts, copy, theme, ordering)
├── faq/                          FAQ page
├── registry/                     Gift registry page (+ registry.js 1199 lines, registry.css 1028 lines)
├── admin/                        Admin dashboard (admin.js 1673 lines, admin.css 900 lines)
└── netlify/functions/            Serverless endpoints (admin-write 204 lines, etc.)
```

No build tool. Static HTML/CSS/JS served directly by Netlify; backend is serverless functions writing to Netlify Blobs.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Plain HTML5 — no React/Vue/Next, no bundler |
| Scripting | Vanilla JS (ES6+ in registry/admin) |
| Styling | Plain CSS3 with custom properties, mobile-first, `clamp()` fluid typography, backdrop-filter glassmorphism |
| Fonts | Google Fonts: **Cormorant Garamond** (serif), **Inter** (sans), **Allura** (script) |
| Hosting | Netlify (static + functions) |
| Backend | Netlify Functions (ESM) + Netlify Blobs key-value store |
| Dependencies | `@netlify/blobs ^10.4.1` (only) |

---

## 3. Pages & Routes

### 3.1 Homepage — `/` (`index.html`)

Save-the-date invitation card.

- Centered card, max 680px, glassmorphic (backdrop blur)
- Background: mosaic image — `mosaic-background-portrait.png` on mobile, `mosaic-background-landscape.png` on desktop, with ivory overlay (~65% mobile / 60% desktop)
- Calendar mini-display with Sun June 7 circled
- "Save the Date" in Allura script; couple names in uppercase serif
- Heart-line CSS divider
- **Primary CTA:** RSVP → Google Form (`docs.google.com/forms/d/e/1FAIpQLSf74sZLrRd59ex2ASpOVFlV_foTcuie7g_HP8Cyie6BuViwsg/viewform`)
- **Secondary actions:** Open Map (Google Maps deep link), FAQ, Gift Registry, Add to Calendar (JS-generated `.ics` download)

### 3.2 FAQ — `/faq/` (`faq/index.html`)

Eleven questions via native `<details>` collapsibles with custom ± toggle pseudo-elements. Topics: ceremony time/place, arrival, parking ($5 day-use), dress code (semi-formal/garden party), indoor vs outdoor (outdoor ceremony, covered reception), photography (photographer Daniel Thomas), food (potluck encouraged), what to bring, lodging (Salem/Keizer), plus-ones and children (welcome, supervised kids' area), gift registry pointer.

High-contrast panel (92% opacity bg). Back-nav to home and registry.

### 3.3 Gift Registry — `/registry/`

Three-pane interactive registry. **Desktop ≥768px:** left rail (300px) + middle catalog + detail overlay. **Mobile:** single column, detail modal full-screen.

**Left rail:** site label `hanstan.wedding`, 4-line "How this works," category chips (Dream, Home, Adventure, Hobby, Group), budget slider ($0–$1000, $25 step, default $200), Show All / Clear All.

**Middle:** sticky "Gift Registry" header; sections in order — Dream (two columns: Stan's / Hannah's), Home, Adventure, Hobby, Just Outside Budget (3 slots: normal/dream/group), Price Unknown (variant gifts). Gift tiles: 108px saturated image, 18px title, 2-line description clamp, gold 18px price, Dream/Group badges, Pending (purple) / Claimed (gold) overlays, hover lift +2px.

**Detail modal** (right panel desktop / full overlay mobile):
- 220px hero image, status pill, price, badges, short + expandable long description, optional guest notes
- **If Available:** checkout block with two paths ("Send Funds (Recommended)" / "Purchase Personally"), payment grid (Venmo/PayPal/Zelle), preferred merchants list; group gifts add an amount input with $25/$50/$100/$250 presets
- **If Pending:** "Claim pending confirmation" message
- **If Claimed (single):** gifter message + couple reply
- **If Claimed (group):** thank-you note + contributor tabs (per-contributor message + reply)

**Ordering:** gifts sorted per `data/ordering.registry.json`; dream gifts pinned first in their sections.

### 3.4 Admin — `/admin/`

Token-protected (Bearer token in sessionStorage; server checks `ADMIN_WRITE_TOKEN` env). Draft / Publish workflow with version history and optimistic concurrency.

Tabs:
1. **Gifts** — master list + split-pane editor; title, price, section, dream/group flags, status, merchants, images, descriptions, contributors. Ordering subsection with 5 drag-reorderable tabs (Home, Adventure, Hobby, Dream–Stan, Dream–Hannah).
2. **Copy** — JSON editor for UI strings.
3. **Theme** — color pickers, radii, spacing, shadows; live preview.
4. **Import/Export** — batch JSON import, bundle export, undo-publish, undo-draft (local stack, max 10 snapshots).
5. **Diagnostics** — budget thresholds, categorization, filter/range tests.

Conflicts return 409 — no auto-merge. No session timeout; admin is desktop-only.

---

### 3.5 Planner — `/planner/`

Token-protected coordinator planning tool. Multi-user shared state via Netlify Blobs. Each coordinator has a unique token Stan distributes manually; token = identity (server-side lookup maps token → name). Single gate covers read + write. No device binding.

**Architecture:**
- Static page (`planner/index.html` + `planner.css` + `planner.js`)
- 5 functions: `planner-auth`, `planner-state`, `planner-snapshots`, `planner-coordinators`, `planner-audit`
- 1 shared lib: `_planner_lib/auth.mjs`
- State Blob: `planner/state-current.json` (one shared state for all coordinators, schemaVersion 6)
- Snapshot Blobs: `planner/snapshots/{ISO-ts}-{editor}.json` (one per save, last 200 retained)
- Coordinators registry Blob: `planner/coordinators.json` (server-side only, never sent to browsers)
- Audit log Blob: `planner/audit-log.json` (last 5000 entries)

**Tabs:** Focus, Tasks, People, History, Settings.
**Settings (master only) gains:** Coordinators panel (add/rename/remove with token entry), Snapshots panel (restore from any snapshot).

**Concurrency:** Last-write-wins. Auto-refresh every 30s when tab is foregrounded. Stale-edit banner appears if remote state changes while user has an editor modal open.

**Offline behavior:** Edits queue in localStorage `hanstan_planner_offline_queue` if a save fails. Background timer retries every 15s when `navigator.onLine`.

**Bootstrap:** First-ever load — if `planner/coordinators.json` Blob does not exist, the auth function uses the `PLANNER_MASTER_BOOTSTRAP_TOKEN` env var to recognize the master token and seeds the registry. The env var also serves as a fallback if the registry is ever deleted.

**Seed data:** First-ever load — if `planner/state-current.json` does not exist, function reads `data/planner-seed.json` (Stan's exported v5 state, 70 tasks, 27 contacts) and writes it as the initial state.

**Auth pattern:** `Authorization: Bearer <token>` header validated against `process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN` (master fallback) or registry Blob lookup. Same pattern as `admin-write-registry.mjs`. NOT shared with admin token — separate auth domain.

---

## 4. Data

### Gift schema

```json
{
  "giftId": "home-kettle",
  "title": "Electric gooseneck kettle",
  "shortDescription": "Precise pour-over friendly kettle.",
  "longDescription": "...",
  "images": ["/assets/invitation.png"],
  "categoryTags": { "home": true, "adventure": false, "hobby": false },
  "primarySection": "Home",
  "isDreamGift": false,
  "dreamOwner": null,
  "isGroupGift": false,
  "price": 125,
  "currency": "USD",
  "allowGifterProvidedVariant": false,
  "preferredMerchants": [
    { "merchantName": "Amazon", "merchantReason": "Easy checkout", "merchantURL": "..." }
  ],
  "alternativeMerchants": [],
  "acquisitionNotes": "",
  "status": "Available",
  "claimerName": "", "claimerEmail": "", "claimerMessage": "", "coupleReplyToClaimer": "",
  "contributors": [
    { "contributorName": "Ari", "contributorEmail": "...", "contributorMessage": "...", "coupleReplyToContributor": "..." }
  ],
  "groupThankYouNote": "",
  "guestNotes": ""
}
```

Status values: `Available`, `ClaimPendingConfirmation`, `Claimed`, `Hidden`.

### Seeded example gifts (6)

| ID | Section | Price | Status | Notes |
|---|---|---|---|---|
| home-kettle | Home | $125 | Available | |
| home-sheets | Home | $240 | Available | Hannah's Dream |
| adv-parkspass | Adventure | $80 | Pending | Claimed by Jordan |
| adv-cabin | Adventure | $420 | Claimed | Stan's Dream, Group, 2 contributors |
| hobby-watercolor | Hobby | $60 | Claimed | Hannah's Dream, claimed by Mina |
| hobby-boardgame | Hobby | $45 | Available | |

### Data files (`data/`)

- `gifts.json` — gift array
- `copy.registry.json` — all UI strings (siteLabel, leftRail, middle, right, overlay, budget config)
- `theme.tokens.json` — colors, radii, shadows, spacing, fonts
- `ordering.registry.json` — `sectionOrder` (Home/Adventure/Hobby) and `dreamOrder` (Stan/Hannah) arrays of gift IDs

### Persistence

Netlify Blobs store `hanstan-wedding-data`. Versioned snapshots: `versions/v000001/data/*.json` (published) and `versions/d000001/data/*.json` (draft). Meta at `meta/registry-current.json` tracks current versions + history. Second store `ve-overrides` holds visual-element overrides (max 30 revisions).

---

## 5. Features

### Homepage
- Responsive invitation card, calendar mini-display, glassmorphism
- RSVP (external Google Form), Map (Google Maps deep link), Add to Calendar (JS-generated `.ics`)

### FAQ
- Collapsible `<details>` Q&A, custom ± toggles, cross-page nav

### Registry
- Category chip filters + budget slider, scroll locator highlights active section
- Three-column tile grid; dream two-column sub-layout; Just-Outside-Budget and Price-Unknown sections
- Detail modal (desktop right-pane / mobile full overlay)
- Gift claim via **Netlify Forms** (`gift-claim`: giftId, title, gifterName, gifterEmail, giftMessage, submittedAtISO) — intent-to-gift only, no backend automation, shipping details "sent by email" manually
- **Payments (stubbed deep links):**
  - Venmo: `https://venmo.com/{handle}?txn=pay&amount={amount}&note={memo}`
  - PayPal: `https://paypal.me/{handle}/{amount}USD`
  - Zelle: alert with contact + memo (manual)
  - Config block live: `venmoHandle: 'Hannah-Shipman-10'`, `paypalMeLink: 'https://paypal.me/HShipman20'`, `zelleContact: 'hannah7of9@gmail.com'`
  - Group gifts accept custom amount; buttons disabled until valid amount entered

### Admin
- Token entry, version display, dirty indicator, Save Draft / Publish Live / Undo
- Drag-and-drop ordering (custom impl), batch JSON import with 14 validation checks, bundle export/import
- Local undo (sessionStorage, 10 snapshots) + server undo (revert to prior published snapshot)

---

## 6. Responsive & Mobile

| Breakpoint | Behavior |
|---|---|
| <360px | Tightened padding, reduced font sizes |
| 390×844 (mobile primary) | Portrait mosaic bg, clamp-scaled fonts, stacked card |
| ≥768px | Landscape mosaic bg, three-column registry, larger fonts |
| ≥1200px | Fixed font sizes, 900px max card width |

No hamburger (desktop has room; mobile uses footer links with dividers). Tap targets ≥44px. `prefers-reduced-motion` disables transitions; `prefers-contrast: high` thickens borders.

---

## 7. Theme & Styling

### Registry / admin (dark purple + gold)
- Rail bg `#1b1026`, panel bg `#0e0814`, card bg `#1e1430`
- Text primary `#f3ecff`, muted `#d9cce8`
- **Gold accent `#d8b55b`** — chip-active bg, prices, focus ring
- Chip-active text `#1b1026`, overlay `rgba(0,0,0,0.55)`, danger `#ff5a7a`

### Homepage (ivory + brown)
- Bg `#faf7f2`, text `#3d3a36`, muted `#4a4640`
- Button gradient `#5a5450` → `#3d3a36`, divider `#6a655d`

### Typography
| Use | Font | Size | Weight |
|---|---|---|---|
| Headings | Cormorant Garamond | `clamp(1.5rem, 5.5vw, 2.6rem)` | 600, 0.12em tracking |
| Body | Inter | 1rem | 400–500 |
| Script | Allura | `clamp(2.8rem, 9vw, 4.5rem)` | 400 |
| Form labels | Inter | 13–15px | 600 uppercase, 0.06em |

### Spacing
xs 6 / sm 10 / md 16 / lg 22 / xl 30 px.

### Radii
chip 14 / card 18 / tile 16 / modal 22 px.

### Shadows
chip `0 6px 16px rgba(0,0,0,.35)` · card `0 18px 60px rgba(0,0,0,.45)` · tile `0 10px 26px rgba(0,0,0,.35)` · modal `0 22px 90px rgba(0,0,0,.55)`.

### Motifs
Glassmorphism, layered mosaic+overlay+card, monochromatic browns (home) / dark-purple + gold accents (registry), serif-heavy typography, generous whitespace, dot/circle toggles on chips.

---

## 8. Assets

| File | Size | Use |
|---|---|---|
| `assets/favicon.png` | 56×56 | Favicon (all pages) |
| `assets/invitation.png` | 924×1316 | Invitation imagery |
| `assets/mosaic-background-portrait.png` | 896×1344 | Mobile bg |
| `assets/mosaic-background-landscape.png` | 1344×896 | Desktop bg |
| `assets/og-image.png` | 1204×644 | OG/Twitter card |
| `data/bambooChime.jpg` | 225×225 | Example gift image |

Icons are CSS pseudo-elements (± via Unicode) plus SVG shape dividers (wave, curve, triangle, zigzag, tilt) generated by `ve-loader.js`.

---

## 9. Integrations

- **Google Fonts** (preconnect to fonts.googleapis.com + fonts.gstatic.com)
- **Google Forms** — RSVP (external)
- **Google Maps** — venue directions (deep link)
- **Netlify Functions** endpoints:
  - `GET /.netlify/functions/data-gifts`
  - `GET /.netlify/functions/data-copy-registry`
  - `GET /.netlify/functions/data-theme-tokens`
  - `GET /.netlify/functions/data-ordering-registry`
  - `GET /.netlify/functions/admin-read-registry-bundle`
  - `POST /.netlify/functions/admin-write-registry`
  - `POST /.netlify/functions/admin-undo-registry`
  - `GET|POST /.netlify/functions/ve-save`
  - `GET /.netlify/functions/registry-version`
- **Netlify Blobs** — stores `hanstan-wedding-data`, `ve-overrides`
- **Netlify Forms** — `gift-claim` form
- **Payment apps** — Venmo / PayPal / Zelle deep links (stubbed)

---

## 10. Build & Deploy

No build step. Static assets + Netlify Functions deployed as-is.

### `_redirects`
```
/data/gifts.json              /.netlify/functions/data-gifts            200
/data/copy.registry.json      /.netlify/functions/data-copy-registry    200
/data/theme.tokens.json       /.netlify/functions/data-theme-tokens     200
/data/ordering.registry.json  /.netlify/functions/data-ordering-registry 200
```

### Environment variables
- `ADMIN_WRITE_TOKEN` — Bearer token for admin writes (Netlify settings)

### Caching
Data endpoints: `Cache-Control: public, max-age=0, must-revalidate`. VE overrides: `no-cache`.

---

## 11. SEO & Meta

### Homepage
```
<title>Hannah & Ranjit</title>
og:title "Hannah & Ranjit"
og:description "Sunday, June 7, 2026 · Willamette Mission State Park"
og:image https://hanstan.wedding/assets/og-image.png
og:url https://hanstan.wedding/
twitter:card summary_large_image (matching tags)
```

### FAQ
```
<title>FAQ · Hannah & Ranjit</title>
og:description "Frequently asked questions about the wedding on June 7, 2026."
og:url https://hanstan.wedding/faq/
```

### Registry
```
<title>Gift Registry · hanstan.wedding</title>
```

No robots.txt, no sitemap, no schema.org markup. Favicon `/assets/favicon.png` on all pages. UTF-8, mobile viewport meta everywhere.

---

## 12. Known Gaps & Stubs

| Area | Status | Action |
|---|---|---|
| Gift-claim backend | Form captures intent only, no automation | Manually review, email shipping, update status in admin |
| Shipping email | Referenced but not implemented | Manual send |
| VE system | Loader injected but no registry-facing admin UI | Out-of-scope or future |
| Draft/publish conflicts | Rejected with 409, no merge | Operator reloads and re-edits |
| Admin session | sessionStorage, no timeout | Acceptable for single-operator use |
| Admin mobile | Desktop-only layout | Acceptable |
| README | None in repo | This SPEC covers it |

---

## 13. Email Infrastructure

Guest-facing email at the `hanstan.wedding` domain. Set up 2026-04-14.

**Provider:** Zoho Mail, Forever Free plan. 5 users max, 5 GB per user, 1 domain, 5 addresses per user cap. Web + Zoho mobile apps only (no IMAP/POP on free tier).

**Account model:** two users.
- **Stan (Super Administrator)** — `stan@hanstan.wedding`. Holds the shared guest-facing aliases; both partners log into this account to handle guest correspondence.
- **Hannah** — `hannah@hanstan.wedding`. Personal branded address; separate inbox.

**Aliases on Stan's account:**
- `stan@hanstan.wedding` (primary)
- `hello@hanstan.wedding` (general inbound)
- `rsvp@hanstan.wedding`
- `registry@hanstan.wedding`
- `travel@hanstan.wedding` — **deferred.** Site has no Travel page yet; alias will be added once that content exists. Current slot count: 4 of 5 used.

**DNS records (Namecheap, Advanced DNS):**

| Purpose | Type | Host | Value | Priority |
|---|---|---|---|---|
| Ownership verification | TXT | @ | `zoho-verification=zb51932190.zmverify.zoho.com` | — |
| MX 1 | MX | @ | `mx.zoho.com` | 10 |
| MX 2 | MX | @ | `mx2.zoho.com` | 20 |
| MX 3 | MX | @ | `mx3.zoho.com` | 50 |
| SPF | TXT | @ | `v=spf1 include:zohomail.com ~all` | — |
| DKIM | TXT | `zmail._domainkey` | `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCU/PMt0YXzHjcSsoYGpDep9Kd1lT0eZeZPljDnTESqnACz/P+Gnf2T55exRPNA88goasKNxHYje5orTFmS8siVCNJ/yjWk9jNR0AQxMCGajK0jnhxZ7Bm6MWnLtbFXfe5cBHlqyT1s1DyVB+snzY2nrMI/nODppEFZ2oXuZ/EUY5wIDAQAB` | — |
| DMARC | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@hanstan.wedding` | — |

All records verified green in Zoho admin console.

**Mail flow confirmed:** inbound test (Gmail → hello@hanstan.wedding) arrived. Outbound test (hello@ → Hannah's Gmail) landed in spam — expected for a new domain with zero sender reputation.

**Sender reputation warmup** (in progress): send test messages to ~10 trusted recipients over the next 2 weeks, ask each to mark Not Spam. Reputation is per-domain, so all aliases inherit the reputation once built. DMARC remains at `p=none` for monitoring; tighten to `p=quarantine` after 2 weeks of clean reports.

**What's still pending:**
- Install Zoho Mail app on both phones; both partners sign into Stan's account
- Share Stan's account credentials between partners (via password manager)
- Add signature to Stan's account once guest correspondence begins
- Add `travel@` alias when the Travel page ships
- Promote DMARC policy from `p=none` to `p=quarantine` ~2 weeks post-launch

**Cost:** $0. Zoho free tier is permanent at this usage level.

---

## 14. Summary

| | |
|---|---|
| Site type | Wedding invitation + interactive gift registry |
| Stack | Vanilla HTML/CSS/JS + Netlify Functions + Blobs |
| Pages | Home, FAQ, Registry, Admin |
| Data | Versioned JSON snapshots in Netlify Blobs |
| Payments | Deep links (Venmo/PayPal/Zelle) to Hannah's accounts |
| Access control | Env-var Bearer token for admin |
| Responsive | Mobile-first, three breakpoints, no hamburger |
| Ceremony | June 7, 2026 · 2 PM · Willamette Mission State Park |
| RSVP | External Google Form |

---

### §14.X — `syntheticAuditEntries` optional POST field (added 2026-04-24, Phase C.3c Part 1)

The `/.netlify/functions/planner-state` POST handler accepts an optional `syntheticAuditEntries: [...]` field alongside the standard `state` + `by` fields. When present, each entry must contain at minimum `ts`, `by`, `action`, `target`, and `summary`; may optionally contain `entity`, `field`, `from`, `to`. Valid entries are appended to `audit-log.json` via the same `appendAudit()` helper that handles `diffStates()` output.

**Purpose:** one-shot migrations that inject historical audit entries with their original timestamps (e.g., the Elsie 2026-04-22 backfill from Phase C.3c Part 2, which replays the 8 reconstructed schedule-tab mutations captured in `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`).

**Lifecycle:** not intended as a long-lived API. Callers outside of explicit migrations should not use this field. Future `diffStates()` extensions (Stage 1 scope) will subsume the need for synthetic injection for all new entity types.

**Validation failure:** a single missing-required-field in any entry causes a 400 response with the specific offending entry index and the missing field names.

**Backwards compatibility:** absent this field, POST behavior is unchanged.

---

## Appendix — Verbatim Content

Every user-visible string, every data file, and every page markup, in full. This appendix is authoritative; the summaries above are convenience.

## A1. Directory Manifest

**Repo root:** `.gitattributes`, `_redirects`, `package.json`, `css-panel.js`, `ve-loader.js`, `styles.css`, `index.html`

**`assets/`:** `favicon.png`, `invitation.png`, `mosaic-background-landscape.png`, `mosaic-background-portrait.png`, `og-image.png`

**`data/`:** `bambooChime.jpg`, `copy.registry.json`, `gifts.json`, `ordering.registry.json`, `theme.tokens.json`

**`netlify/functions/`:** `admin-read-registry-bundle.mjs`, `admin-undo-registry.mjs`, `admin-write-registry.mjs`, `data-copy-registry.mjs`, `data-gifts.mjs`, `data-ordering-registry.mjs`, `data-theme-tokens.mjs`, `registry-version.mjs`, `ve-save.mjs`

**Sub-pages:** `admin/` (index.html + admin.css + admin.js), `faq/` (index.html + faq.css), `registry/` (index.html + registry.css + registry.js)

---

## A2. Homepage — `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hannah & Ranjit</title>

  <!-- OpenGraph Meta Tags -->
  <meta property="og:title" content="Hannah & Ranjit">
  <meta property="og:description" content="Sunday, June 7, 2026 · Willamette Mission State Park">
  <meta property="og:image" content="https://hanstan.wedding/assets/og-image.png">
  <meta property="og:url" content="https://hanstan.wedding/">
  <meta property="og:type" content="website">

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Hannah & Ranjit">
  <meta name="twitter:description" content="Sunday, June 7, 2026 · Willamette Mission State Park">
  <meta name="twitter:image" content="https://hanstan.wedding/assets/og-image.png">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="assets/favicon.png">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Allura&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="/.netlify/functions/ve-save">
  <script src="/ve-loader.js" defer></script>
</head>
<body>
  <main class="card">
    <!-- Calendar Header -->
    <div class="calendar-header">
      <span class="month">JUNE</span>
      <div class="calendar-week">
        <div class="day-col"><span class="day-name">Thu</span><span class="day-num">4</span></div>
        <div class="day-col"><span class="day-name">Fri</span><span class="day-num">5</span></div>
        <div class="day-col"><span class="day-name">Sat</span><span class="day-num">6</span></div>
        <div class="day-col highlight">
          <span class="day-name">Sun</span>
          <span class="day-num circled">7</span>
        </div>
        <div class="day-col"><span class="day-name">Mon</span><span class="day-num">8</span></div>
        <div class="day-col"><span class="day-name">Tue</span><span class="day-num">9</span></div>
        <div class="day-col"><span class="day-name">Wed</span><span class="day-num">10</span></div>
      </div>
      <div class="heart-line"></div>
    </div>

    <!-- Save the Date Script -->
    <p class="save-the-date">Save the date!</p>

    <!-- Invitation Text -->
    <p class="invited-line">YOU ARE INVITED TO THE WEDDING OF</p>

    <h1 class="names">
      <span class="name">Hannah Joy Shipman</span>
      <span class="ampersand">&</span>
      <span class="name">Ranjit Stanzin Sanyal</span>
    </h1>

    <p class="datetime">SUNDAY, JUNE 7, 2026 AT 2 PM</p>

    <address class="location">
      <span class="venue">WILLAMETTE MISSION STATE PARK</span>
      <span class="address">10991 Wheatland Road NE,</span>
      <span class="address">Keizer, OR 97303</span>
    </address>

    <p class="reception">RECEPTION TO FOLLOW</p>

    <!-- RSVP Button -->
    <a href="https://docs.google.com/forms/d/e/1FAIpQLSf74sZLrRd59ex2ASpOVFlV_foTcuie7g_HP8Cyie6BuViwsg/viewform?pli=1"
       class="rsvp-btn"
       target="_blank"
       rel="noopener">
      RSVP
    </a>

    <!-- Secondary Actions -->
    <div class="secondary-actions">
      <a href="https://maps.google.com/?q=Willamette+Mission+State+Park+10991+Wheatland+Road+NE+Keizer+OR+97303"
         target="_blank"
         rel="noopener"
         class="secondary-link">
        Open Map
      </a>
      <span class="divider">·</span>
      <a href="/faq/" class="secondary-link">FAQ</a>
      <span class="divider">·</span>
      <a href="/registry/" class="secondary-link">Gift Registry</a>
      <span class="divider">·</span>
      <a href="#"
         class="secondary-link"
         id="calendar-link">
        Add to Calendar
      </a>
    </div>
  </main>

  <script>
    // Generate and download .ics file
    document.getElementById('calendar-link').addEventListener('click', function(e) {
      e.preventDefault();

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Hannah & Ranjit Wedding//EN',
        'BEGIN:VEVENT',
        'UID:hannah-ranjit-wedding-2026@hanstan.wedding',
        'DTSTAMP:20260607T140000Z',
        'DTSTART:20260607T210000Z',
        'DTEND:20260608T040000Z',
        'SUMMARY:Hannah & Ranjit Wedding',
        'DESCRIPTION:Wedding ceremony at 2 PM. Reception to follow.',
        'LOCATION:Willamette Mission State Park\\, 10991 Wheatland Road NE\\, Keizer\\, OR 97303',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'hannah-ranjit-wedding.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });
  </script>
  <script src="/css-panel.js"></script>
</body>
</html>
```

---

## A3. FAQ Page — `faq/index.html` (all questions and answers verbatim)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FAQ · Hannah &amp; Ranjit</title>

  <meta property="og:title" content="FAQ · Hannah &amp; Ranjit">
  <meta property="og:description" content="Frequently asked questions about the wedding on June 7, 2026.">
  <meta property="og:image" content="https://hanstan.wedding/assets/og-image.png">
  <meta property="og:url" content="https://hanstan.wedding/faq/">
  <meta property="og:type" content="website">

  <link rel="icon" type="image/png" href="/assets/favicon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Allura&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/faq/faq.css">
  <link rel="stylesheet" href="/.netlify/functions/ve-save">
  <script src="/ve-loader.js" defer></script>
</head>
<body>
  <main class="card faq-card">
    <header class="faq-header">
      <p class="faq-kicker">Hannah &amp; Ranjit · June 7, 2026</p>
      <h1 class="faq-title">Questions &amp; Answers</h1>
      <p class="faq-subtitle">WILLAMETTE MISSION STATE PARK · KEIZER, OR</p>
      <nav class="faq-nav">
        <a href="/" class="secondary-link">← Back to Invitation</a>
        <span class="divider">·</span>
        <a href="/registry/" class="secondary-link">Gift Registry</a>
      </nav>
    </header>

    <div class="faq-panel">

      <details class="faq-item">
        <summary>When and where is the ceremony?</summary>
        <div class="faq-answer">
          <p>The ceremony begins at <strong>2 PM on Sunday, June 7, 2026</strong> at Willamette Mission State Park, 10991 Wheatland Road NE, Keizer, OR 97303. The reception follows immediately after.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>What time should I arrive?</summary>
        <div class="faq-answer">
          <p>Please plan to arrive by <strong>1:30 PM</strong> so you have time to park, find your seat, and settle in before the 2 PM ceremony.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>Is there parking at the venue?</summary>
        <div class="faq-answer">
          <p>Yes. Willamette Mission State Park has on-site parking. An Oregon State Parks day-use fee ($5) applies — you can pay at the entrance kiosk. We recommend arriving a few minutes early to allow for that.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>What is the dress code?</summary>
        <div class="faq-answer">
          <p><strong>Semi-formal / garden party attire.</strong> The ceremony is outdoors, so comfortable shoes are a wise choice. Expect warm Oregon June weather — light layers for the evening are a good idea.</p>
          <p>Feel free to wear any color you like; there is no restricted palette for guests.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>Is the ceremony indoors or outdoors?</summary>
        <div class="faq-answer">
          <p>The ceremony will be held <strong>outdoors</strong> in the park. The reception area is covered. Oregon summers are typically warm and dry, but we will have a contingency plan if the weather is unkind.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>Can I take photos during the ceremony?</summary>
        <div class="faq-answer">
          <p>We ask that guests keep phones away and be fully present during the ceremony itself — our photographer Daniel Thomas will be capturing everything beautifully. You are absolutely welcome to take photos during the reception.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>What food will be served?</summary>
        <div class="faq-answer">
          <p>The reception will feature a celebration meal. Dietary information collected via RSVP will be used to accommodate restrictions. More details will be shared closer to the date.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>What should I bring?</summary>
        <div class="faq-answer">
          <p>Bring <strong>weather-appropriate clothing</strong> — check the forecast a few days beforehand. You're welcome to bring casual clothes to change into after the ceremony if you'd like to participate in lawn games and other activities.</p>
          <p>If you have a favorite <strong>lawn game</strong>, feel free to bring it along! We'll have space set aside for games and activities throughout the afternoon.</p>
          <p>We'd also love it if you could bring a <strong>potluck food item</strong> to share. Finger foods and salads work best since we have limited food heating capability at the venue. If you're planning to bring something, please let us know via RSVP so we can coordinate.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>Where should I stay?</summary>
        <div class="faq-answer">
          <p>The park is located between Salem and Keizer, Oregon. Nearby accommodation options include hotels in Salem (approx. 15 minutes south) and Keizer (approx. 10 minutes east). We recommend booking early — summer weekends fill up quickly in the Willamette Valley.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>Can I bring a plus-one or children?</summary>
        <div class="faq-answer">
          <p>Invitations are generally extended to the family of the guest(s) included. If your invitation is addressed to you, you are welcome to bring a plus-one or friend so long as you specify that on the RSVP form or, alternatively, have your friend fill out a separate RSVP form. The link to the RSVP form can be found on this website, and we recommend filling it out.</p>
          <p>Children are welcome with the caveat that the open venue style carries sound very easily; space will be allotted for a kids' area approximately within sight of the ceremony area. Parents must volunteer to assist with supervising the children present throughout the ceremony and reception.</p>
          <p>If you have other questions about your invitation, please reach out to us directly.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary>Do you have a gift registry?</summary>
        <div class="faq-answer">
          <p>Yes — you can browse our registry at <a href="/registry/">hanstan.wedding/registry</a>. Your presence is the greatest gift; the registry is simply there if you'd like to give something.</p>
        </div>
      </details>

    </div>

    <div class="faq-cta">
      <p class="reception">Still have questions? Reach out — we're happy to help.</p>
      <div class="secondary-actions">
        <a href="/" class="secondary-link">← Back to Invitation</a>
        <span class="divider">·</span>
        <a href="/registry/" class="secondary-link">Gift Registry</a>
        <span class="divider">·</span>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSf74sZLrRd59ex2ASpOVFlV_foTcuie7g_HP8Cyie6BuViwsg/viewform?pli=1"
           target="_blank" rel="noopener" class="secondary-link">RSVP</a>
      </div>
    </div>
  </main>
  <script src="/css-panel.js"></script>
</body>
</html>
```

---

## A4. Registry Page Markup — `registry/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gift Registry · hanstan.wedding</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Allura&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="icon" type="image/png" href="/assets/favicon.png" />
  <link rel="stylesheet" href="./registry.css" />
  <link rel="stylesheet" href="/.netlify/functions/ve-save">
  <script src="/ve-loader.js" defer></script>

  <!-- Netlify Forms stub -->
  <form name="gift-claim" data-netlify="true" netlify-honeypot="bot-field" hidden>
    <input name="bot-field" />
    <input name="giftId" />
    <input name="giftTitle" />
    <input name="isGroupGift" />
    <input name="path" />
    <input name="gifterName" />
    <input name="gifterEmail" />
    <textarea name="giftMessage"></textarea>
    <input name="submittedAtISO" />
  </form>
</head>
<body>
  <div class="app" id="app">

    <!-- LEFT RAIL -->
    <aside class="rail" aria-label="Filters and instructions">
      <div class="rail__inner">
        <div class="rail__site" id="railSiteLabel"></div>

        <section class="rail__how" aria-label="How this works">
          <div class="rail__howTitle" id="howTitle"></div>
          <ul class="rail__howList" id="howList"></ul>
        </section>

        <section class="rail__controls" aria-label="Filters">
          <div class="rail__chips" id="chipStack"></div>

          <div class="rail__budget" aria-label="Budget slider">
            <div class="rail__budgetRow">
              <div class="rail__budgetLabel" id="budgetLabel"></div>
              <div class="rail__budgetValue" id="budgetValue"></div>
            </div>
            <input id="budgetSlider" class="rail__budgetSlider" type="range" />
          </div>

          <div class="rail__clear">
            <button type="button" class="btn btn--ghost" id="btnShowAll"></button>
            <button type="button" class="btn btn--ghost" id="btnClearAll"></button>
          </div>
        </section>
      </div>
    </aside>

    <!-- MIDDLE (scrollable catalog) -->
    <main class="middle" aria-label="Gift catalog">
      <div class="middle__sticky">
        <h2 class="middle__title" id="middleTitle"></h2>
      </div>

      <div class="middle__scroll" id="middleScroll">

        <!-- Dream gifts block -->
        <section class="dream" id="dreamBlock" aria-label="Dream gifts">
          <div class="dream__grid">
            <div class="dream__col">
              <h3 class="h3" id="dreamStanTitle"></h3>
              <div class="tiles" id="dreamStan"></div>
            </div>
            <div class="dream__col">
              <h3 class="h3" id="dreamHannahTitle"></h3>
              <div class="tiles" id="dreamHannah"></div>
            </div>
          </div>
        </section>

        <!-- Home section -->
        <section class="section" id="sectionHome" data-section="Home">
          <h3 class="section__title" id="sectionHomeTitle"></h3>
          <div class="tiles" id="tilesHome"></div>
        </section>

        <!-- Adventure section -->
        <section class="section" id="sectionAdventure" data-section="Adventure">
          <h3 class="section__title" id="sectionAdventureTitle"></h3>
          <div class="tiles" id="tilesAdventure"></div>
        </section>

        <!-- Hobby section -->
        <section class="section" id="sectionHobby" data-section="Hobby">
          <h3 class="section__title" id="sectionHobbyTitle"></h3>
          <div class="tiles" id="tilesHobby"></div>
        </section>

        <!-- Outside budget section -->
        <section class="outside" id="outsideBudget">
          <h3 class="section__title" id="outsideTitle"></h3>
          <p class="outside__blurb" id="outsideBlurb"></p>
          <div class="outside__slots">
            <div class="outside__slot">
              <div class="tiles tiles--mini" id="outsideSlotNormal"></div>
            </div>
            <div class="outside__slot">
              <div class="tiles tiles--mini" id="outsideSlotDream"></div>
            </div>
            <div class="outside__slot">
              <div class="tiles tiles--mini" id="outsideSlotGroup"></div>
            </div>
          </div>
        </section>

        <!-- Price unknown section -->
        <section class="section" id="priceUnknownBlock">
          <div class="tiles" id="tilesUnknown"></div>
        </section>

      </div><!-- end middle__scroll -->
    </main>

    <!-- MODAL -->
    <div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
     <div class="modal__backdrop" id="modalBackdrop" aria-hidden="true"></div>
      <div class="modal__panel">
        <div class="modal__header">
          <h2 class="modal__title" id="modalTitle"></h2>
          <button class="modal__close" id="modalClose" aria-label="Close">&times;</button>
        </div>
        <div class="modal__body">
          <div class="modal__left">
            <form class="gift-form" id="giftForm" name="gift-claim" netlify>
              <input type="hidden" id="formGiftId" name="giftId" />
              <input type="hidden" id="formPath" name="path" />

              <div class="form__row">
                <label class="form__label" id="labelName" for="inputName"></label>
                <input class="form__input" id="inputName" name="gifterName" type="text" autocomplete="name" />
                <span class="form__req" id="reqName"></span>
              </div>
              <div class="form__row">
                <label class="form__label" id="labelEmail" for="inputEmail"></label>
                <input class="form__input" id="inputEmail" name="gifterEmail" type="email" autocomplete="email" />
                <span class="form__req" id="reqEmail"></span>
              </div>
              <div class="form__row">
                <label class="form__label" id="labelMsg" for="inputMsg"></label>
                <textarea class="form__input form__textarea" id="inputMsg" name="giftMessage"></textarea>
                <span class="form__req" id="reqMsg"></span>
              </div>

              <p class="form__shipping" id="shippingNote"></p>
              <p class="form__error" id="formError"></p>

              <div class="form__actions">
                <button type="submit" class="btn btn--primary" id="btnSubmit"></button>
                <button type="button" class="btn btn--ghost" id="btnCancel"></button>
              </div>
            </form>
          </div>
          <div class="modal__right">
            <h3 class="modal__rightTitle" id="modalRightTitle"></h3>
            <ul class="modal__rightList" id="modalRightList"></ul>
            <div class="modal__rightMerchant" id="modalRightMerchant"></div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- end .app -->

<!-- DETAIL MODAL -->
<div class="detailModal" id="detailModal" hidden>
  <div class="detailModal__header">
    <button type="button" class="detailModal__back" id="detailModalBack">&larr; Back to gifts</button>
  </div>
  <div class="detailModal__scroll" id="detailModalScroll"></div>
</div>

  <script src="./registry.js"></script>
  <script src="/css-panel.js"></script>
</body>
</html>
```

---

## A5. Admin Page Markup — `admin/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registry Admin · hanstan.wedding</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Allura&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="icon" type="image/png" href="/assets/favicon.png" />
  <link rel="stylesheet" href="./admin.css" />
</head>
<body>
  <main class="admin">

    <header class="admin__header">
      <h1 class="admin__title">Registry Admin</h1>
      <p class="admin__subtitle">hanstan.wedding · Phase 2 dashboard</p>
    </header>

    <!-- Tab navigation -->
    <nav class="admin__tabs" id="tabNav" aria-label="Admin tabs">
      <button class="tabBtn tabBtn--active" data-tab="gifts">Gifts</button>
      <button class="tabBtn" data-tab="copy">Copy</button>
      <button class="tabBtn" data-tab="theme">Theme</button>
      <button class="tabBtn" data-tab="importexport">Import / Export</button>
      <button class="tabBtn" data-tab="diagnostics">Diagnostics</button>
    </nav>

    <!-- TAB: GIFTS -->
    <section class="tabContent tabContent--active" id="tab-gifts">

      <div class="admin__row admin__row--toolbar">
        <input class="input" id="giftSearch" type="search" placeholder="Search gifts…" aria-label="Search gifts" />
        <select class="select" id="giftFilter" aria-label="Filter by section">
          <option value="all">All sections</option>
          <option value="Home">Home</option>
          <option value="Adventure">Adventure</option>
          <option value="Hobby">Hobby</option>
        </select>
        <select class="select" id="giftSort" aria-label="Sort by">
          <option value="title">Title A–Z</option>
          <option value="price">Price ↑</option>
          <option value="status">Status</option>
        </select>
        <button class="btn btn--primary" id="btnAddGift">+ Add gift</button>
      </div>

      <div class="admin__splitPane">
        <div class="admin__master" id="giftsMaster" aria-label="Gift list"></div>
        <div class="admin__editor" id="giftEditorPanel" aria-label="Gift editor"></div>
      </div>

      <div class="admin__ordering">
        <h2 class="admin__sectionTitle">Ordering</h2>
        <nav class="admin__tabs admin__tabs--sm" aria-label="Ordering sub-tabs">
          <button class="tabBtn tabBtn--sm tabBtn--active" data-ordertab="Home">Home</button>
          <button class="tabBtn tabBtn--sm" data-ordertab="Adventure">Adventure</button>
          <button class="tabBtn tabBtn--sm" data-ordertab="Hobby">Hobby</button>
          <button class="tabBtn tabBtn--sm" data-ordertab="DreamStan">Dream – Stan</button>
          <button class="tabBtn tabBtn--sm" data-ordertab="DreamHannah">Dream – Hannah</button>
        </nav>
        <ul class="ordering__list" id="orderingList" aria-label="Drag to reorder"></ul>
      </div>

    </section>

    <!-- TAB: COPY -->
    <section class="tabContent" id="tab-copy">
      <h2 class="admin__sectionTitle">Copy — copy.registry.json</h2>
      <div class="copy__grid" id="copyGrid"></div>
    </section>

    <!-- TAB: THEME -->
    <section class="tabContent" id="tab-theme">
      <h2 class="admin__sectionTitle">Theme Tokens — theme.tokens.json</h2>
      <div class="theme__grid" id="themeGrid"></div>
      <div class="theme__preview" id="themePreviewBox" aria-label="Live theme preview">
        <span class="preview-text-primary">Primary text</span>
        <span class="preview-text-muted">Muted text</span>
        <span class="preview-chip">Chip</span>
        <span class="preview-tile">Tile</span>
      </div>
    </section>

    <!-- TAB: IMPORT / EXPORT -->
    <section class="tabContent" id="tab-importexport">
      <h2 class="admin__sectionTitle">Batch Import</h2>

      <div class="admin__panel">
        <div class="admin__row">
          <label class="label" for="batchFileInput">Or upload a JSON file:</label>
          <input class="input" type="file" id="batchFileInput" accept=".json" />
        </div>
        <label class="label" for="batchInput">Paste batch JSON array of gifts:</label>
        <textarea class="ta" id="batchInput" rows="10" placeholder='[{"giftId": "…", "title": "…", …}]'></textarea>
        <div class="admin__row">
          <button class="btn btn--ghost" id="btnBatchPreview">Preview</button>
          <button class="btn btn--primary" id="btnBatchImport">Import</button>
        </div>
        <div class="msg" id="batchMsg"></div>
        <div class="batchPreview" id="batchPreviewArea"></div>
      </div>

      <h2 class="admin__sectionTitle" style="margin-top:2rem;">Export Bundle</h2>
      <div class="admin__panel">
        <p class="admin__hint">Downloads all four data files as a single <code>.json</code> bundle.</p>
        <button class="btn btn--primary" id="btnExportBundle">Export bundle</button>
        <div class="msg" id="exportMsg"></div>
      </div>

      <h2 class="admin__sectionTitle" style="margin-top:2rem;">Import Bundle</h2>
      <div class="admin__panel">
        <p class="admin__hint">Restores all data from a previously exported bundle file.</p>
        <input class="input" type="file" id="importFileInput" accept=".json" />
        <button class="btn btn--primary" id="btnImportBundle" disabled>Import bundle</button>
        <div class="msg" id="importMsg"></div>
      </div>

      <h2 class="admin__sectionTitle" style="margin-top:2rem;">Undo</h2>
      <div class="admin__panel">
        <p class="admin__hint">Reverts to the last saved snapshot.</p>
        <button class="btn btn--ghost" id="btnUndo">Undo last action</button>
        <div class="msg" id="undoMsg"></div>
      </div>
    </section>

    <!-- TAB: DIAGNOSTICS -->
    <section class="tabContent" id="tab-diagnostics">
      <h2 class="admin__sectionTitle">Diagnostics</h2>
      <div class="admin__panel">
        <label class="label" for="diagBudget">Budget threshold ($):</label>
        <input class="input" id="diagBudget" type="number" value="200" min="0" step="10" />
        <button class="btn btn--primary" style="margin-top:0.75rem;" id="btnRunDiag">Run diagnostics</button>
      </div>
      <div class="diagResults" id="diagResults"></div>
    </section>

  </main>

  <script src="./admin.js"></script>
</body>
</html>
```

---

## A6. `data/gifts.json` (full gift catalog, verbatim)

```json
{
  "gifts": [
    {
      "giftId": "home-kettle",
      "title": "Electric gooseneck kettle",
      "shortDescription": "Precise pour-over friendly kettle.",
      "longDescription": "A reliable electric gooseneck kettle with temperature control for tea and coffee. We'll use it constantly.",
      "images": ["/assets/invitation.png"],
      "categoryTags": { "home": true, "adventure": false, "hobby": false },
      "primarySection": "Home",
      "isDreamGift": false,
      "dreamOwner": null,
      "isGroupGift": false,
      "price": 125,
      "currency": "USD",
      "allowGifterProvidedVariant": false,
      "preferredMerchants": [
        { "merchantName": "Amazon", "merchantReason": "Easy checkout", "merchantURL": "https://www.amazon.com" }
      ],
      "alternativeMerchants": [],
      "acquisitionNotes": "",
      "status": "Available",
      "claimerName": "",
      "claimerEmail": "",
      "claimerMessage": "",
      "coupleReplyToClaimer": "",
      "contributors": [],
      "groupThankYouNote": ""
    },
    {
      "giftId": "home-linen",
      "title": "Linen sheet set",
      "shortDescription": "Breathable, durable bedding.",
      "longDescription": "A linen sheet set that gets softer with time. Neutral tone preferred.",
      "images": ["/assets/mosaic-background-landscape.png"],
      "categoryTags": { "home": true, "adventure": false, "hobby": false },
      "primarySection": "Home",
      "isDreamGift": true,
      "dreamOwner": "Hannah",
      "isGroupGift": false,
      "price": 240,
      "currency": "USD",
      "allowGifterProvidedVariant": false,
      "preferredMerchants": [
        { "merchantName": "Target", "merchantReason": "Easy returns", "merchantURL": "https://www.target.com" }
      ],
      "alternativeMerchants": [],
      "acquisitionNotes": "",
      "status": "Available",
      "claimerName": "",
      "claimerEmail": "",
      "claimerMessage": "",
      "coupleReplyToClaimer": "",
      "contributors": [],
      "groupThankYouNote": ""
    },
    {
      "giftId": "adv-nationalparks-pass",
      "title": "Annual National Parks pass",
      "shortDescription": "A year of park wandering.",
      "longDescription": "We'll use this for small spontaneous trips and bigger adventures.",
      "images": ["/assets/og-image.png"],
      "categoryTags": { "home": false, "adventure": true, "hobby": false },
      "primarySection": "Adventure",
      "isDreamGift": false,
      "dreamOwner": null,
      "isGroupGift": false,
      "price": 80,
      "currency": "USD",
      "allowGifterProvidedVariant": false,
      "preferredMerchants": [
        { "merchantName": "NPS", "merchantReason": "Official source", "merchantURL": "https://www.nps.gov" }
      ],
      "alternativeMerchants": [],
      "acquisitionNotes": "",
      "status": "ClaimPendingConfirmation",
      "claimerName": "Jordan",
      "claimerEmail": "jordan@example.com",
      "claimerMessage": "For future hikes and sunsets.",
      "coupleReplyToClaimer": "We can already feel the trail dust. Thank you.",
      "contributors": [],
      "groupThankYouNote": ""
    },
    {
      "giftId": "adv-cabin-weekend",
      "title": "Cabin weekend getaway",
      "shortDescription": "A quiet reset in the trees.",
      "longDescription": "Two nights somewhere green and quiet. This is a dream-level reset button.",
      "images": ["/assets/mosaic-background-portrait.png"],
      "categoryTags": { "home": false, "adventure": true, "hobby": false },
      "primarySection": "Adventure",
      "isDreamGift": true,
      "dreamOwner": "Stan",
      "isGroupGift": true,
      "price": 420,
      "currency": "USD",
      "allowGifterProvidedVariant": false,
      "preferredMerchants": [
        { "merchantName": "Airbnb", "merchantReason": "Inventory variety", "merchantURL": "https://www.airbnb.com" }
      ],
      "alternativeMerchants": [],
      "acquisitionNotes": "",
      "status": "Claimed",
      "claimerName": "",
      "claimerEmail": "",
      "claimerMessage": "",
      "coupleReplyToClaimer": "",
      "contributors": [
        {
          "contributorName": "Ari",
          "contributorEmail": "ari@example.com",
          "contributorMessage": "For stargazing and slow mornings.",
          "coupleReplyToContributor": "We're going to do exactly this. Thank you."
        },
        {
          "contributorName": "Sam",
          "contributorEmail": "sam@example.com",
          "contributorMessage": "Please take a deep breath somewhere beautiful.",
          "coupleReplyToContributor": "We will. This is perfect."
        }
      ],
      "groupThankYouNote": "Thank you for making space in our year for one truly restful weekend."
    },
    {
      "giftId": "hobby-watercolors",
      "title": "Watercolor travel kit",
      "shortDescription": "Pocket painting set.",
      "longDescription": "A small watercolor kit for sketching in parks and cafes.",
      "images": ["/assets/favicon.png"],
      "categoryTags": { "home": false, "adventure": false, "hobby": true },
      "primarySection": "Hobby",
      "isDreamGift": true,
      "dreamOwner": "Hannah",
      "isGroupGift": false,
      "price": 60,
      "currency": "USD",
      "allowGifterProvidedVariant": false,
      "preferredMerchants": [
        { "merchantName": "Blick", "merchantReason": "Art supply specialist", "merchantURL": "https://www.dickblick.com" }
      ],
      "alternativeMerchants": [],
      "acquisitionNotes": "",
      "status": "Claimed",
      "claimerName": "Mina",
      "claimerEmail": "mina@example.com",
      "claimerMessage": "Paint something ridiculous and lovely.",
      "coupleReplyToClaimer": "We promise at least 30% ridiculous. Thank you.",
      "contributors": [],
      "groupThankYouNote": ""
    },
    {
      "giftId": "hobby-boardgame",
      "title": "Co-op board game",
      "shortDescription": "A game for rainy evenings.",
      "longDescription": "A cooperative board game that's fun with 2–4 players.",
      "images": ["/assets/og-image.png"],
      "categoryTags": { "home": false, "adventure": false, "hobby": true },
      "primarySection": "Hobby",
      "isDreamGift": false,
      "dreamOwner": null,
      "isGroupGift": false,
      "price": 45,
      "currency": "USD",
      "allowGifterProvidedVariant": false,
      "preferredMerchants": [
        { "merchantName": "Local Game Store", "merchantReason": "Support local", "merchantURL": "https://example.com" }
      ],
      "alternativeMerchants": [],
      "acquisitionNotes": "",
      "status": "Available",
      "claimerName": "",
      "claimerEmail": "",
      "claimerMessage": "",
      "coupleReplyToClaimer": "",
      "contributors": [],
      "groupThankYouNote": ""
    }
  ]
}
```

---

## A7. `data/copy.registry.json` (every user-facing string)

```json
{
  "siteLabel": "hanstan.wedding",
  "leftRail": {
    "howItWorksTitle": "How this works",
    "howItWorksLines": [
      "Browse in the middle",
      "Click a gift to view details on the right",
      "Use toggles here to filter",
      "Shipping details are sent by email during checkout"
    ],
    "chips": {
      "Dream": "Dream",
      "Home": "Home",
      "Adventure": "Adventure",
      "Hobby": "Hobby",
      "Group": "Group Gifts"
    },
    "clearAll": "Clear All",
    "showAll": "Show All"
  },
  "middle": {
    "stickyHeader": "Gift Registry",
    "dreamStanTitle": "Stan's Dream Gifts",
    "dreamHannahTitle": "Hannah's Dream Gifts",
    "sectionHome": "Home",
    "sectionAdventure": "Adventure",
    "sectionHobby": "Hobby",
    "outsideBudgetTitle": "Just outside budget",
    "outsideBudgetBlurb": "These are just a teensy bit outside your approx budget… shown because they're special picks."
  },
  "right": {
    "statusAvailable": "Available",
    "statusPending": "Claim pending confirmation",
    "statusClaimed": "Claimed",
    "expandLong": "Read more",
    "collapseLong": "Read less",
    "checkoutTitle": "Checkout options & instructions",
    "checkoutIntro": "Choose one path below. This page records your intent-to-gift and sends shipping details by email. (No real payment happens on-site.)",
    "pathSendFunds": "Send Funds (Recommended)",
    "pathPurchase": "Purchase Personally",
    "merchantTitle": "Preferred merchants",
    "whatToExpectTitle": "What to expect",
    "whatToExpectLines": [
      "You'll enter your name, email, and a short message for the gift card.",
      "Your selection becomes 'Claim pending confirmation' until the couple confirms receipt.",
      "Shipping details are emailed during the flow."
    ],
    "pendingBlockLine": "This gift is currently pending confirmation.",
    "claimedMessageTitle": "Message from gifter",
    "replyTitle": "Reply from Hannah & Ranjit",
    "groupThankYouTitle": "Group thank-you note",
    "claimSuccessMessage": "Thank you! Your intent-to-gift has been recorded.",
    "payGridTitle": "Send via payment app",
    "payGridAmountLabel": "Contribution amount (USD, min $5)",
    "payGridHint": "Opens your app with amount prefilled. Fill the form after to record your gift."
  },
  "overlay": {
    "title": "Gifting details",
    "required": "Required",
    "gifterName": "Your name",
    "gifterEmail": "Your email",
    "giftMessage": "Message to include on the gift card",
    "submit": "Submit",
    "cancel": "Cancel",
    "shippingNote": "Shipping details are delivered by email (they are not shown on the site).",
    "rightPaneTitle": "Quick guidance",
    "rightPaneLines": [
      "No real checkout happens here.",
      "This captures your intent-to-gift and your gift-card message.",
      "Preferred merchants are listed for convenience."
    ]
  },
  "budget": {
    "label": "Approx budget",
    "step": 25,
    "default": 200,
    "rangeLowMultiplier": 0,
    "rangeHighMultiplier": 1.25,
    "outsideLowMultiplier": 1.25,
    "outsideHighMultiplier": 1.42
  }
}
```

---

## A8. `data/theme.tokens.json`

```json
{
  "colors": {
    "railBg": "#1b1026",
    "panelBg": "#0e0814",
    "cardBg": "#1e1430",
    "textPrimary": "#f3ecff",
    "textMuted": "#d9cce8",
    "gold": "#d8b55b",
    "chipActiveBg": "#d8b55b",
    "chipActiveText": "#1b1026",
    "chipInactiveText": "#f3ecff",
    "chipBorder": "#3c2a4d",
    "tileOverlayBg": "rgba(0,0,0,0.55)",
    "tileDisabled": "#9a90a6",
    "focus": "#d8b55b",
    "danger": "#ff5a7a"
  },
  "radii": { "chip": 14, "card": 18, "tile": 16, "modal": 22 },
  "shadows": {
    "chip": "0 6px 16px rgba(0,0,0,0.35)",
    "card": "0 18px 60px rgba(0,0,0,0.45)",
    "tile": "0 10px 26px rgba(0,0,0,0.35)",
    "modal": "0 22px 90px rgba(0,0,0,0.55)"
  },
  "spacing": { "xs": 6, "sm": 10, "md": 16, "lg": 22, "xl": 30 },
  "fonts": {
    "heading": "Cormorant Garamond",
    "body": "Cormorant Garamond",
    "accent": "Allura"
  }
}
```

---

## A9. `data/ordering.registry.json`

```json
{
  "sectionOrder": {
    "Home": ["home-linen", "home-kettle"],
    "Adventure": ["adv-cabin-weekend", "adv-nationalparks-pass"],
    "Hobby": ["hobby-watercolors", "hobby-boardgame"]
  },
  "dreamOrder": {
    "Stan": ["adv-cabin-weekend"],
    "Hannah": ["home-linen", "hobby-watercolors"]
  }
}
```

---

## A10. `_redirects`

```
/data/gifts.json /.netlify/functions/data-gifts 200
/data/copy.registry.json /.netlify/functions/data-copy-registry 200
/data/theme.tokens.json /.netlify/functions/data-theme-tokens 200
/data/ordering.registry.json /.netlify/functions/data-ordering-registry 200
```

---

## A11. `package.json`

```json
{
  "dependencies": {
    "@netlify/blobs": "^10.4.1"
  }
}
```

---

## A12. `.gitattributes`

```
# Auto detect text files and perform LF normalization
* text=auto
```



---
---

# FROZEN APPENDIX — PU-1 through PU-11 (added 2026-04-24 by batch phaseD_batchNone_frozenSpecAndGovernance_v1)

> This appendix is frozen. It captures the state-of-the-site just after plannerUpdate Stage 0 Phase C completion on 2026-04-24. Working-copy site spec (`HANSTAN_WEDDING_SITE_SPEC.md`) remains the active authority document; this frozen copy is the historical reference.

## §PU-1 — Canonical live state (before and after Phase C)

### Pre-Phase-C snapshot (2026-04-23 20:45 UTC)

```json
{
  "schemaVersion": 6,
  "tasks": [
    {
      "id": "t1",
      "taskId": "A1",
      "workstream": "a",
      "title": "Registry — Get All 32 Gifts Live with Real Images",
      "desc": "Live site has 6 sample gifts with placeholders. 26-gift batch JSON exists but never imported. Hannah's image sheet (32 items) is authoritative.",
      "priority": "critical",
      "status": "done",
      "quadrant": "q1",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "Stan",
      "tags": [
        "registry",
        "website"
      ],
      "blockedBy": "Stan decision on deployment path",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:45:16.995Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:12:06.556Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:45:16.995Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t2",
      "taskId": "A2",
      "workstream": "a",
      "title": "Refresh Spec Anchors Against Live Repo",
      "desc": "All three v0.1 spec layers grounded against stale project files. Must fetch live, diff, update before ticket execution.",
      "priority": "high",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "specs",
        "technical"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:12:09.180Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:12:09.180Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t3",
      "taskId": "A3",
      "workstream": "a",
      "title": "Execute Registry Bugfix Bundle (HW-012A–F)",
      "desc": "6 tickets, 6 files, 14 fixes. Registry UX overhaul, dream section removal, visual polish.",
      "priority": "high",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "bugfix",
        "technical"
      ],
      "blockedBy": "A2",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:12:10.348Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:12:10.348Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t4",
      "taskId": "A4",
      "workstream": "a",
      "title": "Execute Standalone Bugfix Tickets (T1–T6)",
      "desc": "T1–T4 code produced (deploy unknown). T5 homepage link + T6 admin fixes never executed.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Claude, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "bugfix",
        "technical"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:12:14.003Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:12:14.003Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t5",
      "taskId": "A5",
      "workstream": "a",
      "title": "FAQ — Rewrite Plus-One/Children Answer",
      "desc": "Draft copy ready from Hannah's Discord. Covers invitation scope, plus-one RSVP, children caveats.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Claude",
      "location": "",
      "contacts": "Hannah",
      "tags": [
        "faq",
        "website"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:13:43.242Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:13:43.242Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t6",
      "taskId": "A6",
      "workstream": "a",
      "title": "FAQ — Add \"What Should I Bring?\"",
      "desc": "Weather clothing, casual clothes, lawn games, potluck food item.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Claude",
      "location": "",
      "contacts": "Hannah",
      "tags": [
        "faq",
        "website"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:14:03.212Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:14:03.212Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t7",
      "taskId": "A7",
      "workstream": "a",
      "title": "FAQ — Verify Symbol Fix",
      "desc": "Emoji fix was deployed. Verify if additional symbol issues remain.",
      "priority": "low",
      "status": "done",
      "quadrant": "q3",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "faq",
        "verify"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T14:58:42.712Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T14:58:42.712Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t8",
      "taskId": "A8",
      "workstream": "a",
      "title": "Build Day-of Schedule Page",
      "desc": "Nothing exists yet. Ceremony order now drafted (B25) — partially unblocked.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Claude, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "website",
        "schedule"
      ],
      "blockedBy": "B25",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T05:07:40.755Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:33:00.990Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-19T05:07:40.755Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t9",
      "taskId": "A9",
      "workstream": "a",
      "title": "Generate Build Tickets from Specs",
      "desc": "Three-layer spec complete, 36 decisions locked. Ready after anchor refresh.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "technical"
      ],
      "blockedBy": "A2",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:14:09.005Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:14:09.005Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t10",
      "taskId": "A10",
      "workstream": "a",
      "title": "dialogueXR §10 Failure Modes",
      "desc": "File divergence, skipping gel layer, premature ticket authoring.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "Stan, Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:14:14.147Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:14:14.147Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t11",
      "taskId": "B1",
      "workstream": "b",
      "title": "Honeymoon/Move — 3 Linked Decisions",
      "desc": "Primary candidate: PNW Airbnb tour. Plus packing/shipping + vehicle decisions.",
      "priority": "high",
      "status": "blocked",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "Hannah, Stan",
      "tags": [
        "honeymoon"
      ],
      "blockedBy": "Joint H+S decision",
      "group": "HanStan Logistics",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:47:31.075Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:33:57.276Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:39:18.150Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:47:31.075Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t12",
      "taskId": "B2",
      "workstream": "b",
      "title": "Send Invitations (Physical + Digital)",
      "desc": "Stan's #1 priority. Hannah finishing hers. Stan needs full invitee list (incl unlikely). Three steps: list → address → send. Form matters less than reaching people.",
      "priority": "critical",
      "status": "done",
      "quadrant": "q1",
      "deadline": "2026-04-01",
      "persona": "guest",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "invitations",
        "immediate"
      ],
      "blockedBy": "",
      "group": "Guest List",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T03:55:07.669Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:43.206Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:35:11.113Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-23T03:55:07.669Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t13",
      "taskId": "B3",
      "workstream": "b",
      "title": "International Friends' Visa Follow-Up",
      "desc": "Friends have applied. Status unknown. Must follow up — lead times could prevent attendance.",
      "priority": "critical",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-03-25",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "visa",
        "critical"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:30:39.505Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:39.505Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t14",
      "taskId": "B4",
      "workstream": "b",
      "title": "Zubey — Confirm Attendance & Buy Tickets",
      "desc": "Decision made to buy. Need confirmation. Earlier = cheaper.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-01",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "Zubey",
      "tags": [
        "travel"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:49:07.797Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:34:07.627Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:49:00.642Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:49:04.322Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:49:07.797Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t15",
      "taskId": "B5",
      "workstream": "b",
      "title": "Canopy + Furniture Rental + Park Setup",
      "desc": "RENTAL BOOKED: Order #589401 (A to Z Party, Elsie). 8 canopies, 24 tables, 144 chairs + tablecloths. Delivery 9am, pickup 9pm on 6/6/2026. Hannah owes Elsie $545 reimbursement. SUP fee $250 (check to OPRD): mail to Attn Park Specialist, 10991 Wheatland Road NE, Gervais OR 97026 — confirm if sent. Open questions to park: max shelter amperage, helium balloon placement, smoking in cars. Port-a-potties: plan 1-2 (min 1 ADA) — vendor not yet contacted.",
      "priority": "critical",
      "status": "done",
      "quadrant": "q1",
      "deadline": "2026-04-20",
      "persona": "organizer",
      "assignee": "Hannah, Zita",
      "location": "Willamette Mission State Park, Shelter A",
      "contacts": "Hannah, Zita, Elsie",
      "tags": [
        "canopy",
        "park",
        "venue",
        "deposit"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T07:21:44.638Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:14:28.986Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:22.860Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-19T07:21:44.638Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t16",
      "taskId": "B6",
      "workstream": "b",
      "title": "Food & Catering Plan",
      "desc": "Mike: chicken/fish. Stan's parents: chicken+beef+rice. Bonnie: food coordinator. Carol Edel: 2-3 sheet cakes. Luke: wine+coolers. 2 cases sparkling cider. Potluck base. Carol Edel has warming pans.",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "2026-05-01",
      "persona": "guest",
      "assignee": "Stan, Bonnie",
      "location": "Willamette Mission State Park",
      "contacts": "Mike, Bonnie, Carol Edel, Trudy, Zita, Luke",
      "tags": [
        "food",
        "catering"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T06:26:48.314Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:14:40.281Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:34:15.359Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:39:58.377Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-19T06:26:46.679Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Undo status",
          "time": "2026-04-19T06:26:48.314Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t17",
      "taskId": "B7",
      "workstream": "b",
      "title": "Smoke Shuttle Coordination",
      "desc": "Vehicle + driver for park-boundary runs. Smoking prohibited on grounds.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "logistics"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:15:48.065Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:15:48.065Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t18",
      "taskId": "B8",
      "workstream": "b",
      "title": "Stan Family Outreach (Aunt, Cousin, Stepbrother)",
      "desc": "",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-01",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "family",
        "invitations"
      ],
      "blockedBy": "",
      "group": "Guest List",
      "subtasks": [
        {
          "text": "Aunt: reconnect first (~20 yrs), then invite.",
          "done": false
        },
        {
          "text": "Cousin: straight invite.",
          "done": false
        },
        {
          "text": "Stepbrother (NZ): straight invite, visa-waiver eligible.",
          "done": false
        },
        {
          "text": "Peter",
          "done": false
        },
        {
          "text": "Aarti",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:34:22.511Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T14:58:25.263Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:34:22.511Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t19",
      "taskId": "B9",
      "workstream": "c",
      "title": "Premarital Counseling + Wes Books + Officiant",
      "desc": "Wes Walls confirmed officiant (friend, house church pastor). Short speech + traditional directions. Study his two books chapter by chapter before next meeting.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "Wes Walls",
      "tags": [
        "counseling",
        "officiant"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:30:24.024Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:24.024Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t20",
      "taskId": "B10",
      "workstream": "b",
      "title": "Covenant Card v2",
      "desc": "v1 done. v2 ticket written: two-panel interactive card, tabbed UI, scripture popups.",
      "priority": "low",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "covenant"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:18:57.950Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:18:57.950Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t21",
      "taskId": "B11",
      "workstream": "b",
      "title": "Festival Programming — 23 Elements",
      "desc": "Live music, folk dancing (Lori Tauscher), reenactment, tag tournament, lawn games, board games, babysitting, knightly tournament (Thomas), trampoline, smoke shuttle, cigars, favors, first aid, changing canopies, Colleen comfort kit, co-MCs, Indian dance, popsicle craft, guest sign-in, reception lights, ribbons, decorations/flowers, entrance signs.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-15",
      "persona": "guest",
      "assignee": "Hannah, Stan",
      "location": "Willamette Mission State Park",
      "contacts": "Thomas, Elsie, Lori Tauscher",
      "tags": [
        "festival",
        "activities"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:36:43.997Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:12.247Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:36:43.997Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t22",
      "taskId": "B12",
      "workstream": "b",
      "title": "Musical Guest Survey",
      "desc": "Identify which guests play instruments and would perform at open stage.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "music",
        "survey"
      ],
      "blockedBy": "Guests must fill out RSVP form",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:49:04.953Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:53.232Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:49:04.953Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t23",
      "taskId": "B13",
      "workstream": "b",
      "title": "Wedding Playlist",
      "desc": "Confirmed tracks: Putting on the Ritz, Crazy Little Thing Called Love, Tangled snippet. Categories: pre-ceremony, procession, bride entrance, post-ceremony, reception, Lori dance tracks, Indian music. Add to YT Premium.",
      "priority": "medium",
      "status": "in-progress",
      "quadrant": "q3",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "music",
        "playlist"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:38:13.775Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:58.442Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:38:13.775Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t24",
      "taskId": "B14",
      "workstream": "a",
      "title": "Wedding Party Communication Channel",
      "desc": "WhatsApp or Discord. Everyone flexible. Members: MoH, 2+ sisters, best friends, Thomas, brother.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-01",
      "persona": "organizer",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "communication"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:29:44.244Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:44.244Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t25",
      "taskId": "B15",
      "workstream": "b",
      "title": "Guest Allergy Survey",
      "desc": "Collect dietary restrictions. Feeds into catering.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "food",
        "survey"
      ],
      "blockedBy": "Guest list + RSVP",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:29:20.189Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:20.189Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t26",
      "taskId": "B16",
      "workstream": "b",
      "title": "Advance Coordination Week (May 31–Jun 6)",
      "desc": "H&S arrive ~1 week before. Aparna arrive ~1 week before. Need daily logistics plan.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-25",
      "persona": "organizer",
      "assignee": "Hannah, Stan",
      "location": "Oregon",
      "contacts": "",
      "tags": [
        "logistics"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T04:46:48.683Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:12.314Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:37:36.120Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T04:46:48.683Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t27",
      "taskId": "B17",
      "workstream": "b",
      "title": "Parents' Travel Itinerary",
      "desc": "Stan's parents + friend group renting Airbnb, road trip vacation.",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "family",
        "travel"
      ],
      "blockedBy": "",
      "group": "Guest List",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:38:42.048Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:38:42.048Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t28",
      "taskId": "B18",
      "workstream": "c",
      "title": "Brother & Sister-in-Law Involvement",
      "desc": "Give meaningful roles. Make attractive, not a chore.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "family",
        "roles"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:29:30.754Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:30.753Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t29",
      "taskId": "B19",
      "workstream": "b",
      "title": "Brother's Guest List Input",
      "desc": "Ask who else should be invited.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "invitations",
        "family"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:28:22.835Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:28:22.835Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t30",
      "taskId": "B20",
      "workstream": "c",
      "title": "Photographer Coordination",
      "desc": "Daniel Thomas: CONTRACT SIGNED, deposit paid, ~$1,500 total. On duty from 2pm Jun 7, photos right after ceremony while reception begins. Grace confirmed as 2nd photographer (~$1,800/6hrs). Golden hour timing critical. Connect Daniel + Grace.",
      "priority": "medium",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "",
      "persona": "service",
      "assignee": "Stan",
      "location": "",
      "contacts": "Daniel Thomas, Grace",
      "tags": [
        "photography"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:29:07.431Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:07.431Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t31",
      "taskId": "B21",
      "workstream": "b",
      "title": "Grace — 2nd Photographer (coordinator role declined)",
      "desc": "Grace DECLINED day-of coordinator role. CONFIRMED as 2nd photographer (~$1,800/6hrs). Still need a day-of coordinator — searching. Elsie = general coordinator only.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "service",
      "assignee": "Stan",
      "location": "",
      "contacts": "Grace, Elsie",
      "tags": [
        "coordinator",
        "photography"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T14:36:34.770Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t32",
      "taskId": "B22",
      "workstream": "b",
      "title": "Wind Protection for Canopies",
      "desc": "Figure out solution + verify handled/procured.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "canopy",
        "weather"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:40:14.037Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:57.507Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:40:11.683Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-17T06:40:14.037Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t33",
      "taskId": "B23",
      "workstream": "a",
      "title": "Google Drive Coordination Folder",
      "desc": "Mostly complete (joint H+S). Hannah behind on to-do updates. Bridesmaids have edit access.",
      "priority": "medium",
      "status": "mostly-done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "organizer",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "planning",
        "documents"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:37:56.023Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:28:54.797Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:37:56.023Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t34",
      "taskId": "B24",
      "workstream": "b",
      "title": "Wedding Program / Schedule (Print + Mobile)",
      "desc": "Design based on ceremony order from Master doc. Print via Staples. Also on website. Needs volunteer designer.",
      "priority": "high",
      "status": "mostly-done",
      "quadrant": "q2",
      "deadline": "2026-05-20",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "design",
        "print"
      ],
      "blockedBy": "B25",
      "group": "Website",
      "subtasks": [
        {
          "text": "Research standard schedules",
          "done": true
        },
        {
          "text": "Create superset draft schedule",
          "done": false
        },
        {
          "text": "With Hannah, Discuss and refine draft schedule",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T05:08:24.285Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:28:45.673Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:25:04.243Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Mostly Done",
          "time": "2026-04-19T05:08:06.488Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-19T05:08:24.285Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t35",
      "taskId": "B25",
      "workstream": "b",
      "title": "Day-of Sequence Optimization",
      "desc": "CEREMONY ORDER DRAFTED: Setup 9am. Guests arrive 2pm. Ceremony 2:30pm: signs → seating → 10min music → processional → prayer → officiant speech → vows → rings → prayer tunnel → reception → potluck buffet → cake → dancing (Lori folk dances + Indian music). Golden hour photos late. Last call 7:30pm, wine packed 8pm. Cleanup 7:30pm. Out by 8:45pm. 9PM hard stop.",
      "priority": "medium",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "2026-05-01",
      "persona": "organizer",
      "assignee": "Hannah, Stan",
      "location": "Willamette Mission State Park",
      "contacts": "Daniel Thomas, Grace, Wes Walls, Lori Tauscher",
      "tags": [
        "schedule",
        "ceremony"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:36:59.275Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:28:59.837Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:36:59.275Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t36",
      "taskId": "B26",
      "workstream": "b",
      "title": "Post-Park Accommodation + Transportation",
      "desc": "Where should parents/friends stay? Who does pickups/dropoffs? Van available for ferrying? What do guests do after 9PM?",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "accommodation",
        "transport"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:36:39.092Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:31:02.243Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:35:27.527Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:36:39.092Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t37",
      "taskId": "B27",
      "workstream": "b",
      "title": "Groomsmen Attire + Tailoring",
      "desc": "Stan decides attire. Tailoring needs lead time. Tanvi = backup groomsman.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-15",
      "persona": "groom",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "attire",
        "tailoring"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:34:36.361Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:34:36.361Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t38",
      "taskId": "B28",
      "workstream": "b",
      "title": "Schedule Phone Call with Elsie",
      "desc": "She offered Tuesday March 17. Deadline passed — verify if call happened. If not, reschedule.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "2026-03-17",
      "persona": "organizer",
      "assignee": "Stan",
      "location": "",
      "contacts": "Elsie",
      "tags": [
        "phone",
        "coordination"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T14:36:34.770Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t39",
      "taskId": "B29",
      "workstream": "b",
      "title": "Elsie's To-Do Items (Delegated)",
      "desc": " ",
      "priority": "medium",
      "status": "done",
      "quadrant": "q3",
      "deadline": "2026-05-30",
      "persona": "bridal",
      "assignee": "Elsie",
      "location": "",
      "contacts": "Elsie, Luke",
      "tags": [
        "crafts",
        "favors",
        "delegated"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [
        {
          "text": "Luke wine+coolers",
          "done": true
        },
        {
          "text": "To-get wedding list",
          "done": true
        },
        {
          "text": "Choker+bracelet sets",
          "done": true
        },
        {
          "text": "Popsicle stick craft",
          "done": true
        },
        {
          "text": "Bottles (favor magnets)",
          "done": true
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T03:59:47.582Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:40:37.443Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:28:10.158Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T03:59:45.204Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-23T03:59:47.582Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t40",
      "taskId": "B30",
      "workstream": "b",
      "title": "Bridesmaid White Jackets (Cassie)",
      "desc": "Searching for matching short white jackets over dresses.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q3",
      "deadline": "2026-05-15",
      "persona": "bridal",
      "assignee": "Cassie",
      "location": "",
      "contacts": "Cassie",
      "tags": [
        "attire",
        "delegated"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:26:35.744Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:05.475Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-17T06:26:35.744Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t41",
      "taskId": "B31",
      "workstream": "a",
      "title": "Website FAQ Additions",
      "desc": "Needed: wedding colors+attire freedom, drink info, activity release, outdoor/weather/sun note, transport/logistics, driving directions+map, parking instructions.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "website"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T03:55:27.331Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:40:21.209Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-23T03:55:27.331Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t42",
      "taskId": "B32",
      "workstream": "b",
      "title": "Marriage License",
      "desc": "Legal requirement. Stan and Hannah must appear in person with IDs. Marriage license applications are processed from 8:30-4:30 PM Monday – Friday. Please allow 20 minutes depending on our lobby wait time.\nAddress: Marion County Clerk’s Office\n555 Court St NE, Suite 2130\nSalem, Oregon 97301\n\n(503) 588-5225\nclerk@co.marion.or.us\n\nPay Fees in-person\nMarriage License - $60.00\nCertified Copies - $4.00 (1 copy requested)\nWe accept cash, checks, money orders, and credit cards.",
      "priority": "critical",
      "status": "in-progress",
      "quadrant": "q1",
      "deadline": "2026-06-01",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "Oregon",
      "contacts": "",
      "tags": [
        "legal",
        "critical"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [
        {
          "text": "Apply for Oregon license",
          "done": true
        },
        {
          "text": "Speak to clerk to choose legal names (in-person or phone call? currently unknown)",
          "done": false
        },
        {
          "text": "Pick up document from Courthouse",
          "done": false
        },
        {
          "text": "Submit completed license after marriage",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T04:47:02.505Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:40:03.501Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T04:43:54.318Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T04:47:02.505Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t43",
      "taskId": "B33",
      "workstream": "b",
      "title": "Sound System (Daniel Barksdale) ",
      "desc": "Daniel Barksdale: full PA system — 6 speakers (3 main + 3 sub), soundboard + computer + 8 plugins. Shelter has only 2 outlets — max amperage question sent to park, AWAITING REPLY. Fallback: 1 speaker + soundboard, or rented generator. Lori Tauscher: folk dance caller + dance tracks ONLY (separate from PA).",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "",
      "persona": "service",
      "assignee": "Hannah",
      "location": "Willamette Mission State Park",
      "contacts": "Daniel Barksdale, Lori Tauscher",
      "tags": [
        "music",
        "sound"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [
        {
          "text": "Shelter has only 2 outlets — max amperage question sent to park, AWAITING REPLY",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T03:57:54.300Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:08:13.829Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:27.044Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T03:57:54.300Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t44",
      "taskId": "B34",
      "workstream": "b",
      "title": "Parking + Transportation Logistics",
      "desc": "Offsite parking needed. Communicate carpooling+walking on FAQ+directly. Van for ferrying? Greeter for parking.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Hannah",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "parking",
        "logistics"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:44:09.886Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:09.886Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t45",
      "taskId": "B35",
      "workstream": "b",
      "title": "Pre-Wedding Dinner With Parents",
      "desc": "Merry+family to organize. Vivek and Rita to bring alcohol, possibly gifts",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "Merry",
      "location": "",
      "contacts": "",
      "tags": [
        "party",
        "social"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T04:46:06.570Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:21.619Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T04:46:06.570Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t46",
      "taskId": "B36",
      "workstream": "b",
      "title": "Procession Planning",
      "desc": "Draft order exists. Open: how does Stan arrive? Flower girl/nephews order? Bride entrance music? MOH carries rings?",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "bridal",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "ceremony",
        "procession"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:39:51.812Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:51.812Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t47",
      "taskId": "B37",
      "workstream": "b",
      "title": "Teardown + Cleaning",
      "desc": "Announce at event asking guests to help. Park closes 9PM. Need teardown captain.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "organizer",
      "assignee": "",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "logistics",
        "teardown"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:42:57.569Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:44.421Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:42:57.569Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t48",
      "taskId": "B38",
      "workstream": "b",
      "title": "Decorations + Flowers",
      "desc": "Flowers+decorations still need purchasing",
      "priority": "medium",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Sarah",
      "location": "",
      "contacts": "Elsie",
      "tags": [
        "decorations",
        "flowers",
        "design"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:50:51.417Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:36.398Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:50:51.417Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t49",
      "taskId": "B39",
      "workstream": "b",
      "title": "Wedding Colors Reference",
      "desc": "Green #1A6C24, Blue #201761, Ivory #fffff6, Red #6C241A, Sand #ebd8bd. David's Bridal: Marine, Juniper, Wine. Add to website + invitations.",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "colors",
        "reference"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:38:21.279Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:38:21.279Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t50",
      "taskId": "B40",
      "workstream": "b",
      "title": "Consumables Shopping List",
      "desc": "Ice (day-of), disposable silverware/plates/cups, flowers/decorations, guest book+pens, 2 cases sparkling cider. From family: bridge (Dad), water dispensers (Mom/Dad), folding tables.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "2026-05-30",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "shopping",
        "consumables"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:39:30.796Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:30.796Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t51",
      "taskId": "C1",
      "workstream": "a",
      "title": "dialogueXR v0.3 Changelog Gap",
      "desc": "Scrybal tweaked between Sessions 6–7. Changes not logged.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:16.376Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:08:53.441Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:16.376Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t52",
      "taskId": "C2",
      "workstream": "a",
      "title": "Workshop STL Template",
      "desc": "Across project contexts.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:21.122Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:08:54.377Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:21.122Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t53",
      "taskId": "C3",
      "workstream": "a",
      "title": "System Architecture Map",
      "desc": "Artifact inventory + integration gaps.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:24.013Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:36:50.186Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:24.013Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t54",
      "taskId": "C4",
      "workstream": "a",
      "title": "Unify Canonical Files",
      "desc": "Integrate all into governance system.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:27.017Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:08:57.458Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:27.017Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t55",
      "taskId": "C5",
      "workstream": "a",
      "title": "Extract Invariant Templates",
      "desc": "Needs uploads from cross-project artifacts.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:29.785Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:08:58.697Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:29.785Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t56",
      "taskId": "B41",
      "workstream": "b",
      "title": "OLCC certified server (NOT necessary)",
      "desc": "RESOLVED! A liquor license is NOT needed at special events where alcohol is available but there is no payment or purchase required and no donations of money are accepted for alcohol, entry, or admission. The explicit example given is a wedding reception where you make alcohol available but don't require payment or accept donations. es — the OLCC exemption applies to all alcohol types (wine, beer, spirits) equally. The exemption is triggered by the payment/donation condition, not by what kind of alcohol is being served. Free hard liquor at a private wedding = same legal standing as free wine. The only wrinkle worth flagging: some city park rules restrict alcohol content to 14% or less for private events Salem — but that's a City of Salem parks rule, not Oregon State Parks. Willamette Mission is an Oregon State Park, so that restriction doesn't apply to you. The park manager call (503-393-1172) is still the place to get this confirmed in writing for your specific event. That one call covers everything — wine, coolers, and your dad's whiskey.https://www.oregon.gov/olcc/lic/pages/special-event-licensing.aspx\n\nFind out if we Need an OLCC-certified server to pour wine. Elsie and Fen CANNOT serve (confirmed). Options: hire a licensed server, or ask a guest who is OLCC certified. Park requires: 1-2 licensed servers separate from the sober monitor. Fruit wine only, no hard alcohol.",
      "priority": "critical",
      "status": "done",
      "quadrant": "q1",
      "deadline": "2026-05-01",
      "persona": "organizer",
      "assignee": "Hannah, Stan",
      "location": "Willamette Mission State Park",
      "contacts": "Elsie",
      "tags": [
        "alcohol",
        "legal",
        "critical"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [
        {
          "text": "A liquor license is NOT needed at special events where alcohol is available but there is no payment or purchase required and no donations of money are accepted for alcohol, entry, or admission. The explicit example given is a wedding reception where you make alcohol available but don't require payment or accept donations. es — the OLCC exemption applies to all alcohol types (wine, beer, spirits) equally. The exemption is triggered by the payment/donation condition, not by what kind of alcohol is being served. Free hard liquor at a private wedding = same legal standing as free wine. The only wrinkle worth flagging: some city park rules restrict alcohol content to 14% or less for private events Salem — but that's a City of Salem parks rule, not Oregon State Parks. Willamette Mission is an Oregon State Park, so that restriction doesn't apply to you. The park manager call (503-393-1172) is still the place to get this confirmed in writing for your specific event. That one call covers everything — wine, coolers, and your dad's whiskey.https://www.oregon.gov/olcc/lic/pages/special-event-licensing.aspx",
          "time": "2026-04-15T14:40:53.607Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:44.939Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T14:41:23.352Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T14:44:51.508Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-15T14:44:55.344Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:44.939Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t57",
      "taskId": "B42",
      "workstream": "b",
      "title": "Port-a-Potty + Toilets",
      "desc": "Park requires: 2 chemical toilets per 100 participants (at least 1 ADA). Vendor not yet contacted. Delivery/pickup approximately same as rental times (8:30am/8:30pm). Get quotes and book ASAP.",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q1",
      "deadline": "2026-04-30",
      "persona": "organizer",
      "assignee": "Hannah",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "logistics",
        "venue",
        "critical"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [
        {
          "text": "Research vendors",
          "done": false
        },
        {
          "text": "Discuss options (ada/luxury/basics/trailer)",
          "done": false
        },
        {
          "text": "Get quotes+ logistics info",
          "done": false
        },
        {
          "text": "Check it out",
          "done": false
        },
        {
          "text": "Choose best option",
          "done": false
        },
        {
          "text": "Get Luke to scope out/report/photograph existing toilets",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-22T05:46:46.618Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:15.353Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:22:45.131Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-22T05:46:46.618Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t58",
      "taskId": "B43",
      "workstream": "b",
      "title": "Reimburse Elsie — $545 (Rental Deposit)",
      "desc": "Hannah owes Elsie $545 reimbursement for A to Z Party Rental deposit (Order #589401). Pay as soon as possible.",
      "priority": "high",
      "status": "done",
      "quadrant": "q1",
      "deadline": "2026-04-20",
      "persona": "organizer",
      "assignee": "Hannah",
      "location": "",
      "contacts": "Elsie",
      "tags": [
        "finance",
        "reimbursement"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:23:12.975Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:23:12.975Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t59",
      "taskId": "B44",
      "workstream": "b",
      "title": "Park Open Questions — Await + Follow Up",
      "desc": "Three questions sent to park, awaiting response: (1) Max amperage/current on shelter electrical (critical for 6-speaker PA). (2) Helium balloons at park entrance/Shelter A loop/overflow lot — approval needed. (3) Smoking rules: cars on park grounds. If no reply by Apr 21, follow up with OPRD (503-393-1172 opt 5).",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "2026-04-21",
      "persona": "organizer",
      "assignee": "Hannah",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "park",
        "logistics"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [
        {
          "text": "Max amperage/current on shelter electrical (critical for 6-speaker PA) — AWAITING PARK REPLY",
          "done": false
        },
        {
          "text": "Helium balloons at park entrance/Shelter A loop/overflow lot — NOT APPROVED by park",
          "done": true
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:42:37.587Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T14:36:52.419Z"
        },
        {
          "action": "Status → Not Started",
          "time": "2026-04-15T15:08:23.099Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:08:30.682Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:42:37.587Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t1776265716814",
      "taskId": "",
      "workstream": "b",
      "title": "Dance Calling (Lori)",
      "desc": "Discuss dances with Lori! And the music too!",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [
        {
          "text": "Which dances?",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:41:53.015Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:08:36.814Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:09:32.593Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:41:11.105Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:43.524Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:41:53.015Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T15:08:36.814Z"
    },
    {
      "id": "t1776266763813",
      "taskId": "",
      "workstream": "b",
      "title": "Zubey",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:03.813Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:03.813Z",
      "created": "2026-04-15T15:26:03.813Z"
    },
    {
      "id": "t1776266767998",
      "taskId": "",
      "workstream": "b",
      "title": "Ronnie",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:07.998Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:07.998Z",
      "created": "2026-04-15T15:26:07.998Z"
    },
    {
      "id": "t1776266772701",
      "taskId": "",
      "workstream": "b",
      "title": "Peter",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:12.701Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:12.701Z",
      "created": "2026-04-15T15:26:12.701Z"
    },
    {
      "id": "t1776266776099",
      "taskId": "",
      "workstream": "b",
      "title": "Aarti",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:16.099Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:16.099Z",
      "created": "2026-04-15T15:26:16.099Z"
    },
    {
      "id": "t1776266781521",
      "taskId": "",
      "workstream": "b",
      "title": "Tanvee & Aung",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:21.521Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:21.521Z",
      "created": "2026-04-15T15:26:21.521Z"
    },
    {
      "id": "t1776266791952",
      "taskId": "",
      "workstream": "b",
      "title": "Deyvaansh",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:31.952Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:31.952Z",
      "created": "2026-04-15T15:26:31.952Z"
    },
    {
      "id": "t1776266798656",
      "taskId": "",
      "workstream": "b",
      "title": "Abhinav",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:38.656Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:38.656Z",
      "created": "2026-04-15T15:26:38.656Z"
    },
    {
      "id": "t1776266808759",
      "taskId": "",
      "workstream": "b",
      "title": "Urmi",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:48.759Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:48.759Z",
      "created": "2026-04-15T15:26:48.759Z"
    },
    {
      "id": "t1776266816949",
      "taskId": "",
      "workstream": "b",
      "title": "Rumi Didi",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:56.949Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:26:56.949Z",
      "created": "2026-04-15T15:26:56.949Z"
    },
    {
      "id": "t1776266849057",
      "taskId": "",
      "workstream": "b",
      "title": "Babu Mamu & Deepa Aunty",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:27:29.057Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:27:29.057Z",
      "created": "2026-04-15T15:27:29.057Z"
    },
    {
      "id": "t1776408087391",
      "taskId": "",
      "workstream": "b",
      "title": "Mehak- Shuba's friend modeling site in CAD.",
      "desc": "",
      "priority": "medium",
      "status": "blocked",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-17T06:41:27.391Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Blocked",
          "time": "2026-04-17T06:44:56.428Z",
          "by": "Hannah & Stan"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:44:56.428Z",
      "created": "2026-04-17T06:41:27.391Z"
    },
    {
      "id": "t1776408719000",
      "taskId": "",
      "workstream": "b",
      "title": "Potluck dish coordination - assigned to Bonnie",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Catering",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-17T06:51:59.000Z",
          "by": "Hannah & Stan"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:51:59.000Z",
      "created": "2026-04-17T06:51:59.000Z"
    },
    {
      "id": "t1776583215707",
      "taskId": "",
      "workstream": "b",
      "title": "Take Stan's measurements for tailor",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-19T07:20:15.707Z",
          "by": "Hannah & Stan"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T07:20:15.707Z",
      "created": "2026-04-19T07:20:15.707Z"
    },
    {
      "id": "t1776632527039",
      "taskId": "",
      "workstream": "b",
      "title": "Assign persons in charge where unassigned",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-19T21:02:07.039Z",
          "by": "Hannah & Stan"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T21:02:07.039Z",
      "created": "2026-04-19T21:02:07.039Z"
    },
    {
      "id": "t1776975668715",
      "taskId": "",
      "workstream": "b",
      "title": "Coordinate Grace & Thomas (Photographers)",
      "desc": "Both photographers have ideas. They need to be diffed and coordinated and Integrated.",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [
        {
          "text": "Task to Grace and formalize her ideas.",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T20:32:47.210Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-23T20:21:08.715Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T20:25:01.058Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T20:32:47.210Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-23T20:21:08.715Z"
    }
  ],
  "contacts": [
    {
      "id": "p1",
      "name": "Hannah",
      "role": "bridal",
      "specificRole": "Bride",
      "phone": "",
      "email": "hannah7of9@gmail.com",
      "notes": "Co-planning. Handling park logistics, event insurance, SUP filing, invitations."
    },
    {
      "id": "p2",
      "name": "Stan (Scrybal)",
      "role": "groom",
      "specificRole": "Groom",
      "phone": "",
      "email": "",
      "notes": "Co-planning. Leading food plan, invitation list, website, playlist."
    },
    {
      "id": "p3",
      "name": "Elsie",
      "role": "organizer",
      "specificRole": "General Coordinator + Bridesmaid",
      "phone": "",
      "email": "crankyfood@gmail.com",
      "notes": "Hannah's older sister. Coordinator all along. Making choker+bracelet sets, favor magnets, popsicle stick craft, bottles. Coordinating Luke's wine."
    },
    {
      "id": "p4",
      "name": "Thomas",
      "role": "family",
      "specificRole": "Co-MC (Oregonian crowd) + Knight Tournament Anchor",
      "phone": "",
      "email": "",
      "notes": "Hannah's teenage nephew. Roman centurion outfit."
    },
    {
      "id": "p5",
      "name": "Zita",
      "role": "bridal",
      "specificRole": "Maid of Honor",
      "phone": "",
      "email": "",
      "notes": "Researching walled canopies + food prep items."
    },
    {
      "id": "p6",
      "name": "Cassie",
      "role": "bridal",
      "specificRole": "Bridesmaid",
      "phone": "",
      "email": "",
      "notes": "Searching for matching short white jackets for bridesmaids."
    },
    {
      "id": "p7",
      "name": "Grace",
      "role": "service",
      "specificRole": "2nd Photographer (confirmed)",
      "phone": "",
      "email": "",
      "notes": "Declined day-of coordinator role. Confirmed as 2nd photographer at ~$1,800/6hrs."
    },
    {
      "id": "p8",
      "name": "Daniel Thomas",
      "role": "service",
      "specificRole": "Lead Photographer",
      "phone": "206-307-5208",
      "email": "",
      "notes": "Contract SIGNED, deposit PAID. ~$1,500 total. On duty from ~2pm Jun 7. Pre-wedding style call completed Mar 15."
    },
    {
      "id": "p9",
      "name": "Merry",
      "role": "family",
      "specificRole": "Hannah's Mother",
      "phone": "",
      "email": "",
      "notes": "Colleen's primary caregiver. Needs real chair, shade, dignity at venue. Water dispensers from Mom/Dad."
    },
    {
      "id": "p10",
      "name": "Colleen",
      "role": "family",
      "specificRole": "Bridesmaid (by nature)",
      "phone": "",
      "email": "",
      "notes": "Hannah's youngest sister. Bridesmaid protocol: welcome at ceremony, don't redirect. Mobile comfort kit goes to her."
    },
    {
      "id": "p11",
      "name": "Stan's Best Friend",
      "role": "groom",
      "specificRole": "Co-MC (Indian guests)",
      "phone": "",
      "email": "",
      "notes": "Flying from India. Co-MC with invisible domain split."
    },
    {
      "id": "p12",
      "name": "Wes Walls",
      "role": "service",
      "specificRole": "Officiant + Premarital Counselor",
      "phone": "",
      "email": "",
      "notes": "Friend, house church pastor. Short speech + traditional directions. Gave H&S two books to study."
    },
    {
      "id": "p13",
      "name": "Mike",
      "role": "service",
      "specificRole": "Catering — Chicken/Fish",
      "phone": "",
      "email": "",
      "notes": "Making chicken + fish for main dish. Bringing 2-3 folding tables and 2×5-gal water dispensers."
    },
    {
      "id": "p14",
      "name": "Trudy",
      "role": "family",
      "specificRole": "",
      "phone": "",
      "email": "",
      "notes": "Has metal warming pans for keeping food hot."
    },
    {
      "id": "p15",
      "name": "Zubey",
      "role": "guest",
      "specificRole": "Friend",
      "phone": "",
      "email": "",
      "notes": "Stan funding travel. Needs attendance confirmation → ticket purchase."
    },
    {
      "id": "p16",
      "name": "Bonnie",
      "role": "service",
      "specificRole": "Food Coordinator",
      "phone": "",
      "email": "",
      "notes": "Coordinating potluck + food logistics on the day."
    },
    {
      "id": "p17",
      "name": "Carol Edel",
      "role": "service",
      "specificRole": "Dessert — Sheet Cakes",
      "phone": "",
      "email": "",
      "notes": "Making 2-3 sheet cakes for dessert."
    },
    {
      "id": "p18",
      "name": "Luke",
      "role": "family",
      "specificRole": "Wine Supply",
      "phone": "",
      "email": "",
      "notes": "Bringing wine + coolers/ice. Elsie coordinating."
    },
    {
      "id": "p19",
      "name": "Lori Tauscher",
      "role": "service",
      "specificRole": "Folk Dance Caller",
      "phone": "",
      "email": "",
      "notes": "Calling folk dances + supplying dance tracks ONLY. NOT the PA/sound lead — Daniel Barksdale handles the full PA system."
    },
    {
      "id": "p20",
      "name": "Sarah",
      "role": "family",
      "specificRole": "Flowers + Decor",
      "phone": "",
      "email": "",
      "notes": "Buying flowers (baby's breath etc). Possibly handling aisle runner and arch sourcing."
    },
    {
      "id": "p21",
      "name": "Shuba's Friend",
      "role": "service",
      "specificRole": "CAD Site Layout",
      "phone": "",
      "email": "",
      "notes": "Modeling wedding site in CAD for decoration/setup planning."
    },
    {
      "id": "p22",
      "name": "Shuba Murthy",
      "role": "bridal",
      "specificRole": "Bridesmaid",
      "phone": "",
      "email": "",
      "notes": "Making the full wedding playlist (all categories). Building 3 wooden risers (3-6\" tall) for couple + pastor."
    },
    {
      "id": "p23",
      "name": "Christa Shipman",
      "role": "bridal",
      "specificRole": "Bridesmaid",
      "phone": "",
      "email": "",
      "notes": "Hannah's sister. Sourcing one of the 2 ceremony arches. Has leftover disposable plates/silverware."
    },
    {
      "id": "p24",
      "name": "Daniel Barksdale",
      "role": "service",
      "specificRole": "Sound/DJ Lead",
      "phone": "",
      "email": "",
      "notes": "Full PA system: 6 speakers (3 main + 3 sub), soundboard + computer + 8 audio plugins. Separate from Lori Tauscher."
    },
    {
      "id": "p25",
      "name": "Jenny",
      "role": "family",
      "specificRole": "Guest Travel Coordinator + Runner",
      "phone": "",
      "email": "",
      "notes": "Likely Jenny Shipman (listed as on-site contact on SUP). Coordinating guest rides + hotels. Ferrying items from mom's house."
    },
    {
      "id": "p26",
      "name": "Josiah",
      "role": "guest",
      "specificRole": "Lost & Found Coordinator (candidate)",
      "phone": "",
      "email": "",
      "notes": "Potential candidate to collect lost items on a centralized table."
    },
    {
      "id": "p27",
      "name": "Lucas",
      "role": "family",
      "specificRole": "Cassie's Partner",
      "phone": "",
      "email": "",
      "notes": "With Cassie: bringing blue tent for Colleen's day-of comfort setup."
    }
  ],
  "groups": [
    "All",
    "Guests",
    "Website",
    "Venue",
    "Wedding Day",
    "Organizers",
    "Stan's Rolodex",
    "Procurement",
    "Wedding Week",
    "Guest List",
    "HanStan Logistics",
    "Catering"
  ],
  "tags": [
    "accommodation",
    "activities",
    "alcohol",
    "attire",
    "bugfix",
    "canopy",
    "catering",
    "ceremony",
    "colors",
    "communication",
    "consumables",
    "coordination",
    "coordinator",
    "counseling",
    "covenant",
    "crafts",
    "critical",
    "decorations",
    "delegated",
    "deposit",
    "design",
    "documents",
    "family",
    "faq",
    "favors",
    "festival",
    "finance",
    "flowers",
    "food",
    "governance",
    "honeymoon",
    "immediate",
    "invitations",
    "legal",
    "logistics",
    "music",
    "officiant",
    "park",
    "parking",
    "party",
    "phone",
    "photography",
    "planning",
    "playlist",
    "print",
    "procession",
    "reference",
    "registry",
    "reimbursement",
    "roles",
    "schedule",
    "shopping",
    "social",
    "sound",
    "specs",
    "survey",
    "tailoring",
    "teardown",
    "technical",
    "transport",
    "travel",
    "venue",
    "verify",
    "visa",
    "weather",
    "website"
  ],
  "savedViews": [],
  "prefs": {
    "advExpanded": true,
    "onboardSeen": true,
    "schedOnboardSeen": false,
    "scheduleSeeded": true,
    "sortBy": "priority",
    "groupByField": "group"
  },
  "scheduleEvents": [
    {
      "id": "se-001",
      "title": "Wake up / breakfast",
      "details": "Bride, bridal party, and setup crew leads.",
      "startTime": "05:30",
      "duration": 60,
      "status": "tbd",
      "zone": "off-site",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Cassie",
          "role": "present"
        },
        {
          "name": "Elsie",
          "role": "present"
        },
        {
          "name": "Christa",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-002",
      "title": "Load vehicles — decorations and supplies",
      "details": "Arch, risers, decorations, favors, programs, tablecloths, clothespins, ribbons, balloons, aisle runner, zip ties, gel pens, garbage bags, lawn games, mirrors, first aid supplies.",
      "startTime": "06:30",
      "duration": 30,
      "status": "tentative",
      "zone": "off-site",
      "people": [
        {
          "name": "Elsie",
          "role": "pic"
        },
        {
          "name": "Fen",
          "role": "helper"
        },
        {
          "name": "Lucas",
          "role": "helper"
        },
        {
          "name": "Cassie",
          "role": "helper"
        },
        {
          "name": "Jenny",
          "role": "helper"
        },
        {
          "name": "Sarah",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "arch",
        "risers",
        "decorations",
        "favors",
        "programs",
        "tablecloths",
        "clothespins",
        "ribbons",
        "balloons",
        "aisle runner",
        "zip ties",
        "gel pens",
        "garbage bags",
        "lawn games",
        "mirrors",
        "first aid supplies"
      ],
      "notes": [
        "Where is everything stored? Multiple locations, nail down crews for each location"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-load"
    },
    {
      "id": "se-003",
      "title": "Load vehicles — food & drink",
      "details": "Mike: grill, BBQ, 3 folding tables, 2 water dispensers. Luke: wine, coolers, ice, 15 gal water. Carol: cake, 6 food warmers, 3 black tablecloths. Stan: 2 cases sparkling cider. Rita/Aparna/Aarti: pre-cooked Indian dishes + warming equipment.",
      "startTime": "06:30",
      "duration": 30,
      "status": "tentative",
      "zone": "off-site",
      "people": [
        {
          "name": "Mike",
          "role": "pic"
        },
        {
          "name": "Luke",
          "role": "pic"
        },
        {
          "name": "Carol Edel",
          "role": "pic"
        },
        {
          "name": "Stan",
          "role": "helper"
        },
        {
          "name": "Rita",
          "role": "helper"
        },
        {
          "name": "Aparna",
          "role": "helper"
        },
        {
          "name": "Aarti",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "grill + BBQ",
        "3 folding tables",
        "2 water dispensers",
        "wine",
        "coolers",
        "ice",
        "15 gal water",
        "cake (in cooler)",
        "6 food warmers",
        "3 black tablecloths",
        "2 cases sparkling cider",
        "pre-cooked Indian dishes",
        "warming equipment"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-load"
    },
    {
      "id": "se-004",
      "title": "Load vehicles — sound",
      "details": "6 speakers, soundboard + computer, outlet strips.",
      "startTime": "06:30",
      "duration": 15,
      "status": "tentative",
      "zone": "off-site",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "6 speakers",
        "soundboard + computer",
        "outlet strips"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-load"
    },
    {
      "id": "se-005",
      "title": "Drive to park",
      "details": "Everyone in convoy or staggered.",
      "startTime": "07:00",
      "duration": 30,
      "status": "tbd",
      "zone": "off-site",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Drive time depends on getting-ready location — not yet determined."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-010",
      "title": "Arrive at park, pay parking / day passes",
      "details": "First wave arrives at park gate opening.",
      "startTime": "07:00",
      "duration": 15,
      "status": "tbd",
      "zone": "parking",
      "people": [
        {
          "name": "Jenny",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "day passes"
      ],
      "notes": [
        "How many day passes purchased vs. pay-at-gate?"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-011",
      "title": "Unload all vehicles to staging area",
      "details": "Near Shelter A. Dolly/trolley/cart needed.",
      "startTime": "07:15",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Elsie",
          "role": "pic"
        },
        {
          "name": "Fen",
          "role": "helper"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "dolly/trolley/cart"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-arrive"
    },
    {
      "id": "se-012",
      "title": "Changing tent + mirrors set up",
      "details": "PRIORITY #1 — Hair & makeup can't start until this is up.",
      "startTime": "07:45",
      "duration": 20,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Cassie",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "changing tent",
        "mirrors"
      ],
      "notes": [
        "Must complete before 8 AM for hair/makeup start."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-critpath"
    },
    {
      "id": "se-013",
      "title": "Canopy/tent drop-off received",
      "details": "Rental company drops off 4× canopies. Take photos of how equipment arrives for return.",
      "startTime": "07:45",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Jenny",
          "role": "pic"
        },
        {
          "name": "Elsie",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Photo documentation of delivery condition for damage disputes."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-critpath"
    },
    {
      "id": "se-014",
      "title": "Colleen's blue tent set up",
      "details": "Blankets, entertainment, seating for Merry. Deploys wherever Colleen settles. Kit goes to HER.",
      "startTime": "08:05",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Cassie",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "blue tent",
        "blankets",
        "entertainment items"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-015",
      "title": "Shelter area organized for food prep",
      "details": "Grill/BBQ positioned, folding tables placed, food warmers staged. Shelter has concrete floor, picnic tables, sink, 1 electric outlet.",
      "startTime": "08:20",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Mike",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-016",
      "title": "Hair and makeup begins",
      "details": "In changing tent area. ~3 hours.",
      "startTime": "08:50",
      "duration": 180,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Cassie",
          "role": "present"
        },
        {
          "name": "Christa",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-017",
      "title": "Canopies assembled",
      "details": "4× 10'x15' reception canopies.",
      "startTime": "11:50",
      "duration": 90,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Elsie",
          "role": "pic"
        },
        {
          "name": "Fen",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup8"
    },
    {
      "id": "se-018",
      "title": "Risers/platform built",
      "details": "3 steps for couple + officiant.",
      "startTime": "11:50",
      "duration": 30,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Shuba",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "risers/platform pieces"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup8"
    },
    {
      "id": "se-019",
      "title": "Mike begins grill/BBQ cooking",
      "details": "Salmon chunks + beef. All his own equipment. 3-4 hours.",
      "startTime": "11:50",
      "duration": 240,
      "status": "confirmed",
      "zone": "shelter",
      "people": [
        {
          "name": "Mike",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Mike is self-sufficient. Don't interrupt."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup8"
    },
    {
      "id": "se-020",
      "title": "Arch(es) placed at ceremony site",
      "details": "Under the firs, east of shelter.",
      "startTime": "15:50",
      "duration": 15,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Sarah Reese",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "arch"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup830"
    },
    {
      "id": "se-021",
      "title": "Ceremony chairs set up with center aisle",
      "details": "~150 chairs. Favors (magnet bottles) + programs on every other chair.",
      "startTime": "15:50",
      "duration": 45,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Lucas",
          "role": "helper"
        },
        {
          "name": "Fen",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "150 chairs",
        "favors",
        "programs"
      ],
      "notes": [
        "Elsie is pic"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup830"
    },
    {
      "id": "se-022",
      "title": "Indian dishes begin warming",
      "details": "Pre-cooked. Using Carol's 6 food warmers.",
      "startTime": "16:35",
      "duration": 180,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Rita",
          "role": "pic"
        },
        {
          "name": "Aparna",
          "role": "helper"
        },
        {
          "name": "Aarti",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Propane warming oven rental?"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup9"
    },
    {
      "id": "se-023",
      "title": "Reception tables placed under canopies",
      "details": "Between shelter and parking loop.",
      "startTime": "16:35",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Fen",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup9"
    },
    {
      "id": "se-024",
      "title": "Sound system setup + test",
      "details": "6 speakers, soundboard, 8 plugins, outlet strips. Test mics.",
      "startTime": "16:35",
      "duration": 60,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup9"
    },
    {
      "id": "se-025",
      "title": "Tables dressed",
      "details": "Tablecloths, clothespins, decorations. Confetti, flowers, vase/candle per table. Head table closest to river.",
      "startTime": "19:35",
      "duration": 30,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [
        "tablecloths",
        "clothespins",
        "decorations",
        "confetti",
        "flowers",
        "vases",
        "candles"
      ],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup930"
    },
    {
      "id": "se-026",
      "title": "Drinks station set up",
      "details": "Separate table for wine (away from main drinks). Water dispensers. Coolers + ice.",
      "startTime": "19:35",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Luke",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup930"
    },
    {
      "id": "se-027",
      "title": "Guest book / gift table set up",
      "details": "Gel pens, sign-in area.",
      "startTime": "20:05",
      "duration": 10,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Cassie",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "guest book",
        "gel pens"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup945"
    },
    {
      "id": "se-028",
      "title": "Lost & found table",
      "details": "Centralized collection point.",
      "startTime": "20:05",
      "duration": 5,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Josiah",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup945"
    },
    {
      "id": "se-029",
      "title": "Potluck items begin arriving",
      "details": "Labels/tags for each dish. Ingredients listed.",
      "startTime": "20:15",
      "duration": 120,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "labels",
        "tags"
      ],
      "notes": [
        "Ongoing — guests drop off throughout morning."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-030",
      "title": "Kids' area marked out",
      "details": "Babysitting pen boundaries, toys. Behind shelter.",
      "startTime": "20:15",
      "duration": 15,
      "status": "tbd",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [
        "toys",
        "boundary markers"
      ],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-031",
      "title": "Dance area marked out",
      "details": "In front of shelter.",
      "startTime": "20:15",
      "duration": 15,
      "status": "tbd",
      "zone": "dance",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-032",
      "title": "First aid station",
      "details": "Table, basic supplies, shade.",
      "startTime": "20:15",
      "duration": 10,
      "status": "tbd",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [
        "first aid supplies",
        "table"
      ],
      "notes": [
        "PIC unassigned. Family members in medicine.",
        "Scrap the full station setup and just bring a FAK to be assigned to Trudy if available/Christa/Elsie"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-033",
      "title": "Lawn games set up",
      "details": "Croquet + others.",
      "startTime": "20:15",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Roger",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "croquet set"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-034",
      "title": "Board game area",
      "details": "Table + chairs + game selection.",
      "startTime": "20:15",
      "duration": 10,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [
        "board games"
      ],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-035",
      "title": "Knightly tournament zone staged",
      "details": "Rubber swords/shields laid out.",
      "startTime": "22:15",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "rubber swords",
        "shields"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup1015"
    },
    {
      "id": "se-035b",
      "title": "Open stage / performance area marked",
      "details": "Power access, seating nearby.",
      "startTime": "22:15",
      "duration": 10,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup1015"
    },
    {
      "id": "se-036",
      "title": "Parking signage / balloon markers placed",
      "details": "So guests find Shelter A.",
      "startTime": "22:30",
      "duration": 10,
      "status": "tbd",
      "zone": "parking",
      "people": [],
      "itemsToBring": [
        "signs",
        "balloons"
      ],
      "notes": [
        "PIC unassigned — parking attendant."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup1030"
    },
    {
      "id": "se-037",
      "title": "Aisle runner laid",
      "details": "Last thing before ceremony area is 'done.'",
      "startTime": "22:30",
      "duration": 10,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Sarah Reese",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "aisle runner"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup1030"
    },
    {
      "id": "se-038",
      "title": "Cake placed in cooler at site",
      "details": "Keep cold until cutting time (~3:30 PM).",
      "startTime": "22:40",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Carol Edel",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-040",
      "title": "Hair and makeup wrapping up",
      "details": "3 hrs started at 8 AM.",
      "startTime": "11:00",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Cassie",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-041",
      "title": "Bridal party lunch: charcuterie board",
      "details": "EVERYONE EATS. This is mandatory.",
      "startTime": "11:30",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Zita",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "charcuterie board"
      ],
      "notes": [
        "Mandatory — do not skip."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-042",
      "title": "Bride gets dressed",
      "details": "In changing tent.",
      "startTime": "12:00",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "helper"
        },
        {
          "name": "Cassie",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-dress"
    },
    {
      "id": "se-043",
      "title": "Groom + groomsmen get ready",
      "details": "",
      "startTime": "12:00",
      "duration": 30,
      "status": "tbd",
      "zone": "shelter",
      "people": [
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Deba",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Where? Second changing canopy or elsewhere?"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-dress"
    },
    {
      "id": "se-044",
      "title": "Detail / getting-ready photos",
      "details": "Rings, shoes, vows, bouquet, jewelry, veil, Bible, invitation/program.",
      "startTime": "12:30",
      "duration": 30,
      "status": "tbd",
      "zone": "shelter",
      "people": [
        {
          "name": "Daniel Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Confirm photographer arrival time — Daniel scheduled for 2 PM but detail photos are 12:30."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-prep1230"
    },
    {
      "id": "se-045",
      "title": "Flowers: final bouquet assembly",
      "details": "Baby's breath, roses/red carnations. Main bouquet for bride. Single flower for each bridesmaid/groomsman.",
      "startTime": "12:30",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Sarah Reese",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "baby's breath",
        "roses",
        "red carnations"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-prep1230"
    },
    {
      "id": "se-046",
      "title": "Touch-ups, bustle, final adjustments",
      "details": "",
      "startTime": "13:00",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-prep1"
    },
    {
      "id": "se-047",
      "title": "Sound system relocated if needed",
      "details": "Confirm position for ceremony (under the firs).",
      "startTime": "13:00",
      "duration": 15,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-prep1"
    },
    {
      "id": "se-048",
      "title": "Walk-through: processional order rehearsed",
      "details": "Bridal party lineup + processional order.",
      "startTime": "13:30",
      "duration": 15,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Wes Walls",
          "role": "pic"
        },
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Deba",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "When does Wes arrive?"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-050",
      "title": "Guest arrival begins",
      "details": "Count cars without permits. Direct guests to seating. Guests sign guest book, note gifts. $5 parking fee.",
      "startTime": "14:00",
      "duration": 30,
      "status": "tentative",
      "zone": "parking",
      "people": [
        {
          "name": "Luke",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": "pg-arrive2"
    },
    {
      "id": "se-051",
      "title": "Photographers on duty",
      "details": "",
      "startTime": "14:00",
      "duration": 90,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Daniel Thomas",
          "role": "pic"
        },
        {
          "name": "Grace",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Confirm exact arrival time with both photographers."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-arrive2"
    },
    {
      "id": "se-052",
      "title": "Pre-ceremony music plays",
      "details": "Classical? 15-min processional track TBD.",
      "startTime": "14:00",
      "duration": 30,
      "status": "tbd",
      "zone": "ceremony",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Song selection TBD."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-arrive2"
    },
    {
      "id": "se-053",
      "title": "Seating announcement",
      "details": "Direct guests to take seats.",
      "startTime": "14:20",
      "duration": 5,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-054",
      "title": "CEREMONY BEGINS",
      "details": "",
      "startTime": "14:30",
      "duration": 0,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-055",
      "title": "Processional",
      "details": "Officiant → Groom's parents → Groom's mom → Bride's parents → Bridesmaid/Groomsman pairs → Best Man & MoH → Flower children → Groom → Bride.",
      "startTime": "14:30",
      "duration": 5,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Wes Walls",
          "role": "present"
        },
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Roger",
          "role": "present"
        },
        {
          "name": "Merry",
          "role": "present"
        },
        {
          "name": "Vivek",
          "role": "present"
        },
        {
          "name": "Rita",
          "role": "present"
        },
        {
          "name": "Aparna",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Deba",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Bride walks alone or with father?"
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-056",
      "title": "Minister greeting, opening words",
      "details": "",
      "startTime": "14:35",
      "duration": 10,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [
        {
          "name": "Wes Walls",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-057",
      "title": "Vows, rings, kiss",
      "details": "",
      "startTime": "14:45",
      "duration": 15,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Wes Walls",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "rings"
      ],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-058",
      "title": "Prayer / fire tunnel announced",
      "details": "Bride's family + anyone can line the aisle to pray as couple walks through.",
      "startTime": "15:00",
      "duration": 2,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [
        {
          "name": "Wes Walls",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-059",
      "title": "Prayer / fire tunnel",
      "details": "Couple walks through. Powerful moment — don't rush.",
      "startTime": "15:00",
      "duration": 15,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-060",
      "title": "Announcement: reception is next",
      "details": "Direct guests to carry their chairs to reception canopy area.",
      "startTime": "15:15",
      "duration": 2,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-070",
      "title": "Guests move chairs to reception area",
      "details": "Same chairs from ceremony → under canopies.",
      "startTime": "15:15",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-trans"
    },
    {
      "id": "se-071",
      "title": "Sound system relocated to reception/dance area",
      "details": "Or is it already positioned to cover both?",
      "startTime": "15:15",
      "duration": 10,
      "status": "tbd",
      "zone": "reception",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "May not be needed if sound covers both areas."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-trans"
    },
    {
      "id": "se-072",
      "title": "CAKE CUTTING",
      "details": "Carol Edel helps set out cake. Photographer captures.",
      "startTime": "15:30",
      "duration": 10,
      "status": "confirmed",
      "zone": "reception",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Carol Edel",
          "role": "helper"
        },
        {
          "name": "Daniel Thomas",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-073",
      "title": "Food final setup: buffet stations open",
      "details": "Plates, disposable silverware, napkins, labels out. Meat + rice + sides + potluck items arranged.",
      "startTime": "15:30",
      "duration": 10,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "plates",
        "disposable silverware",
        "napkins",
        "labels"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-080",
      "title": "Welcome speech / blessing before meal",
      "details": "",
      "startTime": "15:45",
      "duration": 5,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Who gives the blessing? TBD."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-081",
      "title": "Buffet opens",
      "details": "Guests serve themselves. Meat (American + Indian), rice, salads, sides, potluck dishes. Announce: meat and rice provided, sides are potluck.",
      "startTime": "15:45",
      "duration": 45,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Gluten-free / allergy info — announce or signage?"
      ],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": "pg-dinner"
    },
    {
      "id": "se-082",
      "title": "Wine served at separate table",
      "details": "Non-drinkers → sparkling cider at main drink station.",
      "startTime": "15:45",
      "duration": 75,
      "status": "tbd",
      "zone": "reception",
      "people": [
        {
          "name": "Elsie",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "May need wine server license."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-dinner"
    },
    {
      "id": "se-083",
      "title": "Family photos begin",
      "details": "ORDER: Sanyal family → Shipman family → Bride + bridal party → Groom + groomsmen → Bride + Groom.",
      "startTime": "16:00",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Daniel Thomas",
          "role": "pic"
        },
        {
          "name": "Grace",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Concurrent with eating."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-084",
      "title": "Eating wraps up, desserts available",
      "details": "Cake slices + potluck desserts (pies, cobblers).",
      "startTime": "16:30",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-085",
      "title": "Speeches / toasts",
      "details": "Sparkling cider toast.",
      "startTime": "16:45",
      "duration": 20,
      "status": "tbd",
      "zone": "reception",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "sparkling cider for toast"
      ],
      "notes": [
        "Speakers: Zita? Deyvansh? Confirm who and order."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-090",
      "title": "First dance",
      "details": "Song: Tangled dance (confirm).",
      "startTime": "17:00",
      "duration": 5,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Song selection: confirm Tangled."
      ],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-091",
      "title": "Father-daughter dance",
      "details": "Song TBD.",
      "startTime": "17:05",
      "duration": 5,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Roger",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-092",
      "title": "Groom-mother dance",
      "details": "Song TBD.",
      "startTime": "17:10",
      "duration": 5,
      "status": "tbd",
      "zone": "dance",
      "people": [
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Aparna",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Which mother — Aparna (birth) or Rita (step) or both?"
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-093",
      "title": "Dance floor opens — transition to parallel",
      "details": "MC announces: dance floor open, lawn games, board games, kids' tournament, open stage.",
      "startTime": "17:15",
      "duration": 2,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-094",
      "title": "Lori's folk dancing",
      "details": "She calls the dances. $300 sound rental + $400 operator = $700 total.",
      "startTime": "17:15",
      "duration": 60,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Lori Tauscher",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Uses main sound system or brings her own?"
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-095",
      "title": "Indian-style dancing",
      "details": "Music TBD.",
      "startTime": "18:15",
      "duration": 30,
      "status": "tbd",
      "zone": "dance",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-096",
      "title": "Open / free dancing",
      "details": "General party music.",
      "startTime": "18:45",
      "duration": 45,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-097",
      "title": "Tag tournament",
      "details": "Rules TBD.",
      "startTime": "17:15",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Stan",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-098",
      "title": "Knightly tournament (kids)",
      "details": "Rubber swords/shields. Thomas as Roman centurion anchor.",
      "startTime": "17:15",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-099",
      "title": "Open stage / live music",
      "details": "Depends on musical survey results.",
      "startTime": "17:15",
      "duration": 60,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC: guest performers."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-100",
      "title": "Lawn games (croquet)",
      "details": "Dad brought equipment.",
      "startTime": "17:15",
      "duration": 135,
      "status": "tentative",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Self-directed."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-101",
      "title": "Board games",
      "details": "All ages.",
      "startTime": "17:15",
      "duration": 135,
      "status": "tentative",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Self-directed."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-102",
      "title": "Historical reenactment",
      "details": "Format, costumes TBD.",
      "startTime": "17:15",
      "duration": 30,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Scope, format, costumes all TBD. Hannah's family."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-103",
      "title": "Babysitting pen (young kids)",
      "details": "Toys, supervision schedule. Parents rotate.",
      "startTime": "17:15",
      "duration": 135,
      "status": "tentative",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [
        "toys"
      ],
      "notes": [
        "Behind shelter. Parent rotation schedule needed."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-104",
      "title": "Golden hour couple photos",
      "details": "June 7 sunset in Keizer ≈ 8:50 PM, golden hour ≈ 7:50–8:50 PM. But photographer may leave at 6:30.",
      "startTime": "18:30",
      "duration": 45,
      "status": "tbd",
      "zone": "off-site",
      "people": [
        {
          "name": "Daniel Thomas",
          "role": "pic"
        },
        {
          "name": "Grace",
          "role": "pic"
        },
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "CONFLICT: Daniel may leave at 6:30 PM but golden hour isn't until ~7:50 PM. Confirm photographer end time."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-110",
      "title": "Last call announced",
      "details": "'Last song on the dance floor!'",
      "startTime": "19:30",
      "duration": 1,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-111",
      "title": "Sound system begins packing up",
      "details": "Equipment must be returned by 10 PM.",
      "startTime": "19:30",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown1"
    },
    {
      "id": "se-112",
      "title": "Wine / alcohol packed and secured",
      "details": "",
      "startTime": "19:30",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Luke",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown1"
    },
    {
      "id": "se-113",
      "title": "Kitchen cleanup begins",
      "details": "Package excess food, coolers, trash.",
      "startTime": "19:30",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Mike",
          "role": "pic"
        },
        {
          "name": "Vivek",
          "role": "helper"
        },
        {
          "name": "Rita",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown1"
    },
    {
      "id": "se-114",
      "title": "Desserts / leftover food packed",
      "details": "Into coolers / fridge-bound containers.",
      "startTime": "19:45",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-115",
      "title": "Guests depart",
      "details": "Firm but friendly. 'Thank you for celebrating with us!'",
      "startTime": "20:00",
      "duration": 15,
      "status": "tentative",
      "zone": "parking",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-116",
      "title": "Canopies taken down + staged for pickup",
      "details": "Ready for rental company pickup at 8:30 PM.",
      "startTime": "20:00",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Zita",
          "role": "pic"
        },
        {
          "name": "Cassie",
          "role": "helper"
        },
        {
          "name": "Roger",
          "role": "helper"
        },
        {
          "name": "Merry",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown2"
    },
    {
      "id": "se-117",
      "title": "Chairs + tables collected",
      "details": "",
      "startTime": "20:00",
      "duration": 20,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown2"
    },
    {
      "id": "se-118",
      "title": "Decorations, guest book, gift table collected",
      "details": "All personal items into vehicles.",
      "startTime": "20:00",
      "duration": 15,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown2"
    },
    {
      "id": "se-119",
      "title": "Trash sweep",
      "details": "Garbage bags. Leave no trace.",
      "startTime": "20:15",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [
        "garbage bags"
      ],
      "notes": [
        "Everyone remaining helps."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown3"
    },
    {
      "id": "se-120",
      "title": "Colleen's tent + comfort kit packed",
      "details": "",
      "startTime": "20:15",
      "duration": 10,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Cassie",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown3"
    },
    {
      "id": "se-121",
      "title": "Changing tent packed",
      "details": "",
      "startTime": "20:15",
      "duration": 10,
      "status": "tentative",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown3"
    },
    {
      "id": "se-122",
      "title": "Rental company pickup of canopies/equipment",
      "details": "Verify against drop-off photos.",
      "startTime": "20:30",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Jenny",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown4"
    },
    {
      "id": "se-123",
      "title": "Lost & found items distributed or packed",
      "details": "",
      "startTime": "20:30",
      "duration": 5,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Josiah",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown4"
    },
    {
      "id": "se-124",
      "title": "Final walkthrough",
      "details": "Nothing left behind. Site clean.",
      "startTime": "20:40",
      "duration": 10,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Jenny",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-125",
      "title": "ALL wedding participants leave park",
      "details": "15-minute buffer before hard close.",
      "startTime": "20:45",
      "duration": 15,
      "status": "confirmed",
      "zone": "parking",
      "people": [],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": false,
      "parallelGroup": null
    }
  ],
  "schedulePhases": [
    {
      "id": "sp-00",
      "number": 0,
      "title": "Pre-Park",
      "color": "#8B7D6B",
      "note": "Before driving to the park. Home/hotel locations.",
      "collapsed": false,
      "eventIds": [
        "se-001",
        "se-002",
        "se-003",
        "se-004",
        "se-005"
      ]
    },
    {
      "id": "sp-01",
      "number": 1,
      "title": "Setup",
      "color": "#6B8E6B",
      "note": "Park gate opens 7 AM. Build everything.",
      "collapsed": false,
      "eventIds": [
        "se-010",
        "se-011",
        "se-012",
        "se-013",
        "se-014",
        "se-015",
        "se-016",
        "se-017",
        "se-018",
        "se-019",
        "se-020",
        "se-021",
        "se-022",
        "se-023",
        "se-024",
        "se-025",
        "se-026",
        "se-027",
        "se-028",
        "se-029",
        "se-030",
        "se-031",
        "se-033",
        "se-034",
        "se-032",
        "se-035",
        "se-035b",
        "se-036",
        "se-037",
        "se-038"
      ]
    },
    {
      "id": "sp-02",
      "number": 2,
      "title": "Bridal Party Final Prep",
      "color": "#C4A882",
      "note": "Hair wraps up, lunch, dress, photos, rehearsal.",
      "collapsed": false,
      "eventIds": [
        "se-040",
        "se-041",
        "se-042",
        "se-043",
        "se-044",
        "se-045",
        "se-046",
        "se-047",
        "se-048"
      ]
    },
    {
      "id": "sp-03",
      "number": 3,
      "title": "Guest Arrival + Ceremony",
      "color": "#9A454D",
      "note": "The main event.",
      "collapsed": false,
      "eventIds": [
        "se-050",
        "se-051",
        "se-052",
        "se-053",
        "se-054",
        "se-055",
        "se-056",
        "se-057",
        "se-058",
        "se-059",
        "se-060"
      ]
    },
    {
      "id": "sp-04",
      "number": 4,
      "title": "Transition",
      "color": "#B8A88A",
      "note": "Move chairs, cake cutting, buffet setup.",
      "collapsed": false,
      "eventIds": [
        "se-070",
        "se-071",
        "se-072",
        "se-073"
      ]
    },
    {
      "id": "sp-05",
      "number": 5,
      "title": "Reception Dinner",
      "color": "#8B6E4E",
      "note": "Eat, drink, photos, speeches.",
      "collapsed": true,
      "eventIds": [
        "se-080",
        "se-081",
        "se-082",
        "se-083",
        "se-084",
        "se-085"
      ]
    },
    {
      "id": "sp-06",
      "number": 6,
      "title": "Celebration",
      "color": "#6E8B6E",
      "note": "Festival block — dances, games, activities in parallel.",
      "collapsed": true,
      "eventIds": [
        "se-090",
        "se-091",
        "se-092",
        "se-093",
        "se-094",
        "se-095",
        "se-096",
        "se-097",
        "se-098",
        "se-099",
        "se-100",
        "se-101",
        "se-102",
        "se-103",
        "se-104"
      ]
    },
    {
      "id": "sp-07",
      "number": 7,
      "title": "Wind-Down + Teardown",
      "color": "#7B6B8E",
      "note": "Pack everything. Out by 9 PM.",
      "collapsed": true,
      "eventIds": [
        "se-110",
        "se-111",
        "se-112",
        "se-113",
        "se-114",
        "se-115",
        "se-116",
        "se-117",
        "se-118",
        "se-119",
        "se-120",
        "se-121",
        "se-122",
        "se-123",
        "se-124",
        "se-125"
      ]
    }
  ],
  "scheduleQuestions": [
    {
      "id": "sq-01",
      "question": "Where is everyone sleeping the night before? (Determines wake-up time and drive time)",
      "eventId": "se-001",
      "status": "resolved",
      "resolution": "Rodeway hotel in North Salem",
      "resolvedDate": "2026-04-19T05:41:51.558Z"
    },
    {
      "id": "sq-02",
      "question": "Drive time to park? (Can't finalize Phase 0 without this)",
      "eventId": "se-005",
      "status": "resolved",
      "resolution": "Variety; about 15-20 minutes from Rodeway for bridesmaids/Elsie",
      "resolvedDate": "2026-04-22T03:50:49.685Z"
    },
    {
      "id": "sq-03",
      "question": "Day-of coordinator: Jenny confirmed? (Master Doc says Jenny, memory says role unfilled)",
      "eventId": "se-010",
      "status": "resolved",
      "resolution": "Jenny as day-of coordinator confirmed",
      "resolvedDate": "2026-04-19T05:48:04.631Z"
    },
    {
      "id": "sq-04",
      "question": "Photographer arrival time + end time? (Affects detail photos at 12:30 PM AND golden hour)",
      "eventId": "se-044",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-05",
      "question": "Wes Walls arrival time? (Needed for walk-through at 1:30 PM)",
      "eventId": "se-048",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-06",
      "question": "Who gives welcome speech/blessing before dinner?",
      "eventId": "se-080",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-07",
      "question": "Who gives speeches/toasts? (Zita and Deyvansh mentioned but not confirmed)",
      "eventId": "se-085",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-08",
      "question": "Processional: bride walks alone or with father?",
      "eventId": "se-055",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-09",
      "question": "Groom-mother dance: Aparna (birth mom) or Rita (stepmom) or both?",
      "eventId": "se-092",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-10",
      "question": "Wine server license needed? (Elsie mentioned as possibility)",
      "eventId": "se-082",
      "status": "resolved",
      "resolution": "Elsie can't be OLCC certified, need someone else to be certified and serving",
      "resolvedDate": "2026-04-22T04:08:06.736Z"
    },
    {
      "id": "sq-11",
      "question": "Propane warming oven rental for Indian food?",
      "eventId": "se-022",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-12",
      "question": "Historical reenactment scope/format?",
      "eventId": "se-102",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-13",
      "question": "Smoker shuttle destination?",
      "eventId": "se-093",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-14",
      "question": "Post-park plan for guests after 9 PM?",
      "eventId": "se-115",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-15",
      "question": "Airbnb for bride + groom after wedding?",
      "eventId": "se-125",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-16",
      "question": "Lori's sound: does she use the main system or bring her own? ($700 total — $300 rental + $400 operator)",
      "eventId": "se-094",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-17",
      "question": "Golden hour timing conflict: Daniel Thomas may leave at 6:30 PM but golden hour isn't until ~7:50 PM. Who shoots golden hour?",
      "eventId": "se-104",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    }
  ],
  "lastModified": "2026-04-23T20:45:28.719Z",
  "lastModifiedBy": "Hannah & Stan"
}
```

### Post-Phase-C snapshot (2026-04-24)

```json
{
  "schemaVersion": 6,
  "tasks": [
    {
      "id": "t1",
      "taskId": "A1",
      "workstream": "a",
      "title": "Registry — Get All 32 Gifts Live with Real Images",
      "desc": "Live site has 6 sample gifts with placeholders. 26-gift batch JSON exists but never imported. Hannah's image sheet (32 items) is authoritative.",
      "priority": "critical",
      "status": "done",
      "quadrant": "q1",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "Stan",
      "tags": [
        "registry",
        "website"
      ],
      "blockedBy": "Stan decision on deployment path",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:45:16.995Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:12:06.556Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:45:16.995Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t2",
      "taskId": "A2",
      "workstream": "a",
      "title": "Refresh Spec Anchors Against Live Repo",
      "desc": "All three v0.1 spec layers grounded against stale project files. Must fetch live, diff, update before ticket execution.",
      "priority": "high",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "specs",
        "technical"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:12:09.180Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:12:09.180Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t3",
      "taskId": "A3",
      "workstream": "a",
      "title": "Execute Registry Bugfix Bundle (HW-012A–F)",
      "desc": "6 tickets, 6 files, 14 fixes. Registry UX overhaul, dream section removal, visual polish.",
      "priority": "high",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "bugfix",
        "technical"
      ],
      "blockedBy": "A2",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:12:10.348Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:12:10.348Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t4",
      "taskId": "A4",
      "workstream": "a",
      "title": "Execute Standalone Bugfix Tickets (T1–T6)",
      "desc": "T1–T4 code produced (deploy unknown). T5 homepage link + T6 admin fixes never executed.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Claude, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "bugfix",
        "technical"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:12:14.003Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:12:14.003Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t5",
      "taskId": "A5",
      "workstream": "a",
      "title": "FAQ — Rewrite Plus-One/Children Answer",
      "desc": "Draft copy ready from Hannah's Discord. Covers invitation scope, plus-one RSVP, children caveats.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Claude",
      "location": "",
      "contacts": "Hannah",
      "tags": [
        "faq",
        "website"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:13:43.242Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:13:43.242Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t6",
      "taskId": "A6",
      "workstream": "a",
      "title": "FAQ — Add \"What Should I Bring?\"",
      "desc": "Weather clothing, casual clothes, lawn games, potluck food item.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Claude",
      "location": "",
      "contacts": "Hannah",
      "tags": [
        "faq",
        "website"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:14:03.212Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:14:03.212Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t7",
      "taskId": "A7",
      "workstream": "a",
      "title": "FAQ — Verify Symbol Fix",
      "desc": "Emoji fix was deployed. Verify if additional symbol issues remain.",
      "priority": "low",
      "status": "done",
      "quadrant": "q3",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "faq",
        "verify"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T14:58:42.712Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T14:58:42.712Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t8",
      "taskId": "A8",
      "workstream": "a",
      "title": "Build Day-of Schedule Page",
      "desc": "Nothing exists yet. Ceremony order now drafted (B25) — partially unblocked.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Claude, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "website",
        "schedule"
      ],
      "blockedBy": "B25",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T05:07:40.755Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:33:00.990Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-19T05:07:40.755Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t9",
      "taskId": "A9",
      "workstream": "a",
      "title": "Generate Build Tickets from Specs",
      "desc": "Three-layer spec complete, 36 decisions locked. Ready after anchor refresh.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "technical"
      ],
      "blockedBy": "A2",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:14:09.005Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:14:09.005Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t10",
      "taskId": "A10",
      "workstream": "a",
      "title": "dialogueXR §10 Failure Modes",
      "desc": "File divergence, skipping gel layer, premature ticket authoring.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "Stan, Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:14:14.147Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:14:14.147Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t11",
      "taskId": "B1",
      "workstream": "b",
      "title": "Honeymoon/Move — 3 Linked Decisions",
      "desc": "Primary candidate: PNW Airbnb tour. Plus packing/shipping + vehicle decisions.",
      "priority": "high",
      "status": "blocked",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "Hannah, Stan",
      "tags": [
        "honeymoon",
        "master-only"
      ],
      "blockedBy": "Joint H+S decision",
      "group": "HanStan Logistics",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:33:57.276Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:39:18.150Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:47:31.075Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t12",
      "taskId": "B2",
      "workstream": "b",
      "title": "Send Invitations (Physical + Digital)",
      "desc": "Stan's #1 priority. Hannah finishing hers. Stan needs full invitee list (incl unlikely). Three steps: list → address → send. Form matters less than reaching people.",
      "priority": "critical",
      "status": "done",
      "quadrant": "q1",
      "deadline": "2026-04-01",
      "persona": "guest",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "invitations",
        "immediate"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:43.206Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:35:11.113Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-23T03:55:07.669Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t13",
      "taskId": "B3",
      "workstream": "b",
      "title": "International Friends' Visa Follow-Up",
      "desc": "Friends have applied. Status unknown. Must follow up — lead times could prevent attendance.",
      "priority": "critical",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-03-25",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "visa",
        "critical"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:30:39.505Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:39.505Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t14",
      "taskId": "B4",
      "workstream": "b",
      "title": "Zubey — Confirm Attendance & Buy Tickets",
      "desc": "Decision made to buy. Need confirmation. Earlier = cheaper.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-01",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "Zubey",
      "tags": [
        "travel",
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:34:07.627Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:49:00.642Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:49:04.322Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:49:07.797Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t15",
      "taskId": "B5",
      "workstream": "b",
      "title": "Canopy + Furniture Rental + Park Setup",
      "desc": "RENTAL BOOKED: Order #589401 (A to Z Party, Elsie). 8 canopies, 24 tables, 144 chairs + tablecloths. Delivery 9am, pickup 9pm on 6/6/2026. Hannah owes Elsie $545 reimbursement. SUP fee $250 (check to OPRD): mail to Attn Park Specialist, 10991 Wheatland Road NE, Gervais OR 97026 — confirm if sent. Open questions to park: max shelter amperage, helium balloon placement, smoking in cars. Port-a-potties: plan 1-2 (min 1 ADA) — vendor not yet contacted.",
      "priority": "critical",
      "status": "done",
      "quadrant": "q1",
      "deadline": "2026-04-20",
      "persona": "organizer",
      "assignee": "Hannah, Zita",
      "location": "Willamette Mission State Park, Shelter A",
      "contacts": "Hannah, Zita, Elsie",
      "tags": [
        "canopy",
        "park",
        "venue",
        "deposit"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T07:21:44.638Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:14:28.986Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:22.860Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-19T07:21:44.638Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t16",
      "taskId": "B6",
      "workstream": "b",
      "title": "Food & Catering Plan",
      "desc": "Mike: chicken/fish. Stan's parents: chicken+beef+rice. Bonnie: food coordinator. Carol Edel: 2-3 sheet cakes. Luke: wine+coolers. 2 cases sparkling cider. Potluck base. Carol Edel has warming pans.",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "2026-05-01",
      "persona": "guest",
      "assignee": "Stan, Bonnie",
      "location": "Willamette Mission State Park",
      "contacts": "Mike, Bonnie, Carol Edel, Trudy, Zita, Luke",
      "tags": [
        "food",
        "catering"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T06:26:48.314Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:14:40.281Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:34:15.359Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:39:58.377Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-19T06:26:46.679Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Undo status",
          "time": "2026-04-19T06:26:48.314Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t17",
      "taskId": "B7",
      "workstream": "b",
      "title": "Smoke Shuttle Coordination",
      "desc": "Vehicle + driver for park-boundary runs. Smoking prohibited on grounds.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "logistics"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:15:48.065Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:15:48.065Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t18",
      "taskId": "B8",
      "workstream": "b",
      "title": "Stan Family Outreach (Aunt, Cousin, Stepbrother)",
      "desc": "",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-01",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "family",
        "invitations"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [
        {
          "text": "Aunt: reconnect first (~20 yrs), then invite.",
          "done": false
        },
        {
          "text": "Cousin: straight invite.",
          "done": false
        },
        {
          "text": "Stepbrother (NZ): straight invite, visa-waiver eligible.",
          "done": false
        },
        {
          "text": "Peter",
          "done": false
        },
        {
          "text": "Aarti",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T14:58:25.263Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:34:22.511Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t19",
      "taskId": "B9",
      "workstream": "c",
      "title": "Premarital Counseling + Wes Books + Officiant",
      "desc": "Wes Walls confirmed officiant (friend, house church pastor). Short speech + traditional directions. Study his two books chapter by chapter before next meeting.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "Wes Walls",
      "tags": [
        "counseling",
        "officiant",
        "master-only"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [
        {
          "ts": "2026-04-24T07:38:43.094Z",
          "by": "Hannah & Stan",
          "text": "Wes dropped out as officiant per 2026-04-23. Stan+Hannah continuing counseling+Bible discussion independently via M10. Find new officiant via M11."
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:24.024Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:38:43.094Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t20",
      "taskId": "B10",
      "workstream": "b",
      "title": "Covenant Card v2",
      "desc": "v1 done. v2 ticket written: two-panel interactive card, tabbed UI, scripture popups.",
      "priority": "low",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "covenant"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:18:57.950Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:18:57.950Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t21",
      "taskId": "B11",
      "workstream": "b",
      "title": "Festival Programming — 23 Elements",
      "desc": "Live music, folk dancing (Lori Tauscher), reenactment, tag tournament, lawn games, board games, babysitting, knightly tournament (Thomas), trampoline, smoke shuttle, cigars, favors, first aid, changing canopies, Colleen comfort kit, co-MCs, Indian dance, popsicle craft, guest sign-in, reception lights, ribbons, decorations/flowers, entrance signs.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-15",
      "persona": "guest",
      "assignee": "Hannah, Stan",
      "location": "Willamette Mission State Park",
      "contacts": "Thomas, Elsie, Lori Tauscher",
      "tags": [
        "festival",
        "activities"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:36:43.997Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:12.247Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:36:43.997Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t22",
      "taskId": "B12",
      "workstream": "b",
      "title": "Musical Guest Survey",
      "desc": "Identify which guests play instruments and would perform at open stage.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "music",
        "survey"
      ],
      "blockedBy": "Guests must fill out RSVP form",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:49:04.953Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:53.232Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:49:04.953Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t23",
      "taskId": "B13",
      "workstream": "b",
      "title": "Wedding Playlist",
      "desc": "Confirmed tracks: Putting on the Ritz, Crazy Little Thing Called Love, Tangled snippet. Categories: pre-ceremony, procession, bride entrance, post-ceremony, reception, Lori dance tracks, Indian music. Add to YT Premium.",
      "priority": "medium",
      "status": "in-progress",
      "quadrant": "q3",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "music",
        "playlist"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [
        {
          "ts": "2026-04-24T07:35:22.372Z",
          "by": "Hannah & Stan",
          "text": "See D7 for playlist-owner conflict (Master Doc says Stan, Tasks+Needs says Shuba). B13 action is blocked on D7 resolution."
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:58.442Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:38:13.775Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t24",
      "taskId": "B14",
      "workstream": "a",
      "title": "Wedding Party Communication Channel",
      "desc": "WhatsApp or Discord. Everyone flexible. Members: MoH, 2+ sisters, best friends, Thomas, brother.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-01",
      "persona": "organizer",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "communication"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:29:44.244Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:44.244Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t25",
      "taskId": "B15",
      "workstream": "b",
      "title": "Guest Allergy Survey",
      "desc": "Collect dietary restrictions. Feeds into catering.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "food",
        "survey"
      ],
      "blockedBy": "Guest list + RSVP",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:29:20.189Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:20.189Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t26",
      "taskId": "B16",
      "workstream": "b",
      "title": "Advance Coordination Week (May 31–Jun 6)",
      "desc": "H&S arrive ~1 week before. Aparna arrive ~1 week before. Need daily logistics plan.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-25",
      "persona": "organizer",
      "assignee": "Hannah, Stan",
      "location": "Oregon",
      "contacts": "",
      "tags": [
        "logistics"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T04:46:48.683Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:12.314Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:37:36.120Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T04:46:48.683Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t27",
      "taskId": "B17",
      "workstream": "b",
      "title": "Parents' Travel Itinerary",
      "desc": "Stan's parents + friend group renting Airbnb, road trip vacation.",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "family",
        "travel"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:38:42.048Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t28",
      "taskId": "B18",
      "workstream": "c",
      "title": "Brother & Sister-in-Law Involvement",
      "desc": "Give meaningful roles. Make attractive, not a chore.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "family",
        "roles"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:29:30.754Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:30.753Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t29",
      "taskId": "B19",
      "workstream": "b",
      "title": "Brother's Guest List Input",
      "desc": "Ask who else should be invited.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "invitations",
        "family",
        "organizers",
        "guest-list",
        "master-only"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:28:22.835Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:33:08.242Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t30",
      "taskId": "B20",
      "workstream": "c",
      "title": "Photographer Coordination",
      "desc": "Daniel Thomas: CONTRACT SIGNED, deposit paid, ~$1,500 total. On duty from 2pm Jun 7, photos right after ceremony while reception begins. Grace confirmed as 2nd photographer (~$1,800/6hrs). Golden hour timing critical. Connect Daniel + Grace.",
      "priority": "medium",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "",
      "persona": "service",
      "assignee": "Stan",
      "location": "",
      "contacts": "Daniel Thomas, Grace",
      "tags": [
        "photography"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:29:07.431Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:29:07.431Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t31",
      "taskId": "B21",
      "workstream": "b",
      "title": "Grace deVries — 2nd Photographer BOOKED (contract signed + $625 retainer sent 2026-04-23)",
      "desc": "Grace DECLINED day-of coordinator role. CONFIRMED as 2nd photographer (~$1,800/6hrs). Still need a day-of coordinator — searching. Elsie = general coordinator only.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "service",
      "assignee": "Stan",
      "location": "",
      "contacts": "Grace, Elsie",
      "tags": [
        "coordinator",
        "photography"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [
        {
          "ts": "2026-04-24T07:38:43.094Z",
          "by": "Hannah & Stan",
          "text": "Status corrected: Grace is fully booked as 2nd photographer. Previous title said coordinator role declined which referred to a different role. Contracted 2026-04-23 per retainer payment confirmation."
        }
      ],
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t32",
      "taskId": "B22",
      "workstream": "b",
      "title": "Wind Protection for Canopies",
      "desc": "Figure out solution + verify handled/procured.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "canopy",
        "weather"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:40:14.037Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:30:57.507Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:40:11.683Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-17T06:40:14.037Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t33",
      "taskId": "B23",
      "workstream": "a",
      "title": "Google Drive Coordination Folder",
      "desc": "Mostly complete (joint H+S). Hannah behind on to-do updates. Bridesmaids have edit access.",
      "priority": "medium",
      "status": "mostly-done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "organizer",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "planning",
        "documents"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:37:56.023Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:28:54.797Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:37:56.023Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t34",
      "taskId": "B24",
      "workstream": "b",
      "title": "Wedding Program / Schedule (Print + Mobile)",
      "desc": "Design based on ceremony order from Master doc. Print via Staples. Also on website. Needs volunteer designer.",
      "priority": "high",
      "status": "mostly-done",
      "quadrant": "q2",
      "deadline": "2026-05-20",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "design",
        "print"
      ],
      "blockedBy": "B25",
      "group": "Website",
      "subtasks": [
        {
          "text": "Research standard schedules",
          "done": true
        },
        {
          "text": "Create superset draft schedule",
          "done": false
        },
        {
          "text": "With Hannah, Discuss and refine draft schedule",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T05:08:24.285Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:28:45.673Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:25:04.243Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Mostly Done",
          "time": "2026-04-19T05:08:06.488Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-19T05:08:24.285Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t35",
      "taskId": "B25",
      "workstream": "b",
      "title": "Day-of Sequence Optimization",
      "desc": "CEREMONY ORDER DRAFTED: Setup 9am. Guests arrive 2pm. Ceremony 2:30pm: signs → seating → 10min music → processional → prayer → officiant speech → vows → rings → prayer tunnel → reception → potluck buffet → cake → dancing (Lori folk dances + Indian music). Golden hour photos late. Last call 7:30pm, wine packed 8pm. Cleanup 7:30pm. Out by 8:45pm. 9PM hard stop.",
      "priority": "medium",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "2026-05-01",
      "persona": "organizer",
      "assignee": "Hannah, Stan",
      "location": "Willamette Mission State Park",
      "contacts": "Daniel Thomas, Grace, Wes Walls, Lori Tauscher",
      "tags": [
        "schedule",
        "ceremony"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:36:59.275Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:28:59.837Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:36:59.275Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t36",
      "taskId": "B26",
      "workstream": "b",
      "title": "Post-Park Accommodation + Transportation",
      "desc": "Where should parents/friends stay? Who does pickups/dropoffs? Van available for ferrying? What do guests do after 9PM?",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "accommodation",
        "transport"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:36:39.092Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:31:02.243Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:35:27.527Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:36:39.092Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t37",
      "taskId": "B27",
      "workstream": "b",
      "title": "Groomsmen Attire + Tailoring",
      "desc": "Stan decides attire. Tailoring needs lead time. Tanvi = backup groomsman.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-15",
      "persona": "groom",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "attire",
        "tailoring"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:34:36.361Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:34:36.361Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t38",
      "taskId": "B28",
      "workstream": "b",
      "title": "Schedule Phone Call with Elsie",
      "desc": "She offered Tuesday March 17. Deadline passed — verify if call happened. If not, reschedule.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "2026-03-17",
      "persona": "organizer",
      "assignee": "Stan",
      "location": "",
      "contacts": "Elsie",
      "tags": [
        "phone",
        "coordination"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T14:36:34.770Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t39",
      "taskId": "B29",
      "workstream": "b",
      "title": "Elsie's To-Do Items (Delegated)",
      "desc": " ",
      "priority": "medium",
      "status": "done",
      "quadrant": "q3",
      "deadline": "2026-05-30",
      "persona": "bridal",
      "assignee": "Elsie",
      "location": "",
      "contacts": "Elsie, Luke",
      "tags": [
        "crafts",
        "favors",
        "delegated"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [
        {
          "text": "Luke wine+coolers",
          "done": true
        },
        {
          "text": "To-get wedding list",
          "done": true
        },
        {
          "text": "Choker+bracelet sets",
          "done": true
        },
        {
          "text": "Popsicle stick craft",
          "done": true
        },
        {
          "text": "Bottles (favor magnets)",
          "done": true
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T03:59:47.582Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:40:37.443Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:28:10.158Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T03:59:45.204Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-23T03:59:47.582Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t40",
      "taskId": "B30",
      "workstream": "b",
      "title": "Bridesmaid White Jackets (Cassie)",
      "desc": "Searching for matching short white jackets over dresses.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q3",
      "deadline": "2026-05-15",
      "persona": "bridal",
      "assignee": "Cassie",
      "location": "",
      "contacts": "Cassie",
      "tags": [
        "attire",
        "delegated"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:26:35.744Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:05.475Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-17T06:26:35.744Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t41",
      "taskId": "B31",
      "workstream": "a",
      "title": "Website FAQ Additions",
      "desc": "Needed: wedding colors+attire freedom, drink info, activity release, outdoor/weather/sun note, transport/logistics, driving directions+map, parking instructions.",
      "priority": "medium",
      "status": "done",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "website"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T03:55:27.331Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:40:21.209Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-23T03:55:27.331Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t42",
      "taskId": "B32",
      "workstream": "b",
      "title": "Marriage License",
      "desc": "Legal requirement. Stan and Hannah must appear in person with IDs. Marriage license applications are processed from 8:30-4:30 PM Monday – Friday. Please allow 20 minutes depending on our lobby wait time.\nAddress: Marion County Clerk’s Office\n555 Court St NE, Suite 2130\nSalem, Oregon 97301\n\n(503) 588-5225\nclerk@co.marion.or.us\n\nPay Fees in-person\nMarriage License - $60.00\nCertified Copies - $4.00 (1 copy requested)\nWe accept cash, checks, money orders, and credit cards.",
      "priority": "critical",
      "status": "in-progress",
      "quadrant": "q1",
      "deadline": "2026-06-01",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "Oregon",
      "contacts": "",
      "tags": [
        "legal",
        "critical"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [
        {
          "text": "Apply for Oregon license",
          "done": true
        },
        {
          "text": "Speak to clerk to choose legal names (in-person or phone call? currently unknown)",
          "done": false
        },
        {
          "text": "Pick up document from Courthouse",
          "done": false
        },
        {
          "text": "Submit completed license after marriage",
          "done": false
        }
      ],
      "comments": [
        {
          "ts": "2026-04-24T07:38:43.094Z",
          "by": "Hannah & Stan",
          "text": "Hannah has applied for the marriage licence per 2026-04-23 infodump. (Apply-subtask was already marked done; this comment adds the attribution + 2026-04-23 context.)"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:40:03.501Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T04:43:54.318Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T04:47:02.505Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t43",
      "taskId": "B33",
      "workstream": "b",
      "title": "Sound System (Daniel Barksdale) ",
      "desc": "Daniel Barksdale: full PA system — 6 speakers (3 main + 3 sub), soundboard + computer + 8 plugins. Shelter has only 2 outlets — max amperage question sent to park, AWAITING REPLY. Fallback: 1 speaker + soundboard, or rented generator. Lori Tauscher: folk dance caller + dance tracks ONLY (separate from PA).",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "",
      "persona": "service",
      "assignee": "Hannah",
      "location": "Willamette Mission State Park",
      "contacts": "Daniel Barksdale, Lori Tauscher",
      "tags": [
        "music",
        "sound"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [
        {
          "text": "Shelter has only 2 outlets — max amperage question sent to park, AWAITING REPLY",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T03:57:54.300Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:08:13.829Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:27.044Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T03:57:54.300Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t44",
      "taskId": "B34",
      "workstream": "b",
      "title": "Parking + Transportation Logistics",
      "desc": "Offsite parking needed. Communicate carpooling+walking on FAQ+directly. Van for ferrying? Greeter for parking.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "guest",
      "assignee": "Hannah",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "parking",
        "logistics"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:44:09.886Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:09.886Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t45",
      "taskId": "B35",
      "workstream": "b",
      "title": "Pre-Wedding Dinner With Parents",
      "desc": "Merry+family to organize. Vivek and Rita to bring alcohol, possibly gifts",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "guest",
      "assignee": "Merry",
      "location": "",
      "contacts": "",
      "tags": [
        "party",
        "social"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-23T04:46:06.570Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:21.619Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T04:46:06.570Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t46",
      "taskId": "B36",
      "workstream": "b",
      "title": "Procession Planning",
      "desc": "Draft order exists. Open: how does Stan arrive? Flower girl/nephews order? Bride entrance music? MOH carries rings?",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "bridal",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "ceremony",
        "procession"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:39:51.812Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:51.812Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t47",
      "taskId": "B37",
      "workstream": "b",
      "title": "Teardown + Cleaning",
      "desc": "Announce at event asking guests to help. Park closes 9PM. Need teardown captain.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "organizer",
      "assignee": "",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "logistics",
        "teardown"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:42:57.569Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:44.421Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:42:57.569Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t48",
      "taskId": "B38",
      "workstream": "b",
      "title": "Decorations + Flowers",
      "desc": "Flowers+decorations still need purchasing",
      "priority": "medium",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Sarah",
      "location": "",
      "contacts": "Elsie",
      "tags": [
        "decorations",
        "flowers",
        "design"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:50:51.417Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:36.398Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:50:51.417Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t49",
      "taskId": "B39",
      "workstream": "b",
      "title": "Wedding Colors Reference",
      "desc": "Green #1A6C24, Blue #201761, Ivory #fffff6, Red #6C241A, Sand #ebd8bd. David's Bridal: Marine, Juniper, Wine. Add to website + invitations.",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "colors",
        "reference"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:38:21.279Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:38:21.279Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t50",
      "taskId": "B40",
      "workstream": "b",
      "title": "Consumables Shopping List",
      "desc": "Ice (day-of), disposable silverware/plates/cups, flowers/decorations, guest book+pens, 2 cases sparkling cider. From family: bridge (Dad), water dispensers (Mom/Dad), folding tables.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q3",
      "deadline": "2026-05-30",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "shopping",
        "consumables"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:39:30.796Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:39:30.796Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t51",
      "taskId": "C1",
      "workstream": "a",
      "title": "dialogueXR v0.3 Changelog Gap",
      "desc": "Scrybal tweaked between Sessions 6–7. Changes not logged.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "Claude",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:16.376Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:08:53.441Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:16.376Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t52",
      "taskId": "C2",
      "workstream": "a",
      "title": "Workshop STL Template",
      "desc": "Across project contexts.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:21.122Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:08:54.377Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:21.122Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t53",
      "taskId": "C3",
      "workstream": "a",
      "title": "System Architecture Map",
      "desc": "Artifact inventory + integration gaps.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:24.013Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:36:50.186Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:24.013Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t54",
      "taskId": "C4",
      "workstream": "a",
      "title": "Unify Canonical Files",
      "desc": "Integrate all into governance system.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:27.017Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:08:57.458Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:27.017Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t55",
      "taskId": "C5",
      "workstream": "a",
      "title": "Extract Invariant Templates",
      "desc": "Needs uploads from cross-project artifacts.",
      "priority": "low",
      "status": "done",
      "quadrant": "q4",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "governance"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:29.785Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:08:58.697Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:29.785Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t56",
      "taskId": "B41",
      "workstream": "b",
      "title": "OLCC certified server (NOT necessary)",
      "desc": "RESOLVED! A liquor license is NOT needed at special events where alcohol is available but there is no payment or purchase required and no donations of money are accepted for alcohol, entry, or admission. The explicit example given is a wedding reception where you make alcohol available but don't require payment or accept donations. es — the OLCC exemption applies to all alcohol types (wine, beer, spirits) equally. The exemption is triggered by the payment/donation condition, not by what kind of alcohol is being served. Free hard liquor at a private wedding = same legal standing as free wine. The only wrinkle worth flagging: some city park rules restrict alcohol content to 14% or less for private events Salem — but that's a City of Salem parks rule, not Oregon State Parks. Willamette Mission is an Oregon State Park, so that restriction doesn't apply to you. The park manager call (503-393-1172) is still the place to get this confirmed in writing for your specific event. That one call covers everything — wine, coolers, and your dad's whiskey.https://www.oregon.gov/olcc/lic/pages/special-event-licensing.aspx\n\nFind out if we Need an OLCC-certified server to pour wine. Elsie and Fen CANNOT serve (confirmed). Options: hire a licensed server, or ask a guest who is OLCC certified. Park requires: 1-2 licensed servers separate from the sober monitor. Fruit wine only, no hard alcohol.",
      "priority": "critical",
      "status": "done",
      "quadrant": "q1",
      "deadline": "2026-05-01",
      "persona": "organizer",
      "assignee": "Hannah, Stan",
      "location": "Willamette Mission State Park",
      "contacts": "Elsie",
      "tags": [
        "alcohol",
        "legal",
        "critical"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [
        {
          "text": "A liquor license is NOT needed at special events where alcohol is available but there is no payment or purchase required and no donations of money are accepted for alcohol, entry, or admission. The explicit example given is a wedding reception where you make alcohol available but don't require payment or accept donations. es — the OLCC exemption applies to all alcohol types (wine, beer, spirits) equally. The exemption is triggered by the payment/donation condition, not by what kind of alcohol is being served. Free hard liquor at a private wedding = same legal standing as free wine. The only wrinkle worth flagging: some city park rules restrict alcohol content to 14% or less for private events Salem — but that's a City of Salem parks rule, not Oregon State Parks. Willamette Mission is an Oregon State Park, so that restriction doesn't apply to you. The park manager call (503-393-1172) is still the place to get this confirmed in writing for your specific event. That one call covers everything — wine, coolers, and your dad's whiskey.https://www.oregon.gov/olcc/lic/pages/special-event-licensing.aspx",
          "time": "2026-04-15T14:40:53.607Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:46:44.939Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T14:41:23.352Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T14:44:51.508Z"
        },
        {
          "action": "Status → Done",
          "time": "2026-04-15T14:44:55.344Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:46:44.939Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t57",
      "taskId": "B42",
      "workstream": "b",
      "title": "Port-a-Potty + Toilets",
      "desc": "Park requires: 2 chemical toilets per 100 participants (at least 1 ADA). Vendor not yet contacted. Delivery/pickup approximately same as rental times (8:30am/8:30pm). Get quotes and book ASAP.",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q1",
      "deadline": "2026-04-30",
      "persona": "organizer",
      "assignee": "Hannah",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "logistics",
        "venue",
        "critical"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [
        {
          "text": "Research vendors",
          "done": false
        },
        {
          "text": "Discuss options (ada/luxury/basics/trailer)",
          "done": false
        },
        {
          "text": "Get quotes+ logistics info",
          "done": false
        },
        {
          "text": "Check it out",
          "done": false
        },
        {
          "text": "Choose best option",
          "done": false
        },
        {
          "text": "Get Luke to scope out/report/photograph existing toilets",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-22T05:46:46.618Z",
      "history": [
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:15.353Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:22:45.131Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-22T05:46:46.618Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t58",
      "taskId": "B43",
      "workstream": "b",
      "title": "Reimburse Elsie — $545 (Rental Deposit)",
      "desc": "Hannah owes Elsie $545 reimbursement for A to Z Party Rental deposit (Order #589401). Pay as soon as possible.",
      "priority": "high",
      "status": "done",
      "quadrant": "q1",
      "deadline": "2026-04-20",
      "persona": "organizer",
      "assignee": "Hannah",
      "location": "",
      "contacts": "Elsie",
      "tags": [
        "finance",
        "reimbursement"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T15:23:12.975Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:23:12.975Z",
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t59",
      "taskId": "B44",
      "workstream": "b",
      "title": "Park Open Questions — Await + Follow Up",
      "desc": "Three questions sent to park, awaiting response: (1) Max amperage/current on shelter electrical (critical for 6-speaker PA). (2) Helium balloons at park entrance/Shelter A loop/overflow lot — approval needed. (3) Smoking rules: cars on park grounds. If no reply by Apr 21, follow up with OPRD (503-393-1172 opt 5).",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "2026-04-21",
      "persona": "organizer",
      "assignee": "Hannah",
      "location": "Willamette Mission State Park",
      "contacts": "",
      "tags": [
        "park",
        "logistics"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [
        {
          "text": "Max amperage/current on shelter electrical (critical for 6-speaker PA) — AWAITING PARK REPLY",
          "done": false
        },
        {
          "text": "Helium balloons at park entrance/Shelter A loop/overflow lot — NOT APPROVED by park",
          "done": true
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-15T15:42:37.587Z",
      "history": [
        {
          "action": "Status → Done",
          "time": "2026-04-15T14:36:52.419Z"
        },
        {
          "action": "Status → Not Started",
          "time": "2026-04-15T15:08:23.099Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:08:30.682Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:42:37.587Z"
        }
      ],
      "created": "2026-04-15T14:36:34.770Z"
    },
    {
      "id": "t1776265716814",
      "taskId": "",
      "workstream": "b",
      "title": "Dance Calling (Lori)",
      "desc": "Discuss dances with Lori! And the music too!",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [
        {
          "text": "Which dances?",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:41:53.015Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:08:36.814Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:09:32.593Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:41:11.105Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-15T15:44:43.524Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-17T06:41:53.015Z",
          "by": "Hannah & Stan"
        }
      ],
      "created": "2026-04-15T15:08:36.814Z"
    },
    {
      "id": "t1776266767998",
      "taskId": "",
      "workstream": "b",
      "title": "Ronnie",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:07.998Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:26:07.998Z"
    },
    {
      "id": "t1776266772701",
      "taskId": "",
      "workstream": "b",
      "title": "Peter",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:12.701Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:26:12.701Z"
    },
    {
      "id": "t1776266776099",
      "taskId": "",
      "workstream": "b",
      "title": "Aarti",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:16.099Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:26:16.099Z"
    },
    {
      "id": "t1776266781521",
      "taskId": "",
      "workstream": "b",
      "title": "Tanvee & Aung",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:21.521Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:26:21.521Z"
    },
    {
      "id": "t1776266791952",
      "taskId": "",
      "workstream": "b",
      "title": "Deyvaansh",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:31.952Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:26:31.952Z"
    },
    {
      "id": "t1776266798656",
      "taskId": "",
      "workstream": "b",
      "title": "Abhinav",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:38.656Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:26:38.656Z"
    },
    {
      "id": "t1776266808759",
      "taskId": "",
      "workstream": "b",
      "title": "Urmi",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:48.759Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:26:48.759Z"
    },
    {
      "id": "t1776266816949",
      "taskId": "",
      "workstream": "b",
      "title": "Rumi Didi",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:26:56.949Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:26:56.949Z"
    },
    {
      "id": "t1776266849057",
      "taskId": "",
      "workstream": "b",
      "title": "Babu Mamu & Deepa Aunty",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [
        "master-only",
        "rolodex",
        "guests"
      ],
      "blockedBy": "",
      "group": "Stan's Rolodex",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-15T15:27:29.057Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "created": "2026-04-15T15:27:29.057Z"
    },
    {
      "id": "t1776408087391",
      "taskId": "",
      "workstream": "b",
      "title": "Mehak- Shuba's friend modeling site in CAD.",
      "desc": "",
      "priority": "medium",
      "status": "blocked",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-17T06:41:27.391Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Status → Blocked",
          "time": "2026-04-17T06:44:56.428Z",
          "by": "Hannah & Stan"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:44:56.428Z",
      "created": "2026-04-17T06:41:27.391Z"
    },
    {
      "id": "t1776408719000",
      "taskId": "",
      "workstream": "b",
      "title": "Potluck dish coordination - assigned to Bonnie",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Catering",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-17T06:51:59.000Z",
          "by": "Hannah & Stan"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-17T06:51:59.000Z",
      "created": "2026-04-17T06:51:59.000Z"
    },
    {
      "id": "t1776583215707",
      "taskId": "",
      "workstream": "b",
      "title": "Take Stan's measurements for tailor",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-19T07:20:15.707Z",
          "by": "Hannah & Stan"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T07:20:15.707Z",
      "created": "2026-04-19T07:20:15.707Z"
    },
    {
      "id": "t1776632527039",
      "taskId": "",
      "workstream": "b",
      "title": "Assign persons in charge where unassigned",
      "desc": "",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-19T21:02:07.039Z",
          "by": "Hannah & Stan"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-19T21:02:07.039Z",
      "created": "2026-04-19T21:02:07.039Z"
    },
    {
      "id": "t1776975668715",
      "taskId": "D13",
      "workstream": "b",
      "title": "Coordinate Grace & Thomas (Photographers)",
      "desc": "Both photographers have ideas. They need to be diffed and coordinated and Integrated.",
      "priority": "high",
      "status": "in-progress",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [
        {
          "text": "Task to Grace and formalize her ideas.",
          "done": false
        }
      ],
      "comments": [
        {
          "ts": "2026-04-24T07:38:43.094Z",
          "by": "Hannah & Stan",
          "text": "Grace contracted + $625 retainer paid 2026-04-23. Grace has reached out to Daniel Thomas directly per her 2026-04-23 Zoom. Next: 3-way Zoom (M17). Assigned taskId D13 during batch C.3 per every-task-gets-an-id rule."
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-23T20:21:08.715Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T20:25:01.058Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-23T20:32:47.210Z",
          "by": "Hannah & Stan"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-23T20:21:08.715Z"
    },
    {
      "id": "t1777015988265",
      "taskId": "D12",
      "workstream": "d",
      "title": "Coordinate with Lucas (Cassie's BF) — day-of setup helper + Colleen's tent",
      "desc": "Cassie's boyfriend. Roles per F:\\Wedding Website\\Tasks+needs.docx.md: initial setup (Elsie/Fen/Cassie/Lucas) + bringing Cassie's blue tent for Colleen day-of (Cassie+Lucas). Loop into Cassie's calls so he knows what he's signed up for.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "family",
      "assignee": "Stan",
      "location": "",
      "contacts": "Lucas",
      "tags": [
        "coordination",
        "day-of",
        "family",
        "social"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:33:08.242Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:33:08.242Z"
        }
      ],
      "created": "2026-04-24T07:33:08.242Z"
    },
    {
      "id": "t1777016122376",
      "taskId": "D1",
      "workstream": "a",
      "title": "Assign PICs for all unfilled roles",
      "desc": "Current schedule has several events with no PIC (greeter/usher, kids' area, dance area, first aid, board games, historical reenactment, babysitting rotation, decorations table PIC, program creation, guest travel coordination confirmation, welcome-speech/blessing giver, speeches/toasts order). Work through each, pick a candidate, call them, confirm, and document expectations. Jenny can assist in assigning. BOUNDARY: Bonnie and Sarah's scope must stay moderated — smaller responsibilities, less frequent touchpoints, simpler handoffs.",
      "priority": "critical",
      "status": "in-progress",
      "quadrant": "q1",
      "deadline": "2026-05-10",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "Jenny, Bonnie, Sarah Reese",
      "tags": [
        "pic",
        "critical-path"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [
        {
          "id": "s_pic_1",
          "title": "Call with Zita (MoH) — confirm role + final prep-day scope",
          "done": false
        },
        {
          "id": "s_pic_2",
          "title": "Call with Cassie — confirm bridesmaid role + printed schedule distribution duty",
          "done": false
        },
        {
          "id": "s_pic_3",
          "title": "Call with Christa — confirm arch sourcing, hotel booking, guest travel coord",
          "done": false
        },
        {
          "id": "s_pic_4",
          "title": "Call with Shuba — confirm risers + playlist owner (vs Stan)",
          "done": false
        },
        {
          "id": "s_pic_5",
          "title": "Call with Bonnie — explicitly negotiate MODERATED scope (smaller, less frequent)",
          "done": false
        },
        {
          "id": "s_pic_6",
          "title": "Call with Sarah Reese — explicitly negotiate MODERATED scope (flowers only, pre-assembled 1-2 days out)",
          "done": false
        },
        {
          "id": "s_pic_7",
          "title": "Find + confirm greeter/usher PIC (separate from parking attendant)",
          "done": false
        },
        {
          "id": "s_pic_8",
          "title": "Find + confirm kids'-area / babysitting-rotation PIC",
          "done": false
        },
        {
          "id": "s_pic_9",
          "title": "Find + confirm decorations-table-dressing PIC (se-025)",
          "done": false
        },
        {
          "id": "s_pic_10",
          "title": "Find + confirm first-aid-station PIC (family members in medicine?)",
          "done": false
        },
        {
          "id": "s_pic_11",
          "title": "Find + confirm welcome-speech/blessing giver + speech order",
          "done": false
        },
        {
          "id": "s_pic_12",
          "title": "Find + confirm parking attendant (docx leaves blank; Master Doc says Luke but Luke is also doing wine)",
          "done": false
        },
        {
          "id": "s_pic_13",
          "title": "Find + confirm runner role (errand/driving between places)",
          "done": false
        },
        {
          "id": "s_pic_14",
          "title": "Loop Jenny in on all PIC assignments so she can support each one on the day",
          "done": false
        }
      ],
      "comments": [
        {
          "text": "Priority for this week: individual calls with each bridesmaid. Candidates → contact → confirmation → make sure each understands their role at each step.",
          "time": "2026-04-19T00:00:00.000Z"
        }
      ],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122377",
      "taskId": "D2",
      "workstream": "a",
      "title": "Integrate Hannah's handwritten checklist into the planner",
      "desc": "Hannah has a physical checklist she's been maintaining. She needs the current items migrated into the planner/tasks system so she can tick them off as she completes them. Flow: (1) have Hannah photograph/read out her current checklist, (2) create matching tasks in the planner (Wedding Week, Wedding Day, Procurement groups as fit), (3) mark any already-done items as done with date.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-25",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "Hannah",
      "tags": [
        "hannah-input"
      ],
      "blockedBy": "Hannah to share current checklist contents",
      "group": "Wedding Week",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122378",
      "taskId": "D3",
      "workstream": "a",
      "title": "Cassie: print + distribute per-person schedules to every PIC and guest",
      "desc": "Cassie owns ensuring that every PIC and every guest receives their personal printed-out tasked schedule for the day. Use the planner's Schedule tab → 🖨 Per-Person print button (already built) to generate one PDF per person, then print + label + hand out at the pre-wedding meet & greet. Guest programs are a separate print run (handled under the program-creation task).",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-06-06",
      "persona": "",
      "assignee": "Cassie",
      "location": "",
      "contacts": "Cassie",
      "tags": [
        "print",
        "day-of"
      ],
      "blockedBy": "All PICs finalized (D1); per-person schedule populated",
      "group": "Wedding Week",
      "subtasks": [
        {
          "id": "s_cas_1",
          "title": "Wait until PIC assignments are locked (D1)",
          "done": false
        },
        {
          "id": "s_cas_2",
          "title": "Run the planner's Per-Person print → 'all' option",
          "done": false
        },
        {
          "id": "s_cas_3",
          "title": "Check each sheet for completeness (items, PIC/helpers, notes)",
          "done": false
        },
        {
          "id": "s_cas_4",
          "title": "Print with cover sheet labeled by name",
          "done": false
        },
        {
          "id": "s_cas_5",
          "title": "Hand out at pre-wedding meet & greet OR mail to those not attending",
          "done": false
        },
        {
          "id": "s_cas_coord_schedules",
          "text": "Print coordinator per-person schedules (absorbed from D10)",
          "done": false
        }
      ],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122379",
      "taskId": "D4",
      "workstream": "b",
      "title": "Stan: get ring finger sized in Fremont this Monday",
      "desc": "Stan to visit a Fremont jeweler this Monday (2026-04-20) to get his ring finger professionally sized so the wedding band can be ordered with the correct size. Walk-ins are common; most jewelers size for free.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "Fremont",
      "contacts": "",
      "tags": [
        "ring",
        "day-of-attire"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [],
      "comments": [
        {
          "ts": "2026-04-24T07:35:22.372Z",
          "by": "Hannah & Stan",
          "text": "Original deadline 2026-04-20 per 2026-04-19 authoring. Reset to ASAP per 2026-04-23 recency-wins."
        }
      ],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122380",
      "taskId": "D5",
      "workstream": "a",
      "title": "Extend Rivendell Garden theme to the whole wedding website",
      "desc": "Rivendell Garden (currently applied only to the planner at /planner) is the direction for the ENTIRE hanstan.wedding site. Iterate on it until it can carry index.html (save-the-date), /faq, /registry, /admin. Theme doc: F:\\.skills\\visualDesign_Rivendell.html (bumped to v1.1 on 2026-04-16). Work will involve: extracting tokens from styles.css → theme.tokens.json and aligning with Rivendell, rewriting per-page layouts, and walking the whole site through it with the visual editor (ve-loader.js / ve-save.mjs).",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "theme",
        "rivendell",
        "sitewide"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [
        {
          "id": "s_riv_1",
          "title": "Iterate Rivendell design doc until confident it can hold all pages",
          "done": false
        },
        {
          "id": "s_riv_2",
          "title": "Align data/theme.tokens.json with Rivendell tokens",
          "done": false
        },
        {
          "id": "s_riv_3",
          "title": "Apply to index.html (save-the-date)",
          "done": false
        },
        {
          "id": "s_riv_4",
          "title": "Apply to /faq",
          "done": false
        },
        {
          "id": "s_riv_5",
          "title": "Apply to /registry",
          "done": false
        },
        {
          "id": "s_riv_6",
          "title": "Apply to /admin",
          "done": false
        }
      ],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122381",
      "taskId": "D6",
      "workstream": "a",
      "title": "Upgrade broadcast email from mailto: to Zoho Mail API",
      "desc": "Current People-tab broadcast uses a mailto: URL (opens user's default mail app with BCC recipients pre-filled). Upgrade to: Netlify function (broadcast-email.mjs) that authenticates to Zoho Mail OAuth + sends directly from hello@hanstan.wedding, logs each send to an audit store, and supports templated HTML (not just plaintext). Currently the planner composes the list but relies on the user's client to send. Reference: Zoho Mail REST API + Netlify Functions.",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "email",
        "zoho",
        "api"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [
        {
          "ts": "2026-04-24T07:35:22.372Z",
          "by": "Hannah & Stan",
          "text": "Absorbed as subtask of M1 (created in batch C.3). D6 = API integration specifically; M1 = full infrastructure (template + API + 2-way wiring)."
        }
      ],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122382",
      "taskId": "D7",
      "workstream": "b",
      "title": "Playlist owner conflict: Master Doc says Stan, Tasks+Needs says Shuba — resolve",
      "desc": "Master Doc ('Stan to make wedding music playlist') contradicts the day-of tasks list ('Playlist — Shuba'). Existing B13 task in this planner already assigns playlist to Stan. Decide: does Shuba own it (per Tasks+needs.docx.md), does Stan, or is it shared (Stan = 15-minute processional; Shuba = reception mix)?",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-01",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "Shuba",
      "tags": [
        "playlist",
        "conflict"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122383",
      "taskId": "D8",
      "workstream": "b",
      "title": "Decide: generator needed at Shelter A?",
      "desc": "Shelter A has only 1 electric outlet. Between the sound system (8 plugins), food warmers, and any other draw, we may exceed capacity. Decide whether to rent a small generator. Schedule has an open question (sq-18) flagging this.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-15",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "Daniel Barksdale, Mike",
      "tags": [
        "procurement",
        "venue"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122384",
      "taskId": "D9",
      "workstream": "b",
      "title": "Decide: additional food warmers beyond Carol's 6?",
      "desc": "Carol is bringing 6 food warmers. Between American meat, Indian meat + rice, and potluck dishes, we may need more warming capacity. Coordinate with Bonnie on projected dish count. Propane warming oven rental is also in question (sq-11).",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-15",
      "persona": "",
      "assignee": "Stan, Bonnie",
      "location": "",
      "contacts": "Bonnie, Carol Edel, Rita",
      "tags": [
        "procurement",
        "food"
      ],
      "blockedBy": "",
      "group": "Catering",
      "subtasks": [],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122385",
      "taskId": "D10",
      "workstream": "a",
      "title": "Create + print guest programs",
      "desc": "Guest programs (placed on every other chair with a magnet-favor holding them down) need to be designed + printed. Separately, coordinator schedules are handled by the Per-Person print button in the planner but need to be physically printed too. Master Doc owner: Cassie (tentative).",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-06-01",
      "persona": "",
      "assignee": "Cassie",
      "location": "",
      "contacts": "Cassie, Hannah",
      "tags": [
        "print",
        "ceremony"
      ],
      "blockedBy": "Ceremony order finalized",
      "group": "Wedding Week",
      "subtasks": [
        {
          "id": "s_prog_1",
          "title": "Lock ceremony order (processional, vows, kiss, tunnel)",
          "done": false
        },
        {
          "id": "s_prog_2",
          "title": "Design guest program (single-fold card, tokens + names)",
          "done": false
        },
        {
          "id": "s_prog_3",
          "title": "Print ~80 (enough for every other chair × 150 guests)",
          "done": false
        }
      ],
      "comments": [],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016122386",
      "taskId": "D11",
      "workstream": "a",
      "title": "Resolve planner ↔ schedule conflicts (audit 2026-04-19)",
      "desc": "Audit surfaced a set of disagreements between the tasks list, the contacts list, and the day-of schedule. Work through each and pick the truth. Where tasks and schedule collide, schedule is the default winner (newer, seed-version-bumped) — but some of these are factual issues where the older task entry actually has the right number.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-30",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "Hannah",
      "tags": [
        "conflict-audit"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [
        {
          "id": "s_con_1",
          "title": "Canopy count: B5 says 8, schedule says 4. Order #589401 is authoritative — fix whichever is wrong.",
          "done": false
        },
        {
          "id": "s_con_2",
          "title": "Chair count: B5 says 144, schedule says 150. Reconcile.",
          "done": false
        },
        {
          "id": "s_con_3",
          "title": "Mike's protein: B6 says 'chicken/fish', schedule se-019 says 'salmon + beef'. Confirm with Mike.",
          "done": false
        },
        {
          "id": "s_con_4",
          "title": "Playlist owner: B13=Stan, D7=Shuba-vs-Stan, contacts p22 says Shuba. Decide per D7.",
          "done": false
        },
        {
          "id": "s_con_5",
          "title": "MC: schedule has Thomas on ALL MC events; contacts list a 2nd co-MC (Stan's Best Friend for Indian guests). Add co-MC to the right events or retire the second slot.",
          "done": false
        },
        {
          "id": "s_con_6",
          "title": "Arch sourcing: Christa sources (contacts p23), Sarah places (schedule se-020). Not a conflict if split — confirm with both. Also resolve sq-21 (arch x1 or x2).",
          "done": false
        },
        {
          "id": "s_con_7",
          "title": "B7 (smoker shuttle) marked DONE but sq-13 is still OPEN asking for destination. Re-open or resolve sq-13.",
          "done": false
        },
        {
          "id": "s_con_8",
          "title": "B36 processional: says undecided; schedule se-055 has specific order + people. Approve schedule version OR edit it.",
          "done": false
        },
        {
          "id": "s_con_9",
          "title": "Lori Tauscher sound: B33 says separate from PA (no rental); sq-16 still open on $700 rental. Close one or the other.",
          "done": false
        },
        {
          "id": "s_con_10",
          "title": "Luke triple-booked: wine (se-026) + parking (se-050) + wine teardown (se-112). Offload parking to greeter/other PIC (D1 s_pic_12).",
          "done": false
        },
        {
          "id": "s_con_11",
          "title": "Dedupe contact p50 (Zita Flores) into p5 (Zita) — delete p50 after copying the address into p5's notes.",
          "done": false
        },
        {
          "id": "s_con_12",
          "title": "Overdue deadlines sweep: B27 (groomsmen attire 4/15), B8 (Stan family outreach 4/1), B14 (wedding channel 4/1), B3 (visa 3/25), B4 (Zubey tickets 4/1). Either update deadlines or close as moot.",
          "done": false
        }
      ],
      "comments": [
        {
          "ts": "2026-04-24T07:35:22.372Z",
          "by": "Hannah & Stan",
          "text": "Conflict resolution is draft-liquid per 2026-04-23 supremacy rule. True resolution happens in Stage 4 task-audit stage. D11 captures the conflicts; resolution is Stage 4."
        }
      ],
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:35:22.372Z"
        }
      ],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:35:22.372Z",
      "created": "2026-04-24T07:35:22.372Z"
    },
    {
      "id": "t1777016323096",
      "taskId": "M1",
      "workstream": "m",
      "title": "Wedding communications infrastructure via Zoho",
      "desc": "Per 2026-04-23 infodump. Parent task for Zoho-based communication infrastructure. Includes D6 API upgrade (absorbed as subtask M1.2), template draft, and 2-way wiring. Final wiring lands in Stage 4 per parking-lot.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-15",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "communication",
        "zoho",
        "infrastructure"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [
        {
          "id": "s_m1_1",
          "text": "Draft Zoho email template",
          "done": false
        },
        {
          "id": "s_m1_2",
          "text": "D6: Upgrade broadcast email from mailto: to Zoho Mail API (absorbed)",
          "done": false
        },
        {
          "id": "s_m1_3",
          "text": "Wire Zoho ↔ planner message board (2-way if possible)",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323097",
      "taskId": "M2",
      "workstream": "m",
      "title": "Call bridesmaids (Zita, Cassie, others TBD) in sequence — intro planner + give tokens + discuss roles",
      "desc": "Per 2026-04-23 infodump. Call order: Bridesmaids first. Gated on mobile-safety UX to avoid accidental field edits.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-30",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "coordination",
        "phone",
        "communication"
      ],
      "blockedBy": "Quick Edits + Edit Mode UX (mobile-safety gate, parking-lot Stage 2)",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323098",
      "taskId": "M3",
      "workstream": "m",
      "title": "Call Sarah Reese — intro planner + give token + discuss MODERATED flowers-only scope",
      "desc": "Scope explicitly moderated: flowers only, pre-assembled 1–2 days out. Don't expand. Per 2026-04-23 infodump + scope-moderation note on se-045. Constraint: tooltip work in parking-lot Stage 1/2.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-30",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "coordination",
        "phone",
        "flowers",
        "constraint-moderated"
      ],
      "blockedBy": "Quick Edits + Edit Mode UX",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323099",
      "taskId": "M4",
      "workstream": "m",
      "title": "Call Bonnie — intro planner + give token + discuss MODERATED potluck scope",
      "desc": "Scope moderated. Elsie + Fen absorb overflow. Per 2026-04-23 infodump + scope-moderation notes on se-029/073/081/084.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-30",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "coordination",
        "phone",
        "catering",
        "constraint-moderated"
      ],
      "blockedBy": "Quick Edits + Edit Mode UX",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323100",
      "taskId": "M5",
      "workstream": "m",
      "title": "Call Merry Shipman + Roger Shipman (Hannah's parents) — they are getting worried",
      "desc": "Hannah's parents explicitly flagged as worried. Prioritize ahead of Bridesmaids in call chain if possible.",
      "priority": "critical",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-27",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "family",
        "phone",
        "communication"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323101",
      "taskId": "M6",
      "workstream": "m",
      "title": "Rally the groomsmen. Now.",
      "desc": "Per 2026-04-23 infodump, direct quote.",
      "priority": "critical",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-27",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "family",
        "phone",
        "communication"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323102",
      "taskId": "M7",
      "workstream": "m",
      "title": "Update received RSVPs in People tab with full RSVP content; restrict guest contact details to master-token users",
      "desc": "Master-token-gated. Enforcement gated on parking-lot Stage 2 token-gated visibility.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-10",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "rsvp",
        "security",
        "privacy"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323103",
      "taskId": "M8",
      "workstream": "m",
      "title": "Amazon-capable gift list for Christa + rewire registry gift-card links to Amazon",
      "desc": "Per 2026-04-23 infodump. Christa builds Amazon list; rewire existing gift-card links to route to Amazon.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-15",
      "persona": "",
      "assignee": "Christa",
      "location": "",
      "contacts": "",
      "tags": [
        "registry",
        "amazon",
        "procurement"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323104",
      "taskId": "M9",
      "workstream": "m",
      "title": "Reply to Wes Walls",
      "desc": "Per 2026-04-23 infodump. Blocked on M10.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-01",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "officiant",
        "communication",
        "counseling",
        "master-only"
      ],
      "blockedBy": "M10 — Plan independent counseling",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323105",
      "taskId": "M10",
      "workstream": "m",
      "title": "Plan independent wedding-counseling + Bible discussion with Hannah (post-Wes); present plan to Hannah",
      "desc": "Unblocks M9. Per 2026-04-23 infodump.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-04-30",
      "persona": "",
      "assignee": "Stan, Hannah",
      "location": "",
      "contacts": "",
      "tags": [
        "counseling",
        "covenant",
        "master-only"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323106",
      "taskId": "M11",
      "workstream": "m",
      "title": "Find new officiant (Wes Walls dropped out)",
      "desc": "Per 2026-04-23 infodump. Ceremony requires officiant. Critical path.",
      "priority": "critical",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-10",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "officiant",
        "critical",
        "ceremony",
        "master-only"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323107",
      "taskId": "M15",
      "workstream": "m",
      "title": "Decide: extend Grace deVries to 8 hours (12:30–8:30) for $200 additional — covers golden hour + RAW delivery",
      "desc": "Grace offered bulk rate during 2026-04-23 Zoom: 1 extra hour = $200 normal, 2 extra hours = $100/hr ($200 total). Includes RAW photo delivery. Stan needs Hannah confirmation. This task IS the planner-side home for the B-DEC-1 decision.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-27",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "photography",
        "grace",
        "coordination",
        "decision"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323108",
      "taskId": "M16",
      "workstream": "m",
      "title": "Draft family photo request list + sequence; send to Grace AND Daniel Thomas",
      "desc": "Grace requested on 2026-04-23 call. Sequence per Grace's rule: both families together, each family with both Stan+Hannah (NO family-with-only-one variants), Hannah with her parents/siblings, Stan with his parents/siblings. Stan's father will push for many combinations — pre-filter before sending.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-15",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "photography",
        "family"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323109",
      "taskId": "M17",
      "workstream": "m",
      "title": "Schedule Grace deVries + Daniel Thomas 3-way Zoom to formalize coverage split",
      "desc": "Per Grace's 2026-04-23 call. Grace wants 1:1 with Daniel Thomas first; then all three meet. Outcomes: who covers 12:30–2:00 (Daniel only), 2:00–4:30 (both), 4:30+ (Grace only if extension approved). Include RAW delivery expectations.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-15",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "photography",
        "coordination",
        "meeting"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323110",
      "taskId": "M18",
      "workstream": "m",
      "title": "Pre-stage Grace's detail items (rings, shoes, flowers, invitation, Bible) in one spot/box before 1:30 PM day-of",
      "desc": "Grace requested on 2026-04-23 call. Makes detail photography efficient. Hand to Cassie day-of as part of bridal-party-prep package.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-06-07",
      "persona": "",
      "assignee": "Hannah, Cassie",
      "location": "",
      "contacts": "",
      "tags": [
        "photography",
        "day-of",
        "prep"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323111",
      "taskId": "M19",
      "workstream": "m",
      "title": "Send Grace deVries the art-reference pics Stan promised her in the first call",
      "desc": "Stan committed in the earlier (1st) Grace Zoom call. Outstanding per 2026-04-23 infodump. Reference to that earlier call: only a video recording exists (no transcript was generated at the time; see retired M20).",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-04-27",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "photography",
        "grace",
        "outstanding"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323112",
      "taskId": "M21",
      "workstream": "m",
      "title": "Create group chat with Grace deVries + Daniel Thomas; formally introduce; ask if they've already spoken",
      "desc": "Per 2026-04-23 infodump. Note: Grace already reached out to Daniel Thomas per her 2026-04-23 Zoom, so intro may already be partly done. Mention they can either chat in the group directly or update Stan+Hannah after calling each other.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-27",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "photography",
        "coordination",
        "communication"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323113",
      "taskId": "M23",
      "workstream": "m",
      "title": "Formalize + confirm full schedule before 2026-05-07; ensure everyone knows everything being done",
      "desc": "Per 2026-04-23 infodump. Hard deadline. Gates schedule-solidification and coordinator-token distribution for bridesmaids+Sarah+Bonnie+Merry+Roger. This is the task referenced when other tasks mention 'schedule is draft-liquid until 2026-05-07'.",
      "priority": "critical",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-07",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "schedule",
        "coordination",
        "critical",
        "gate"
      ],
      "blockedBy": "",
      "group": "Wedding Week",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323114",
      "taskId": "M24",
      "workstream": "m",
      "title": "Find a nice spot for document signing at Willamette Mission State Park; schedule signing right before cake cutting",
      "desc": "Per 2026-04-23 infodump. Grace's 2026-04-23 call confirmed signing-then-cake-cutting flow: ceremony ends → sign marriage certificate → cake cutting immediately → family photos during dinner service.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-20",
      "persona": "",
      "assignee": "Hannah, Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "venue",
        "ceremony",
        "day-of"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323115",
      "taskId": "M25",
      "workstream": "m",
      "title": "Research why cake cutting is traditionally late in Christian weddings; inform decision to do it early",
      "desc": "Per 2026-04-23 infodump. Stan wants cake cutting immediately post-ceremony (pre-dinner). Grace confirmed she's never done it that way before. Research whether there's a reason to not deviate from tradition.",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-15",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "ceremony",
        "research"
      ],
      "blockedBy": "",
      "group": "Venue",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323116",
      "taskId": "M26",
      "workstream": "m",
      "title": "Prep + send Hannah's package",
      "desc": "Per 2026-04-23 infodump. Master-token-only visibility (HanStan Logistics is sensitive).",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-04-30",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "logistics",
        "hanstan",
        "master-only"
      ],
      "blockedBy": "",
      "group": "HanStan Logistics",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323117",
      "taskId": "M27",
      "workstream": "m",
      "title": "Figure out what's going on with First Tech",
      "desc": "Per 2026-04-23 infodump, direct quote.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-01",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "logistics",
        "finance",
        "hanstan",
        "master-only"
      ],
      "blockedBy": "",
      "group": "HanStan Logistics",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323118",
      "taskId": "M28",
      "workstream": "m",
      "title": "Evaluate whether HanStan Logistics should spin off as its own planning project; share prior claudeAI discussion with claudeCode",
      "desc": "Per 2026-04-23 infodump. Possible approach: hijack the wedding planner engine for HanStan Logistics. Discuss with claudeCode.",
      "priority": "low",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "planning",
        "meta",
        "hanstan",
        "master-only"
      ],
      "blockedBy": "",
      "group": "HanStan Logistics",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323119",
      "taskId": "M29",
      "workstream": "m",
      "title": "Stan's tux: get Stan's measurements, send to Mom + Dad so they can get the suit made",
      "desc": "Per 2026-04-23 infodump.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-05",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "attire",
        "groom",
        "tailoring"
      ],
      "blockedBy": "",
      "group": "Procurement",
      "subtasks": [
        {
          "id": "s_tux_1",
          "text": "Get Stan measured",
          "done": false
        },
        {
          "id": "s_tux_2",
          "text": "Email measurements to parents",
          "done": false
        },
        {
          "id": "s_tux_3",
          "text": "Hannah updates Dad about Indian-finery-for-ceremony decision",
          "done": false
        }
      ],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323120",
      "taskId": "M30",
      "workstream": "m",
      "title": "Populate People tab with everyone attending the wedding Stan doesn't already know; include basic info + OkCupid-style high-impact intro per person",
      "desc": "Per 2026-04-23 infodump, direct quote: 'I don't want to be strangers with literally anyone who's coming to my wedding.' Fields per person: name, relation (Hannah's side / Stan's side / mutual), contact, short intro (OkCupid-style: tight, high-impact, personality-forward). Visual fun later; basic info + intros first. Master-token-only for contact details per M7.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-15",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "people",
        "coordination",
        "communication",
        "social"
      ],
      "blockedBy": "",
      "group": "Guests",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:42:13.435Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        },
        {
          "action": "Edited",
          "time": "2026-04-24T07:42:13.435Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323121",
      "taskId": "M31",
      "workstream": "m",
      "title": "Stan + Hannah: complete OkCupid questions together (same time, together)",
      "desc": "Per 2026-04-23 infodump. Do it together in the same session, not independently. Relates to M10 (independent counseling continuation).",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-30",
      "persona": "",
      "assignee": "Stan, Hannah",
      "location": "",
      "contacts": "",
      "tags": [
        "couple",
        "relationship",
        "counseling"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323122",
      "taskId": "M32",
      "workstream": "m",
      "title": "Stan + Hannah: do the 36-question quiz (Aron's 36 Questions That Lead to Love) together",
      "desc": "Per 2026-04-23 infodump. Do it together. Companion task to M31.",
      "priority": "medium",
      "status": "not-started",
      "quadrant": "q2",
      "deadline": "2026-05-30",
      "persona": "",
      "assignee": "Stan, Hannah",
      "location": "",
      "contacts": "",
      "tags": [
        "couple",
        "relationship",
        "counseling"
      ],
      "blockedBy": "",
      "group": "All",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323123",
      "taskId": "M33",
      "workstream": "m",
      "title": "Hide HanStan Logistics group from non-master-token users",
      "desc": "Per 2026-04-23 infodump. This is the PLANNER TASK that tracks the Stage 2 code work for HanStan Logistics visibility gating (PL-24). Stage 0 only creates this tracking task + tags the HanStan Logistics tasks with master-only (via M40). The actual visibility enforcement code lands in Stage 2.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-10",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "security",
        "authorization",
        "planner",
        "master-only"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323124",
      "taskId": "M34",
      "workstream": "m",
      "title": "Restrict Wes Walls / officiant info to master-token users only",
      "desc": "Per 2026-04-23 infodump. This is the PLANNER TASK that tracks the Stage 2 code work for officiant-info visibility gating (PL-25). Stage 0 only creates this tracking task + tags the officiant tasks with master-only (via M40). Consolidate enforcement with M7 + M33 in Stage 2 token-gated visibility work.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "2026-05-10",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "security",
        "authorization",
        "officiant",
        "master-only"
      ],
      "blockedBy": "",
      "group": "Website",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016323125",
      "taskId": "M35",
      "workstream": "m",
      "title": "Reach out to Elsie after the entire 2026-04-23 update has been applied to live",
      "desc": "Per 2026-04-23 infodump. Post-update check-in. Also logged as a reminder in F:\\Wedding Website\\hanstan-wedding\\tasQ.md. Deadline triggered by update-complete.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "",
      "tags": [
        "coordination",
        "phone",
        "milestone"
      ],
      "blockedBy": "",
      "group": "Organizers",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:38:43.094Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:38:43.094Z"
        }
      ],
      "created": "2026-04-24T07:38:43.094Z"
    },
    {
      "id": "t1777016405295",
      "taskId": "M37",
      "workstream": "m",
      "title": "Constraint: Elsie + Fen day-of pairing principle (master-token-only)",
      "desc": "Fen's day-of primary role is as Elsie's helper/assistant/caretaker/boyfriend. When Fen is not proactively working, he should be near Elsie. When Elsie is not proactively working, she should be near Fen. All schedule edits that move Elsie or Fen around must be reflected in each other's schedule where the pairing principle applies. Visibility: master-token-only. Enforcement: constraint-tooltip rendering lands in parking-lot Stage 1/2; Schedule-Solidification stage (M23) verifies per-event coverage. Same pattern applies to Bonnie (moderated scope) and Sarah Reese (moderated flowers-only scope) — see M3, M4.",
      "priority": "high",
      "status": "not-started",
      "quadrant": "q1",
      "deadline": "",
      "persona": "",
      "assignee": "Stan",
      "location": "",
      "contacts": "Elsie, Fen",
      "tags": [
        "constraint",
        "elsie",
        "fen",
        "day-of",
        "master-only",
        "pairing-principle"
      ],
      "blockedBy": "",
      "group": "Wedding Day",
      "subtasks": [],
      "comments": [],
      "recurring": "",
      "reminder": "",
      "modified": "2026-04-24T07:40:05.294Z",
      "history": [
        {
          "action": "Created",
          "time": "2026-04-24T07:40:05.294Z"
        }
      ],
      "created": "2026-04-24T07:40:05.294Z"
    }
  ],
  "contacts": [
    {
      "id": "p1",
      "name": "Hannah",
      "role": "bridal",
      "specificRole": "Bride",
      "phone": "",
      "email": "hannah7of9@gmail.com",
      "notes": "Co-planning. Handling park logistics, event insurance, SUP filing, invitations."
    },
    {
      "id": "p2",
      "name": "Stan (Scrybal)",
      "role": "groom",
      "specificRole": "Groom",
      "phone": "",
      "email": "",
      "notes": "Co-planning. Leading food plan, invitation list, website, playlist."
    },
    {
      "id": "p3",
      "name": "Elsie",
      "role": "organizer",
      "specificRole": "General Coordinator + Bridesmaid",
      "phone": "",
      "email": "crankyfood@gmail.com",
      "notes": "Hannah's older sister. Coordinator all along. Making choker+bracelet sets, favor magnets, popsicle stick craft, bottles. Coordinating Luke's wine.",
      "constraints": [
        "Day-of pairing with Fen: when not actively working, should be near Fen."
      ]
    },
    {
      "id": "p4",
      "name": "Thomas",
      "role": "family",
      "specificRole": "Co-MC (Oregonian crowd) + Knight Tournament Anchor",
      "phone": "",
      "email": "",
      "notes": "Hannah's teenage nephew. Roman centurion outfit."
    },
    {
      "id": "p5",
      "name": "Zita",
      "role": "bridal",
      "specificRole": "Maid of Honor",
      "phone": "",
      "email": "",
      "notes": "Researching walled canopies + food prep items."
    },
    {
      "id": "p6",
      "name": "Cassie",
      "role": "bridal",
      "specificRole": "Bridesmaid",
      "phone": "",
      "email": "",
      "notes": "Searching for matching short white jackets for bridesmaids."
    },
    {
      "id": "p7",
      "name": "Grace",
      "role": "service",
      "specificRole": "2nd Photographer (confirmed)",
      "phone": "",
      "email": "",
      "notes": "Declined day-of coordinator role. Confirmed as 2nd photographer at ~$1,800/6hrs."
    },
    {
      "id": "p8",
      "name": "Daniel Thomas",
      "role": "service",
      "specificRole": "Lead Photographer",
      "phone": "206-307-5208",
      "email": "",
      "notes": "Contract SIGNED, deposit PAID. ~$1,500 total. On duty from ~2pm Jun 7. Pre-wedding style call completed Mar 15."
    },
    {
      "id": "p9",
      "name": "Merry",
      "role": "family",
      "specificRole": "Hannah's Mother",
      "phone": "",
      "email": "",
      "notes": "Colleen's primary caregiver. Needs real chair, shade, dignity at venue. Water dispensers from Mom/Dad."
    },
    {
      "id": "p10",
      "name": "Colleen",
      "role": "family",
      "specificRole": "Bridesmaid (by nature)",
      "phone": "",
      "email": "",
      "notes": "Hannah's youngest sister. Bridesmaid protocol: welcome at ceremony, don't redirect. Mobile comfort kit goes to her."
    },
    {
      "id": "p11",
      "name": "Stan's Best Friend",
      "role": "groom",
      "specificRole": "Co-MC (Indian guests)",
      "phone": "",
      "email": "",
      "notes": "Flying from India. Co-MC with invisible domain split."
    },
    {
      "id": "p12",
      "name": "Wes Walls",
      "role": "service",
      "specificRole": "Officiant + Premarital Counselor",
      "phone": "",
      "email": "",
      "notes": "Friend, house church pastor. Short speech + traditional directions. Gave H&S two books to study."
    },
    {
      "id": "p13",
      "name": "Mike",
      "role": "service",
      "specificRole": "Catering — Chicken/Fish",
      "phone": "",
      "email": "",
      "notes": "Making chicken + fish for main dish. Bringing 2-3 folding tables and 2×5-gal water dispensers."
    },
    {
      "id": "p14",
      "name": "Trudy",
      "role": "family",
      "specificRole": "",
      "phone": "",
      "email": "",
      "notes": "Has metal warming pans for keeping food hot."
    },
    {
      "id": "p15",
      "name": "Zubey",
      "role": "guest",
      "specificRole": "Friend",
      "phone": "",
      "email": "",
      "notes": "Stan funding travel. Needs attendance confirmation → ticket purchase."
    },
    {
      "id": "p16",
      "name": "Bonnie",
      "role": "service",
      "specificRole": "Food Coordinator",
      "phone": "",
      "email": "",
      "notes": "Coordinating potluck + food logistics on the day.",
      "constraints": [
        "Scope moderated: keep tasks small, infrequent touchpoints. Elsie + Fen absorb overflow."
      ]
    },
    {
      "id": "p17",
      "name": "Carol Edel",
      "role": "service",
      "specificRole": "Dessert — Sheet Cakes",
      "phone": "",
      "email": "",
      "notes": "Making 2-3 sheet cakes for dessert."
    },
    {
      "id": "p18",
      "name": "Luke",
      "role": "family",
      "specificRole": "Wine Supply",
      "phone": "",
      "email": "",
      "notes": "Bringing wine + coolers/ice. Elsie coordinating."
    },
    {
      "id": "p19",
      "name": "Lori Tauscher",
      "role": "service",
      "specificRole": "Folk Dance Caller",
      "phone": "",
      "email": "",
      "notes": "Calling folk dances + supplying dance tracks ONLY. NOT the PA/sound lead — Daniel Barksdale handles the full PA system."
    },
    {
      "id": "p20",
      "name": "Sarah",
      "role": "family",
      "specificRole": "Flowers + Decor",
      "phone": "",
      "email": "",
      "notes": "Buying flowers (baby's breath etc). Possibly handling aisle runner and arch sourcing.",
      "constraints": [
        "Scope moderated: flowers only, pre-assembled 1-2 days out. Don't expand role."
      ]
    },
    {
      "id": "p21",
      "name": "Shuba's Friend",
      "role": "service",
      "specificRole": "CAD Site Layout",
      "phone": "",
      "email": "",
      "notes": "Modeling wedding site in CAD for decoration/setup planning."
    },
    {
      "id": "p22",
      "name": "Shuba Murthy",
      "role": "bridal",
      "specificRole": "Bridesmaid",
      "phone": "",
      "email": "",
      "notes": "Making the full wedding playlist (all categories). Building 3 wooden risers (3-6\" tall) for couple + pastor."
    },
    {
      "id": "p23",
      "name": "Christa Shipman",
      "role": "bridal",
      "specificRole": "Bridesmaid",
      "phone": "",
      "email": "",
      "notes": "Hannah's sister. Sourcing one of the 2 ceremony arches. Has leftover disposable plates/silverware."
    },
    {
      "id": "p24",
      "name": "Daniel Barksdale",
      "role": "service",
      "specificRole": "Sound/DJ Lead",
      "phone": "",
      "email": "",
      "notes": "Full PA system: 6 speakers (3 main + 3 sub), soundboard + computer + 8 audio plugins. Separate from Lori Tauscher."
    },
    {
      "id": "p25",
      "name": "Jenny",
      "role": "family",
      "specificRole": "Guest Travel Coordinator + Runner",
      "phone": "",
      "email": "",
      "notes": "Likely Jenny Shipman (listed as on-site contact on SUP). Coordinating guest rides + hotels. Ferrying items from mom's house."
    },
    {
      "id": "p26",
      "name": "Josiah",
      "role": "guest",
      "specificRole": "Lost & Found Coordinator (candidate)",
      "phone": "",
      "email": "",
      "notes": "Potential candidate to collect lost items on a centralized table."
    },
    {
      "id": "p27",
      "name": "Lucas",
      "role": "family",
      "specificRole": "Cassie's Partner",
      "phone": "",
      "email": "",
      "notes": "With Cassie: bringing blue tent for Colleen's day-of comfort setup."
    },
    {
      "id": "p28",
      "name": "Fen",
      "role": "friend",
      "specificRole": "Elsie's partner + day-of helper",
      "phone": "",
      "email": "",
      "notes": "Elsie's boyfriend/partner. Listed in schedule-event people[] arrays; promoted to contact record in batch C.3b for constraints metadata.",
      "constraints": [
        "Day-of pairing with Elsie: primary role is Elsie's helper/assistant/caretaker/boyfriend. When not actively working, should be near Elsie."
      ]
    }
  ],
  "groups": [
    "All",
    "Guests",
    "Website",
    "Venue",
    "Wedding Day",
    "Organizers",
    "Stan's Rolodex",
    "Procurement",
    "Wedding Week",
    "HanStan Logistics",
    "Catering"
  ],
  "tags": [
    "accommodation",
    "activities",
    "alcohol",
    "attire",
    "bugfix",
    "canopy",
    "catering",
    "ceremony",
    "colors",
    "communication",
    "consumables",
    "coordination",
    "coordinator",
    "counseling",
    "covenant",
    "crafts",
    "critical",
    "decorations",
    "delegated",
    "deposit",
    "design",
    "documents",
    "family",
    "faq",
    "favors",
    "festival",
    "finance",
    "flowers",
    "food",
    "governance",
    "honeymoon",
    "immediate",
    "invitations",
    "legal",
    "logistics",
    "music",
    "officiant",
    "park",
    "parking",
    "party",
    "phone",
    "photography",
    "planning",
    "playlist",
    "print",
    "procession",
    "reference",
    "registry",
    "reimbursement",
    "roles",
    "schedule",
    "shopping",
    "social",
    "sound",
    "specs",
    "survey",
    "tailoring",
    "teardown",
    "technical",
    "transport",
    "travel",
    "venue",
    "verify",
    "visa",
    "weather",
    "website"
  ],
  "savedViews": [],
  "prefs": {
    "advExpanded": true,
    "onboardSeen": true,
    "schedOnboardSeen": false,
    "scheduleSeeded": true,
    "sortBy": "priority",
    "groupByField": "group",
    "scheduleSeedVersion": 0
  },
  "scheduleEvents": [
    {
      "id": "se-001",
      "title": "Wake up / breakfast",
      "details": "Bride, bridal party, and setup crew leads.",
      "startTime": "05:30",
      "duration": 60,
      "status": "tbd",
      "zone": "off-site",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Cassie",
          "role": "present"
        },
        {
          "name": "Elsie",
          "role": "present"
        },
        {
          "name": "Christa",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-002",
      "title": "Load vehicles — decorations and supplies",
      "details": "Arch, risers, decorations, favors, programs, tablecloths, clothespins, ribbons, balloons, aisle runner, zip ties, gel pens, garbage bags, lawn games, mirrors, first aid supplies.",
      "startTime": "06:30",
      "duration": 30,
      "status": "tentative",
      "zone": "off-site",
      "people": [
        {
          "name": "Elsie",
          "role": "pic"
        },
        {
          "name": "Fen",
          "role": "helper"
        },
        {
          "name": "Lucas",
          "role": "helper"
        },
        {
          "name": "Cassie",
          "role": "helper"
        },
        {
          "name": "Jenny",
          "role": "helper"
        },
        {
          "name": "Sarah",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "arch",
        "risers",
        "decorations",
        "favors",
        "programs",
        "tablecloths",
        "clothespins",
        "ribbons",
        "balloons",
        "aisle runner",
        "zip ties",
        "gel pens",
        "garbage bags",
        "lawn games",
        "mirrors",
        "first aid supplies"
      ],
      "notes": [
        "Where is everything stored? Multiple locations, nail down crews for each location"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-load"
    },
    {
      "id": "se-003",
      "title": "Load vehicles — food & drink",
      "details": "Mike: grill, BBQ, 3 folding tables, 2 water dispensers. Luke: wine, coolers, ice, 15 gal water. Carol: cake, 6 food warmers, 3 black tablecloths. Stan: 2 cases sparkling cider. Rita/Aparna/Aarti: pre-cooked Indian dishes + warming equipment.",
      "startTime": "06:30",
      "duration": 30,
      "status": "tentative",
      "zone": "off-site",
      "people": [
        {
          "name": "Mike",
          "role": "pic"
        },
        {
          "name": "Luke",
          "role": "pic"
        },
        {
          "name": "Carol Edel",
          "role": "pic"
        },
        {
          "name": "Stan",
          "role": "helper"
        },
        {
          "name": "Rita",
          "role": "helper"
        },
        {
          "name": "Aparna",
          "role": "helper"
        },
        {
          "name": "Aarti",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "grill + BBQ",
        "3 folding tables",
        "2 water dispensers",
        "wine",
        "coolers",
        "ice",
        "15 gal water",
        "cake (in cooler)",
        "6 food warmers",
        "3 black tablecloths",
        "2 cases sparkling cider",
        "pre-cooked Indian dishes",
        "warming equipment"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-load"
    },
    {
      "id": "se-004",
      "title": "Load vehicles — sound",
      "details": "6 speakers, soundboard + computer, outlet strips.",
      "startTime": "06:30",
      "duration": 15,
      "status": "tentative",
      "zone": "off-site",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "6 speakers",
        "soundboard + computer",
        "outlet strips"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-load"
    },
    {
      "id": "se-005",
      "title": "Drive to park",
      "details": "Everyone in convoy or staggered.",
      "startTime": "07:00",
      "duration": 30,
      "status": "tbd",
      "zone": "off-site",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Drive time depends on getting-ready location — not yet determined."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-010",
      "title": "Arrive at park, pay parking / day passes",
      "details": "First wave arrives at park gate opening.",
      "startTime": "07:00",
      "duration": 15,
      "status": "tbd",
      "zone": "parking",
      "people": [
        {
          "name": "Jenny",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "day passes"
      ],
      "notes": [
        "How many day passes purchased vs. pay-at-gate?"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-011",
      "title": "Unload all vehicles to staging area",
      "details": "Near Shelter A. Dolly/trolley/cart needed.",
      "startTime": "07:15",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Elsie",
          "role": "pic"
        },
        {
          "name": "Fen",
          "role": "helper"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "dolly/trolley/cart"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-arrive"
    },
    {
      "id": "se-012",
      "title": "Changing tent + mirrors set up",
      "details": "PRIORITY #1 — Hair & makeup can't start until this is up.",
      "startTime": "07:45",
      "duration": 20,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Cassie",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "changing tent",
        "mirrors"
      ],
      "notes": [
        "Must complete before 8 AM for hair/makeup start."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-critpath"
    },
    {
      "id": "se-013",
      "title": "Canopy/tent drop-off received",
      "details": "Rental company drops off 4× canopies. Take photos of how equipment arrives for return.",
      "startTime": "07:45",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Jenny",
          "role": "pic"
        },
        {
          "name": "Elsie",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Photo documentation of delivery condition for damage disputes."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-critpath"
    },
    {
      "id": "se-014",
      "title": "Colleen's blue tent set up",
      "details": "Blankets, entertainment, seating for Merry. Deploys wherever Colleen settles. Kit goes to HER.",
      "startTime": "08:05",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Cassie",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "blue tent",
        "blankets",
        "entertainment items"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-015",
      "title": "Shelter area organized for food prep",
      "details": "Grill/BBQ positioned, folding tables placed, food warmers staged. Shelter has concrete floor, picnic tables, sink, 1 electric outlet.",
      "startTime": "08:20",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Mike",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-016",
      "title": "Hair and makeup begins",
      "details": "In changing tent area. ~3 hours.",
      "startTime": "08:50",
      "duration": 180,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Cassie",
          "role": "present"
        },
        {
          "name": "Christa",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-017",
      "title": "Canopies assembled",
      "details": "4× 10'x15' reception canopies.",
      "startTime": "11:50",
      "duration": 90,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Elsie",
          "role": "pic"
        },
        {
          "name": "Fen",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup8"
    },
    {
      "id": "se-018",
      "title": "Risers/platform built",
      "details": "3 steps for couple + officiant.",
      "startTime": "11:50",
      "duration": 30,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Shuba",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "risers/platform pieces"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup8"
    },
    {
      "id": "se-019",
      "title": "Mike begins grill/BBQ cooking",
      "details": "Salmon chunks + beef. All his own equipment. 3-4 hours.",
      "startTime": "11:50",
      "duration": 240,
      "status": "confirmed",
      "zone": "shelter",
      "people": [
        {
          "name": "Mike",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Mike is self-sufficient. Don't interrupt."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup8"
    },
    {
      "id": "se-020",
      "title": "Arch(es) placed at ceremony site",
      "details": "Under the firs, east of shelter.",
      "startTime": "15:50",
      "duration": 15,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Sarah Reese",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "arch"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup830"
    },
    {
      "id": "se-021",
      "title": "Ceremony chairs set up with center aisle",
      "details": "~150 chairs. Favors (magnet bottles) + programs on every other chair.",
      "startTime": "15:50",
      "duration": 45,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Lucas",
          "role": "helper"
        },
        {
          "name": "Fen",
          "role": "helper"
        }
      ],
      "itemsToBring": [
        "150 chairs",
        "favors",
        "programs"
      ],
      "notes": [
        "Elsie is pic"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup830"
    },
    {
      "id": "se-022",
      "title": "Indian dishes begin warming",
      "details": "Pre-cooked. Using Carol's 6 food warmers.",
      "startTime": "16:35",
      "duration": 180,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Rita",
          "role": "pic"
        },
        {
          "name": "Aparna",
          "role": "helper"
        },
        {
          "name": "Aarti",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Propane warming oven rental?"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup9"
    },
    {
      "id": "se-023",
      "title": "Reception tables placed under canopies",
      "details": "Between shelter and parking loop.",
      "startTime": "16:35",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Fen",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup9"
    },
    {
      "id": "se-024",
      "title": "Sound system setup + test",
      "details": "6 speakers, soundboard, 8 plugins, outlet strips. Test mics.",
      "startTime": "16:35",
      "duration": 60,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup9"
    },
    {
      "id": "se-025",
      "title": "Tables dressed",
      "details": "Tablecloths, clothespins, decorations. Confetti, flowers, vase/candle per table. Head table closest to river.",
      "startTime": "19:35",
      "duration": 30,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [
        "tablecloths",
        "clothespins",
        "decorations",
        "confetti",
        "flowers",
        "vases",
        "candles"
      ],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup930"
    },
    {
      "id": "se-026",
      "title": "Drinks station set up",
      "details": "Separate table for wine (away from main drinks). Water dispensers. Coolers + ice.",
      "startTime": "19:35",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Luke",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup930"
    },
    {
      "id": "se-027",
      "title": "Guest book / gift table set up",
      "details": "Gel pens, sign-in area.",
      "startTime": "20:05",
      "duration": 10,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Cassie",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "guest book",
        "gel pens"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup945"
    },
    {
      "id": "se-028",
      "title": "Lost & found table",
      "details": "Centralized collection point.",
      "startTime": "20:05",
      "duration": 5,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Josiah",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup945"
    },
    {
      "id": "se-029",
      "title": "Potluck items begin arriving",
      "details": "Labels/tags for each dish. Ingredients listed.",
      "startTime": "20:15",
      "duration": 120,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "labels",
        "tags"
      ],
      "notes": [
        "Ongoing — guests drop off throughout morning."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-030",
      "title": "Kids' area marked out",
      "details": "Babysitting pen boundaries, toys. Behind shelter.",
      "startTime": "20:15",
      "duration": 15,
      "status": "tbd",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [
        "toys",
        "boundary markers"
      ],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-031",
      "title": "Dance area marked out",
      "details": "In front of shelter.",
      "startTime": "20:15",
      "duration": 15,
      "status": "tbd",
      "zone": "dance",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-032",
      "title": "First aid station",
      "details": "Table, basic supplies, shade.",
      "startTime": "20:15",
      "duration": 10,
      "status": "tbd",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [
        "first aid supplies",
        "table"
      ],
      "notes": [
        "PIC unassigned. Family members in medicine.",
        "Scrap the full station setup and just bring a FAK to be assigned to Trudy if available/Christa/Elsie"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-033",
      "title": "Lawn games set up",
      "details": "Croquet + others.",
      "startTime": "20:15",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Roger",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "croquet set"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-034",
      "title": "Board game area",
      "details": "Table + chairs + game selection.",
      "startTime": "20:15",
      "duration": 10,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [
        "board games"
      ],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup10"
    },
    {
      "id": "se-035",
      "title": "Knightly tournament zone staged",
      "details": "Rubber swords/shields laid out.",
      "startTime": "22:15",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "rubber swords",
        "shields"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup1015"
    },
    {
      "id": "se-035b",
      "title": "Open stage / performance area marked",
      "details": "Power access, seating nearby.",
      "startTime": "22:15",
      "duration": 10,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup1015"
    },
    {
      "id": "se-036",
      "title": "Parking signage / balloon markers placed",
      "details": "So guests find Shelter A.",
      "startTime": "22:30",
      "duration": 10,
      "status": "tbd",
      "zone": "parking",
      "people": [],
      "itemsToBring": [
        "signs",
        "balloons"
      ],
      "notes": [
        "PIC unassigned — parking attendant."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup1030"
    },
    {
      "id": "se-037",
      "title": "Aisle runner laid",
      "details": "Last thing before ceremony area is 'done.'",
      "startTime": "22:30",
      "duration": 10,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Sarah Reese",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "aisle runner"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-setup1030"
    },
    {
      "id": "se-038",
      "title": "Cake placed in cooler at site",
      "details": "Keep cold until cutting time (~3:30 PM).",
      "startTime": "22:40",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Carol Edel",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-040",
      "title": "Hair and makeup wrapping up",
      "details": "3 hrs started at 8 AM.",
      "startTime": "11:00",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Cassie",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-041",
      "title": "Bridal party lunch: charcuterie board",
      "details": "EVERYONE EATS. This is mandatory.",
      "startTime": "11:30",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Zita",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "charcuterie board"
      ],
      "notes": [
        "Mandatory — do not skip."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-042",
      "title": "Bride gets dressed",
      "details": "In changing tent.",
      "startTime": "12:00",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "helper"
        },
        {
          "name": "Cassie",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-dress"
    },
    {
      "id": "se-043",
      "title": "Groom + groomsmen get ready",
      "details": "",
      "startTime": "12:00",
      "duration": 30,
      "status": "tbd",
      "zone": "shelter",
      "people": [
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Deba",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Where? Second changing canopy or elsewhere?"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-dress"
    },
    {
      "id": "se-044",
      "title": "Detail / getting-ready photos",
      "details": "Rings, shoes, vows, bouquet, jewelry, veil, Bible, invitation/program.",
      "startTime": "12:30",
      "duration": 30,
      "status": "tbd",
      "zone": "shelter",
      "people": [
        {
          "name": "Daniel Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Confirm photographer arrival time — Daniel scheduled for 2 PM but detail photos are 12:30."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-prep1230"
    },
    {
      "id": "se-045",
      "title": "Flowers: final bouquet assembly",
      "details": "Baby's breath, roses/red carnations. Main bouquet for bride. Single flower for each bridesmaid/groomsman.",
      "startTime": "12:30",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Sarah Reese",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "baby's breath",
        "roses",
        "red carnations"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-prep1230"
    },
    {
      "id": "se-046",
      "title": "Touch-ups, bustle, final adjustments",
      "details": "",
      "startTime": "13:00",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-prep1"
    },
    {
      "id": "se-047",
      "title": "Sound system relocated if needed",
      "details": "Confirm position for ceremony (under the firs).",
      "startTime": "13:00",
      "duration": 15,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-prep1"
    },
    {
      "id": "se-048",
      "title": "Walk-through: processional order rehearsed",
      "details": "Bridal party lineup + processional order.",
      "startTime": "13:30",
      "duration": 15,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Wes Walls",
          "role": "pic"
        },
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Deba",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "When does Wes arrive?"
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-050",
      "title": "Guest arrival begins",
      "details": "Count cars without permits. Direct guests to seating. Guests sign guest book, note gifts. $5 parking fee.",
      "startTime": "14:00",
      "duration": 30,
      "status": "tentative",
      "zone": "parking",
      "people": [
        {
          "name": "Luke",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": "pg-arrive2"
    },
    {
      "id": "se-051",
      "title": "Photographers on duty",
      "details": "",
      "startTime": "14:00",
      "duration": 90,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Daniel Thomas",
          "role": "pic"
        },
        {
          "name": "Grace",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Confirm exact arrival time with both photographers."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-arrive2"
    },
    {
      "id": "se-052",
      "title": "Pre-ceremony music plays",
      "details": "Classical? 15-min processional track TBD.",
      "startTime": "14:00",
      "duration": 30,
      "status": "tbd",
      "zone": "ceremony",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Song selection TBD."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-arrive2"
    },
    {
      "id": "se-053",
      "title": "Seating announcement",
      "details": "Direct guests to take seats.",
      "startTime": "14:20",
      "duration": 5,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-054",
      "title": "CEREMONY BEGINS",
      "details": "",
      "startTime": "14:30",
      "duration": 0,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-055",
      "title": "Processional",
      "details": "Officiant → Groom's parents → Groom's mom → Bride's parents → Bridesmaid/Groomsman pairs → Best Man & MoH → Flower children → Groom → Bride.",
      "startTime": "14:30",
      "duration": 5,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Wes Walls",
          "role": "present"
        },
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Roger",
          "role": "present"
        },
        {
          "name": "Merry",
          "role": "present"
        },
        {
          "name": "Vivek",
          "role": "present"
        },
        {
          "name": "Rita",
          "role": "present"
        },
        {
          "name": "Aparna",
          "role": "present"
        },
        {
          "name": "Zita",
          "role": "present"
        },
        {
          "name": "Deba",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Bride walks alone or with father?"
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-056",
      "title": "Minister greeting, opening words",
      "details": "",
      "startTime": "14:35",
      "duration": 10,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [
        {
          "name": "Wes Walls",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-057",
      "title": "Vows, rings, kiss",
      "details": "",
      "startTime": "14:45",
      "duration": 15,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Wes Walls",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "rings"
      ],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-058",
      "title": "Prayer / fire tunnel announced",
      "details": "Bride's family + anyone can line the aisle to pray as couple walks through.",
      "startTime": "15:00",
      "duration": 2,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [
        {
          "name": "Wes Walls",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-059",
      "title": "Prayer / fire tunnel",
      "details": "Couple walks through. Powerful moment — don't rush.",
      "startTime": "15:00",
      "duration": 15,
      "status": "confirmed",
      "zone": "ceremony",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-060",
      "title": "Announcement: reception is next",
      "details": "Direct guests to carry their chairs to reception canopy area.",
      "startTime": "15:15",
      "duration": 2,
      "status": "tentative",
      "zone": "ceremony",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-070",
      "title": "Guests move chairs to reception area",
      "details": "Same chairs from ceremony → under canopies.",
      "startTime": "15:15",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-trans"
    },
    {
      "id": "se-071",
      "title": "Sound system relocated to reception/dance area",
      "details": "Or is it already positioned to cover both?",
      "startTime": "15:15",
      "duration": 10,
      "status": "tbd",
      "zone": "reception",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "May not be needed if sound covers both areas."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-trans"
    },
    {
      "id": "se-072",
      "title": "CAKE CUTTING",
      "details": "Carol Edel helps set out cake. Photographer captures.",
      "startTime": "15:30",
      "duration": 10,
      "status": "confirmed",
      "zone": "reception",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Carol Edel",
          "role": "helper"
        },
        {
          "name": "Daniel Thomas",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-073",
      "title": "Food final setup: buffet stations open",
      "details": "Plates, disposable silverware, napkins, labels out. Meat + rice + sides + potluck items arranged.",
      "startTime": "15:30",
      "duration": 10,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "plates",
        "disposable silverware",
        "napkins",
        "labels"
      ],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-080",
      "title": "Welcome speech / blessing before meal",
      "details": "",
      "startTime": "15:45",
      "duration": 5,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Who gives the blessing? TBD."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-081",
      "title": "Buffet opens",
      "details": "Guests serve themselves. Meat (American + Indian), rice, salads, sides, potluck dishes. Announce: meat and rice provided, sides are potluck.",
      "startTime": "15:45",
      "duration": 45,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Gluten-free / allergy info — announce or signage?"
      ],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": "pg-dinner"
    },
    {
      "id": "se-082",
      "title": "Wine served at separate table",
      "details": "Non-drinkers → sparkling cider at main drink station.",
      "startTime": "15:45",
      "duration": 75,
      "status": "tbd",
      "zone": "reception",
      "people": [
        {
          "name": "Elsie",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "May need wine server license."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-dinner"
    },
    {
      "id": "se-083",
      "title": "Family photos begin",
      "details": "ORDER: Sanyal family → Shipman family → Bride + bridal party → Groom + groomsmen → Bride + Groom.",
      "startTime": "16:00",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Daniel Thomas",
          "role": "pic"
        },
        {
          "name": "Grace",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Concurrent with eating."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-084",
      "title": "Eating wraps up, desserts available",
      "details": "Cake slices + potluck desserts (pies, cobblers).",
      "startTime": "16:30",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-085",
      "title": "Speeches / toasts",
      "details": "Sparkling cider toast.",
      "startTime": "16:45",
      "duration": 20,
      "status": "tbd",
      "zone": "reception",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [
        "sparkling cider for toast"
      ],
      "notes": [
        "Speakers: Zita? Deyvansh? Confirm who and order."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-090",
      "title": "First dance",
      "details": "Song: Tangled dance (confirm).",
      "startTime": "17:00",
      "duration": 5,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Song selection: confirm Tangled."
      ],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-091",
      "title": "Father-daughter dance",
      "details": "Song TBD.",
      "startTime": "17:05",
      "duration": 5,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Roger",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-092",
      "title": "Groom-mother dance",
      "details": "Song TBD.",
      "startTime": "17:10",
      "duration": 5,
      "status": "tbd",
      "zone": "dance",
      "people": [
        {
          "name": "Stan",
          "role": "present"
        },
        {
          "name": "Aparna",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Which mother — Aparna (birth) or Rita (step) or both?"
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-093",
      "title": "Dance floor opens — transition to parallel",
      "details": "MC announces: dance floor open, lawn games, board games, kids' tournament, open stage.",
      "startTime": "17:15",
      "duration": 2,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-094",
      "title": "Lori's folk dancing",
      "details": "She calls the dances. $300 sound rental + $400 operator = $700 total.",
      "startTime": "17:15",
      "duration": 60,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Lori Tauscher",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "Uses main sound system or brings her own?"
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-095",
      "title": "Indian-style dancing",
      "details": "Music TBD.",
      "startTime": "18:15",
      "duration": 30,
      "status": "tbd",
      "zone": "dance",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-096",
      "title": "Open / free dancing",
      "details": "General party music.",
      "startTime": "18:45",
      "duration": 45,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-097",
      "title": "Tag tournament",
      "details": "Rules TBD.",
      "startTime": "17:15",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Stan",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-098",
      "title": "Knightly tournament (kids)",
      "details": "Rubber swords/shields. Thomas as Roman centurion anchor.",
      "startTime": "17:15",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-099",
      "title": "Open stage / live music",
      "details": "Depends on musical survey results.",
      "startTime": "17:15",
      "duration": 60,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC: guest performers."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-100",
      "title": "Lawn games (croquet)",
      "details": "Dad brought equipment.",
      "startTime": "17:15",
      "duration": 135,
      "status": "tentative",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Self-directed."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-101",
      "title": "Board games",
      "details": "All ages.",
      "startTime": "17:15",
      "duration": 135,
      "status": "tentative",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Self-directed."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-102",
      "title": "Historical reenactment",
      "details": "Format, costumes TBD.",
      "startTime": "17:15",
      "duration": 30,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "Scope, format, costumes all TBD. Hannah's family."
      ],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-103",
      "title": "Babysitting pen (young kids)",
      "details": "Toys, supervision schedule. Parents rotate.",
      "startTime": "17:15",
      "duration": 135,
      "status": "tentative",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [
        "toys"
      ],
      "notes": [
        "Behind shelter. Parent rotation schedule needed."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-festival"
    },
    {
      "id": "se-104",
      "title": "Golden hour couple photos",
      "details": "June 7 sunset in Keizer ≈ 8:50 PM, golden hour ≈ 7:50–8:50 PM. But photographer may leave at 6:30.",
      "startTime": "18:30",
      "duration": 45,
      "status": "tbd",
      "zone": "off-site",
      "people": [
        {
          "name": "Daniel Thomas",
          "role": "pic"
        },
        {
          "name": "Grace",
          "role": "pic"
        },
        {
          "name": "Hannah",
          "role": "present"
        },
        {
          "name": "Stan",
          "role": "present"
        }
      ],
      "itemsToBring": [],
      "notes": [
        "CONFLICT: Daniel may leave at 6:30 PM but golden hour isn't until ~7:50 PM. Confirm photographer end time."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-110",
      "title": "Last call announced",
      "details": "'Last song on the dance floor!'",
      "startTime": "19:30",
      "duration": 1,
      "status": "tentative",
      "zone": "dance",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-111",
      "title": "Sound system begins packing up",
      "details": "Equipment must be returned by 10 PM.",
      "startTime": "19:30",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Daniel Barksdale",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown1"
    },
    {
      "id": "se-112",
      "title": "Wine / alcohol packed and secured",
      "details": "",
      "startTime": "19:30",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Luke",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown1"
    },
    {
      "id": "se-113",
      "title": "Kitchen cleanup begins",
      "details": "Package excess food, coolers, trash.",
      "startTime": "19:30",
      "duration": 30,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Mike",
          "role": "pic"
        },
        {
          "name": "Vivek",
          "role": "helper"
        },
        {
          "name": "Rita",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown1"
    },
    {
      "id": "se-114",
      "title": "Desserts / leftover food packed",
      "details": "Into coolers / fridge-bound containers.",
      "startTime": "19:45",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Bonnie",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-115",
      "title": "Guests depart",
      "details": "Firm but friendly. 'Thank you for celebrating with us!'",
      "startTime": "20:00",
      "duration": 15,
      "status": "tentative",
      "zone": "parking",
      "people": [
        {
          "name": "Thomas",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": true,
      "parallelGroup": null
    },
    {
      "id": "se-116",
      "title": "Canopies taken down + staged for pickup",
      "details": "Ready for rental company pickup at 8:30 PM.",
      "startTime": "20:00",
      "duration": 30,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Zita",
          "role": "pic"
        },
        {
          "name": "Cassie",
          "role": "helper"
        },
        {
          "name": "Roger",
          "role": "helper"
        },
        {
          "name": "Merry",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown2"
    },
    {
      "id": "se-117",
      "title": "Chairs + tables collected",
      "details": "",
      "startTime": "20:00",
      "duration": 20,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown2"
    },
    {
      "id": "se-118",
      "title": "Decorations, guest book, gift table collected",
      "details": "All personal items into vehicles.",
      "startTime": "20:00",
      "duration": 15,
      "status": "tbd",
      "zone": "reception",
      "people": [],
      "itemsToBring": [],
      "notes": [
        "PIC unassigned."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown2"
    },
    {
      "id": "se-119",
      "title": "Trash sweep",
      "details": "Garbage bags. Leave no trace.",
      "startTime": "20:15",
      "duration": 15,
      "status": "tentative",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [
        "garbage bags"
      ],
      "notes": [
        "Everyone remaining helps."
      ],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown3"
    },
    {
      "id": "se-120",
      "title": "Colleen's tent + comfort kit packed",
      "details": "",
      "startTime": "20:15",
      "duration": 10,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Cassie",
          "role": "pic"
        },
        {
          "name": "Lucas",
          "role": "helper"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown3"
    },
    {
      "id": "se-121",
      "title": "Changing tent packed",
      "details": "",
      "startTime": "20:15",
      "duration": 10,
      "status": "tentative",
      "zone": "shelter",
      "people": [],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown3"
    },
    {
      "id": "se-122",
      "title": "Rental company pickup of canopies/equipment",
      "details": "Verify against drop-off photos.",
      "startTime": "20:30",
      "duration": 15,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Jenny",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown4"
    },
    {
      "id": "se-123",
      "title": "Lost & found items distributed or packed",
      "details": "",
      "startTime": "20:30",
      "duration": 5,
      "status": "tentative",
      "zone": "reception",
      "people": [
        {
          "name": "Josiah",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": false,
      "isGuestVisible": false,
      "parallelGroup": "pg-teardown4"
    },
    {
      "id": "se-124",
      "title": "Final walkthrough",
      "details": "Nothing left behind. Site clean.",
      "startTime": "20:40",
      "duration": 10,
      "status": "tentative",
      "zone": "shelter",
      "people": [
        {
          "name": "Jenny",
          "role": "pic"
        }
      ],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": false,
      "parallelGroup": null
    },
    {
      "id": "se-125",
      "title": "ALL wedding participants leave park",
      "details": "15-minute buffer before hard close.",
      "startTime": "20:45",
      "duration": 15,
      "status": "confirmed",
      "zone": "parking",
      "people": [],
      "itemsToBring": [],
      "notes": [],
      "isMilestone": true,
      "isGuestVisible": false,
      "parallelGroup": null
    }
  ],
  "schedulePhases": [
    {
      "id": "sp-00",
      "number": 0,
      "title": "Pre-Park",
      "color": "#8B7D6B",
      "note": "Before driving to the park. Home/hotel locations.",
      "collapsed": false,
      "eventIds": [
        "se-001",
        "se-002",
        "se-003",
        "se-004",
        "se-005"
      ]
    },
    {
      "id": "sp-01",
      "number": 1,
      "title": "Setup",
      "color": "#6B8E6B",
      "note": "Park gate opens 7 AM. Build everything.",
      "collapsed": false,
      "eventIds": [
        "se-010",
        "se-011",
        "se-012",
        "se-013",
        "se-014",
        "se-015",
        "se-016",
        "se-017",
        "se-018",
        "se-019",
        "se-020",
        "se-021",
        "se-022",
        "se-023",
        "se-024",
        "se-025",
        "se-026",
        "se-027",
        "se-028",
        "se-029",
        "se-030",
        "se-031",
        "se-033",
        "se-034",
        "se-032",
        "se-035",
        "se-035b",
        "se-036",
        "se-037",
        "se-038"
      ]
    },
    {
      "id": "sp-02",
      "number": 2,
      "title": "Bridal Party Final Prep",
      "color": "#C4A882",
      "note": "Hair wraps up, lunch, dress, photos, rehearsal.",
      "collapsed": false,
      "eventIds": [
        "se-040",
        "se-041",
        "se-042",
        "se-043",
        "se-044",
        "se-045",
        "se-046",
        "se-047",
        "se-048"
      ]
    },
    {
      "id": "sp-03",
      "number": 3,
      "title": "Guest Arrival + Ceremony",
      "color": "#9A454D",
      "note": "The main event.",
      "collapsed": false,
      "eventIds": [
        "se-050",
        "se-051",
        "se-052",
        "se-053",
        "se-054",
        "se-055",
        "se-056",
        "se-057",
        "se-058",
        "se-059",
        "se-060"
      ]
    },
    {
      "id": "sp-04",
      "number": 4,
      "title": "Transition",
      "color": "#B8A88A",
      "note": "Move chairs, cake cutting, buffet setup.",
      "collapsed": false,
      "eventIds": [
        "se-070",
        "se-071",
        "se-072",
        "se-073"
      ]
    },
    {
      "id": "sp-05",
      "number": 5,
      "title": "Reception Dinner",
      "color": "#8B6E4E",
      "note": "Eat, drink, photos, speeches.",
      "collapsed": true,
      "eventIds": [
        "se-080",
        "se-081",
        "se-082",
        "se-083",
        "se-084",
        "se-085"
      ]
    },
    {
      "id": "sp-06",
      "number": 6,
      "title": "Celebration",
      "color": "#6E8B6E",
      "note": "Festival block — dances, games, activities in parallel.",
      "collapsed": true,
      "eventIds": [
        "se-090",
        "se-091",
        "se-092",
        "se-093",
        "se-094",
        "se-095",
        "se-096",
        "se-097",
        "se-098",
        "se-099",
        "se-100",
        "se-101",
        "se-102",
        "se-103",
        "se-104"
      ]
    },
    {
      "id": "sp-07",
      "number": 7,
      "title": "Wind-Down + Teardown",
      "color": "#7B6B8E",
      "note": "Pack everything. Out by 9 PM.",
      "collapsed": true,
      "eventIds": [
        "se-110",
        "se-111",
        "se-112",
        "se-113",
        "se-114",
        "se-115",
        "se-116",
        "se-117",
        "se-118",
        "se-119",
        "se-120",
        "se-121",
        "se-122",
        "se-123",
        "se-124",
        "se-125"
      ]
    }
  ],
  "scheduleQuestions": [
    {
      "id": "sq-01",
      "question": "Where is everyone sleeping the night before? (Determines wake-up time and drive time)",
      "eventId": "se-001",
      "status": "resolved",
      "resolution": "Rodeway hotel in North Salem",
      "resolvedDate": "2026-04-19T05:41:51.558Z"
    },
    {
      "id": "sq-02",
      "question": "Drive time to park? (Can't finalize Phase 0 without this)",
      "eventId": "se-005",
      "status": "resolved",
      "resolution": "Variety; about 15-20 minutes from Rodeway for bridesmaids/Elsie",
      "resolvedDate": "2026-04-22T03:50:49.685Z"
    },
    {
      "id": "sq-03",
      "question": "Day-of coordinator: Jenny confirmed? (Master Doc says Jenny, memory says role unfilled)",
      "eventId": "se-010",
      "status": "resolved",
      "resolution": "Jenny as day-of coordinator confirmed",
      "resolvedDate": "2026-04-19T05:48:04.631Z"
    },
    {
      "id": "sq-04",
      "question": "Photographer arrival time + end time? (Affects detail photos at 12:30 PM AND golden hour)",
      "eventId": "se-044",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-05",
      "question": "Wes Walls arrival time? (Needed for walk-through at 1:30 PM)",
      "eventId": "se-048",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-06",
      "question": "Who gives welcome speech/blessing before dinner?",
      "eventId": "se-080",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-07",
      "question": "Who gives speeches/toasts? (Zita and Deyvansh mentioned but not confirmed)",
      "eventId": "se-085",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-08",
      "question": "Processional: bride walks alone or with father?",
      "eventId": "se-055",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-09",
      "question": "Groom-mother dance: Aparna (birth mom) or Rita (stepmom) or both?",
      "eventId": "se-092",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-10",
      "question": "Wine server license needed? (Elsie mentioned as possibility)",
      "eventId": "se-082",
      "status": "resolved",
      "resolution": "Elsie can't be OLCC certified, need someone else to be certified and serving",
      "resolvedDate": "2026-04-22T04:08:06.736Z"
    },
    {
      "id": "sq-11",
      "question": "Propane warming oven rental for Indian food?",
      "eventId": "se-022",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-12",
      "question": "Historical reenactment scope/format?",
      "eventId": "se-102",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-13",
      "question": "Smoker shuttle destination?",
      "eventId": "se-093",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-14",
      "question": "Post-park plan for guests after 9 PM?",
      "eventId": "se-115",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-15",
      "question": "Airbnb for bride + groom after wedding?",
      "eventId": "se-125",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-16",
      "question": "Lori's sound: does she use the main system or bring her own? ($700 total — $300 rental + $400 operator)",
      "eventId": "se-094",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    },
    {
      "id": "sq-17",
      "question": "Golden hour timing conflict: Daniel Thomas may leave at 6:30 PM but golden hour isn't until ~7:50 PM. Who shoots golden hour?",
      "eventId": "se-104",
      "status": "open",
      "resolution": "",
      "resolvedDate": ""
    }
  ],
  "lastModified": "2026-04-24T07:48:58.412Z",
  "lastModifiedBy": "Hannah & Stan"
}
```

## §PU-2 — Themes

The Rivendell Garden design v1.1 governs planner styling; see `F:\\.skills\\visualDesign_Rivendell.html` (1531 lines) for authoritative reference. Design tokens:

```json
{
  "colors": {
    "railBg": "#1b1026",
    "panelBg": "#0e0814",
    "cardBg": "#1e1430",
    "textPrimary": "#f3ecff",
    "textMuted": "#d9cce8",
    "gold": "#d8b55b",
    "chipActiveBg": "#d8b55b",
    "chipActiveText": "#1b1026",
    "chipInactiveText": "#f3ecff",
    "chipBorder": "#3c2a4d",
    "tileOverlayBg": "rgba(0,0,0,0.55)",
    "tileDisabled": "#9a90a6",
    "focus": "#d8b55b",
    "danger": "#ff5a7a"
  },
  "radii": {
    "chip": 14,
    "card": 18,
    "tile": 16,
    "modal": 22
  },
  "shadows": {
    "chip": "0 6px 16px rgba(0,0,0,0.35)",
    "card": "0 18px 60px rgba(0,0,0,0.45)",
    "tile": "0 10px 26px rgba(0,0,0,0.35)",
    "modal": "0 22px 90px rgba(0,0,0,0.55)"
  },
  "spacing": {
    "xs": 6,
    "sm": 10,
    "md": 16,
    "lg": 22,
    "xl": 30
  },
  "fonts": {
    "heading": "Cormorant Garamond",
    "body": "Cormorant Garamond",
    "accent": "Allura"
  }
}

```

## §PU-3 — Implicit plannerSpec reconstruction

PlannerState schema v6 (observed field shapes from live GET 2026-04-24):

**Task record:**

```json
{
  "id": "t1",
  "taskId": "A1",
  "workstream": "a",
  "title": "Registry — Get All 32 Gifts Live with Real Images",
  "desc": "Live site has 6 sample gifts with placeholders. 26-gift batch JSON exists but never imported. Hannah's image sheet (32 items) is authoritative.",
  "priority": "critical",
  "status": "done",
  "quadrant": "q1",
  "deadline": "",
  "persona": "",
  "assignee": "Stan",
  "location": "",
  "contacts": "Stan",
  "tags": [
    "registry",
    "website"
  ],
  "blockedBy": "Stan decision on deployment path",
  "group": "Website",
  "subtasks": [],
  "comments": [],
  "recurring": "",
  "reminder": "",
  "modified": "2026-04-15T15:45:16.995Z",
  "history": [
    {
      "action": "Status → Done",
      "time": "2026-04-15T15:12:06.556Z"
    },
    {
      "action": "Edited",
      "time": "2026-04-15T15:45:16.995Z"
    }
  ],
  "created": "2026-04-15T14:36:34.770Z"
}
```

**Contact record:**

```json
{
  "id": "p1",
  "name": "Hannah",
  "role": "bridal",
  "specificRole": "Bride",
  "phone": "",
  "email": "hannah7of9@gmail.com",
  "notes": "Co-planning. Handling park logistics, event insurance, SUP filing, invitations."
}
```

**ScheduleEvent record:**

```json
{
  "id": "se-001",
  "title": "Wake up / breakfast",
  "details": "Bride, bridal party, and setup crew leads.",
  "startTime": "05:30",
  "duration": 60,
  "status": "tbd",
  "zone": "off-site",
  "people": [
    {
      "name": "Hannah",
      "role": "present"
    },
    {
      "name": "Zita",
      "role": "present"
    },
    {
      "name": "Cassie",
      "role": "present"
    },
    {
      "name": "Elsie",
      "role": "present"
    },
    {
      "name": "Christa",
      "role": "present"
    }
  ],
  "itemsToBring": [],
  "notes": [],
  "isMilestone": false,
  "isGuestVisible": false,
  "parallelGroup": null
}
```

**SchedulePhase record:**

```json
{
  "id": "sp-00",
  "number": 0,
  "title": "Pre-Park",
  "color": "#8B7D6B",
  "note": "Before driving to the park. Home/hotel locations.",
  "collapsed": false,
  "eventIds": [
    "se-001",
    "se-002",
    "se-003",
    "se-004",
    "se-005"
  ]
}
```

**ScheduleQuestion record:**

```json
{
  "id": "sq-01",
  "question": "Where is everyone sleeping the night before? (Determines wake-up time and drive time)",
  "eventId": "se-001",
  "status": "resolved",
  "resolution": "Rodeway hotel in North Salem",
  "resolvedDate": "2026-04-19T05:41:51.558Z"
}
```

**AuditEntry record:**

```json
{
  "ts": "2026-04-22T04:08:06Z",
  "by": "Elsie",
  "action": "resolve",
  "target": "sq-10",
  "summary": "Resolved: Elsie can't be OLCC certified, need someone else to be certified and serving",
  "entity": "scheduleQuestion"
}
```

**Control flow (read):** client loads `planner/index.html` → `hanstan-schedule-defaults.js` → `planner.js` → `css-panel.js` → `ve-loader.js`. Token-gate on first fetch. GET `/.netlify/functions/planner-state` returns PlannerState JSON. `applyServerState()` hydrates in-memory `TASKS`, `SE`, `SP`, `SQ`, `PREFS`. On SEED_VERSION bump, merges new schedule items by id, triggers silent save-back within 100ms.

**Control flow (write):** client mutates state via edit handlers. `save()` debounces + POSTs `/.netlify/functions/planner-state` with `{state, by}`. Server validates token, writes snapshot, runs `diffStates(prev, next, by)`, appends audit entries, writes new state atomically. Response: `{ok, lastModified, savedAs, auditEntries}`. Batch C.3c Part 1 added optional `syntheticAuditEntries: [...]` field for one-shot migrations.

## §PU-4 — Known gaps

- **Schedule `diffStates()` gap** — current `diffStates()` covers tasks, contacts, groups, tags only. Does NOT cover schedule events/phases/questions/materials/notes. Stage 1 scope item #1 closes this. Parking-lot: PL-45.
- **Multi-parent group membership gap** — `tasks[].group` is single-string. Stage 0 workaround uses `tasks[].tags` for cross-surface capture. Parking-lot: PL-01, PL-02, PL-38, PL-46.
- **Master-only render-path gap** — `master-only` tag applied to HanStan Logistics/officiant/rolodex content via M40 but planner.js does not filter on it yet. Parking-lot: PL-24, PL-25, PL-26, PL-27.
- **FAB menu gap** — FAB scaffold shipped in 1,162-line uncommitted set (2 buttons: quick-add + full-add). Additional 3 buttons parking-lot: PL-10, PL-11, PL-12.
- **Activity-tab gap** — History tab renders; Activity-tab with where/who/when/why format parking-lot: PL-28 through PL-31.
- **Constraint-tooltip gap** — contact `constraints[]` populated by M42 but planner.js does not render tooltips. Parking-lot: PL-03, PL-48.

## §PU-5 — Retroactive audit migration record

Elsie's 2026-04-22 schedule-tab activity (8 mutations, originally invisible because `diffStates()` doesn't cover schedule) was reconstructed from `_preUpdate_snapshots/elsie_snaps/` and injected into live audit log via batch C.3c Part 2 using the `syntheticAuditEntries` field that batch C.3c Part 1 added. Entries:

```jsonl
{"ts":"2026-04-22T03:50:49Z","by":"Elsie","entity":"scheduleEvent","action":"note.add","target":"se-002","summary":"Added note about storage locations + crew coordination","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T03:55:28Z","by":"Elsie","entity":"schedulePhase","action":"update","target":"sp-02","field":"collapsed","from":true,"to":false,"summary":"Un-collapsed phase 'Bridal Party Final Prep'","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T03:56:28Z","by":"Elsie","entity":"scheduleEvent","action":"person.update","target":"se-021","summary":"Swapped Fen<->Lucas roles (both now helpers). NOTE: Elsie self-assignment captured only as note, not in people array — requires follow-up in Schedule-Solidification stage.","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T03:57:36Z","by":"Elsie","entity":"scheduleEvent","action":"note.add","target":"se-032","summary":"Added note: scrap full first-aid station; bring FAK for Trudy","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T04:00:07Z","by":"Elsie","entity":"scheduleEvent","action":"person.remove","target":"se-117","summary":"Removed Fen from Chairs+tables collected; Lucas now sole person. Intent unverified — deferred to Schedule-Solidification stage per draft-liquid rule.","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T04:01:21Z","by":"Elsie","entity":"scheduleEvent","action":"person.remove","target":"se-121","summary":"Removed Fen from Changing tent packed; event now has zero people. Intent unverified — deferred to Schedule-Solidification stage.","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T03:50:49Z","by":"Elsie","entity":"scheduleQuestion","action":"resolve","target":"sq-2","summary":"Resolved: Variety; about 15-20 minutes from Rodeway for bridesmaids/Elsie","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T04:08:06Z","by":"Elsie","entity":"scheduleQuestion","action":"resolve","target":"sq-10","summary":"Resolved: Elsie can't be OLCC certified, need someone else to be certified and serving","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
```

These 8 entries are now visible in `planner/audit-log.json` on live with their original 2026-04-22 timestamps.

## §PU-6 — Governance rules formalized

- **Rolodex Rule:** Stan's Rolodex contains only friends, family, and guests who are NOT coordinators/PICs/service providers. Coordinators/PICs belong in Organizers, Wedding Day, or role-specific groups. A task MAY belong to multiple groups (multi-parent support parked PL-01/PL-46); Stage 0 workaround uses `tasks[].tags` for cross-surface capture.
- **Pairing Principle:** Documented constraint-metadata model. Fen's day-of primary role is as Elsie's helper/assistant/caretaker/boyfriend. When either is not actively working, they stay near each other. Generalizes: any contact can have a `constraints: string[]` field capturing day-of or scope-of-work constraints. Bonnie and Sarah are other instances. Tooltip rendering is PL-03 parked.
- **Supremacy Rule:** Planner > schedule at default (planner is gel; schedule is draft-liquid until Schedule-Solidification per M23). Constraints > preferences — a coordinator/PIC/guest preference never overrides a constraint from another source.
- **Recency-wins Rule:** Most recent information supersedes older. Old value preserved in a comment so work-trail stays visible.
- **M-series taskId convention:** taskIds use letter-prefix + integer. A/B/C from initial 2026-04-15 seed; D from 2026-04-19 additions; M from 2026-04-23 additions onward (M = miscellaneous). Every task gets a taskId. No task is truly deleted — deprecated tasks archive with taskId intact in their final state.
- **Schema correction (from Ticket §3 pre-flight discovery 2026-04-24):** live schema uses both `id` (server-side row identifier, pattern `t<Date.now()>`) and `taskId` (human-readable label like `B4`, `D12`, `M37`). Spec references to `id === "Bxx"` as human identifier must be read as `taskId === "Bxx"`.

## §PU-7 — Structured Capture Protocol formalized

Canonical JSONL format per captured mutation:

```json
{"ts": "<ISO>", "by": "<attribution>", "entity": "task|contact|group|tag|scheduleEvent|schedulePhase|scheduleQuestion|materialCheck|coordinator|note", "action": "create|update|delete|archive|subtask.toggle|subtask.add|subtask.del|comment.add|note.add|person.add|person.remove|person.update|resolve|rename", "target": "<taskId or id>", "field": "<optional>", "from": "<prior>", "to": "<new>", "summary": "<one-line>", "source": "<spec ref>", "batch": "<batch id>"}
```

Filename pattern: `<scope>_capture_<YYYY-MM-DD>.jsonl` in `_preUpdate_snapshots/`. Usage: any migration before a new engine feature ships captures mutations in this format; when the engine feature lands, a migration script ingests the JSONL into the audit store in timestamp order. Stage 1 ships the first such script for entities not already injected by Stage 0 Phase C.3c Part 2.

## §PU-8 — Expanded entity-schema map

- **Task:** `{id, taskId, workstream, title, desc, priority, status, quadrant, deadline, persona, assignee, location, contacts, tags, blockedBy, group, subtasks, comments, history, recurring, reminder, modified, created}`.
- **Contact:** `{id, name, role, specificRole, phone, email, notes, constraints?}` — `constraints` added by batch C.3b M42 for Elsie, Fen, Bonnie, Sarah.
- **ScheduleEvent, SchedulePhase, ScheduleQuestion:** see §PU-3 samples.
- **AuditEntry:** `{ts, by, action, target, summary, entity?, field?, from?, to?}` — optional fields carried when synthetic entries include them (C.3c Part 1 extension).
- **Coordinator:** `{token, name, isMaster, addedAt, addedBy}`.
- **Snapshot:** `{id, ts, by, taskCount}` — id pattern `<isoTs>-<by>`.
- **Group:** plain string in top-level `state.groups[]`.
- **Tag:** plain string inside `tasks[].tags[]`. Tag registry `state.tags[]` is a flat array used for autocomplete.

## §PU-9 — Baseline metrics snapshot

See companion file: `_preUpdate_snapshots/baseline_plannerUpdate_stage0_phaseD_postStage0.json`. Delta from expectations: **pass**.

## §PU-10 — Stage 1 commit plan

See companion file: `_preUpdate_snapshots/stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md`.

## §PU-11 — Audit-log + snapshots-manifest integrity check

See companion file: `_preUpdate_snapshots/integrityCheck_plannerUpdate_stage0_phaseD_v1.md`.

---

**End of frozen appendix.**

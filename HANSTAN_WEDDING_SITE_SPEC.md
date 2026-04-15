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

## 14. Email Infrastructure

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

## 13. Summary

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


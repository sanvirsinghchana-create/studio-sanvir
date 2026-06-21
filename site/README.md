# The Chandan — Sanvir Chana

A static, multi-page filmmaker portfolio. No build step, no dependencies to install —
just HTML, CSS, JS and your optimised images. Animations use GSAP + Lenis loaded from a CDN.

## Run it locally
Open `index.html` directly in a browser, **or** for the smooth-scroll/animations to behave
exactly as in production, serve the folder:

```bash
cd site
python3 -m http.server 8000
# visit http://localhost:8000
```

## Deploy
Drag the whole `site/` folder onto **Netlify Drop** (app.netlify.com/drop), or push to
**Vercel** / **Cloudflare Pages** / **GitHub Pages**. It is plain static files — any host works.
Point `thechandan.co` at it when ready.

## File map
```
site/
├─ index.html        Home (loader · hero · selected work · about teaser · contact CTA)
├─ work.html         All projects grid + commercial/clients
├─ about.html        Bio + the Uttam Singh / Chandan Mandalay story
├─ contact.html      Enquiry form + details
├─ films/
│  ├─ luminaries.html
│  ├─ chrono.html    ← placeholder synopsis, replace copy
│  └─ leica.html     ← placeholder synopsis, replace copy
└─ assets/
   ├─ css/main.css   Design system (colours, type, components)
   ├─ js/main.js     Animation + interaction layer
   └─ img/full|thumb Optimised images (originals untouched in "PICTURES TO CHOOSE FROM")
```

## The things to update

### 1. Add your film videos  ← most important
Each film page has a video block. Find this in `films/luminaries.html` (and chrono/leica):
```html
<div class="video-placeholder" ... data-embed="https://player.vimeo.com/video/000000000" ...>
```
Replace the `data-embed` URL with your real **embed** URL:
- Vimeo:   `https://player.vimeo.com/video/123456789`
- YouTube: `https://www.youtube.com/embed/VIDEO_ID`

The poster image is the `background-image` on that same element — swap it for a frame from the film if you like.

### 2. Replace placeholder copy
`chrono.html` and `leica.html` synopses are marked with `<!-- EDIT -->` comments. The Luminaries
copy is real. Update credits in the `.film-credits` block on each page.

### 3. Swap or add images
All images live in `assets/img/full/` (large) and `assets/img/thumb/` (small). To change one,
just point the `src` at a different file. To add new ones, drop a JPG into both folders
(keep them web-sized — ~1800px long edge). Filenames map to the originals' codes (e.g. `q-1895`).

### 4. Add a project to the Work page
In `work.html`, copy any `<article class="pcard">…</article>` block and update its link, image,
title, category and year. (Comment in the file shows where.)

### 5. Social / contact links
The footer + mobile menu link to `https://thechandan.co` (Instagram) and `https://vimeo.com` —
replace with your real profile URLs. Email is `hi@studiosanvir.com` throughout.

### 6. Contact form (optional)
The form falls back to opening the visitor's email app. For real inbox delivery, create a free
form at **formspree.io** and replace `YOUR_FORM_ID` in `contact.html`.

## Design tokens (to tweak the look)
Top of `assets/css/main.css`:
- `--paper` warm background · `--ink` text · `--accent` ember/saffron highlight
- Fonts: **Hanken Grotesk** (display, stands in for Ashley Brooke's *Mosvita*) + **Inter** (body, stands in for *Universo*) + **Pinyon Script** (accent flourish, stands in for *The Patience*). All Google Fonts. To use the real licensed Ashley Brooke fonts, add `@font-face` rules pointing at your Mosvita / Universo / The Patience files and update `--font-display`, `--font-sans`, `--font-script`.
- Palette: gallery off-white `--paper`, near-black `--ink`, muted bronze `--accent` (used sparingly). Minimal, high-art, no loud colour.
- Works use a `.gallery` grid with title + category/year captions (Tamaki Yoshida style).

## Accessibility & performance built in
- Respects `prefers-reduced-motion` (animations off, content fully visible)
- Custom cursor / heavy parallax disabled on touch devices
- Images carry width/height (no layout shift), below-fold images lazy-load
- Keyboard accessible, skip link, focus states, semantic headings, alt text

# Branding

The Budget Atlas brand lives in **Figma**, not in this repo.

## The Figma file

**The Budget Atlas — Design**
https://www.figma.com/design/XshnyNoeRiLTeIGcIuKrhx

Pages relevant to brand:

- **Foundations** — color tokens (Atlas Tokens variable collection, synced with `src/theme.ts`).
- **Typography** — canonical text styles (Display, Body, Label, Mono tiers). Edit a style here, every instance across Components / Swag / Pages updates.
- **Components** — UI primitives (TierPill, ReviewKindPill, StatusDot) plus the `A. Mark` and `Wordmark` brand components.
- **Brand** — variable-axis cheatsheet (wght 500 / opsz 144 / SOFT 100) and brand documentation.
- **Swag** — physical applications: stickers, pins, shirts, lockups.
- **Pages** — UI mockups composed from primitives (Masthead, Sources row, etc. — site design surfaces).
- **Sandbox** — scratch space.

## Brand essentials

| Use        | HEX       | Pantone (closest)      |
| ---------- | --------- | ---------------------- |
| Accent red | `#A6261C` | **1805 C**             |
| Cream      | `#F4EFE3` | 9224 C / Warm Gray 1 C |
| Ink        | `#1B1815` | Black 6 C              |

Always specify Pantone callouts on uncoated stock — CMYK on uncoated paper drifts the red toward orange.

**Type:** Fraunces (display), IBM Plex Sans (kicker / wordmark), IBM Plex Mono (footer / monospace).

**The mark:** italic Fraunces A with a circle period nestled at the foot of the right leg. Period is a solid disc, not an outline. The two glyphs read as one unit; never separate them.

## Vendor handoff

For physical goods (stickers, pins, shirts):

1. Design or finalize the layout in Figma.
2. Select the frame → File → Export → **PDF** (Figma natively exports vector PDF).
3. Send the PDF to the vendor. Specify Pantone 1805 C if uncoated stock.

Recommended vendors:

| Type                  | Vendor                           | Notes                                                                                                          |
| --------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Stickers              | StickerMule, Sticker Ninja       | StickerMule for speed; Sticker Ninja for hand-cut feel.                                                        |
| Enamel pins           | PinGame USA, PinDesign, Vivipins | Use the **Black Italic A** variant — heavier strokes survive enamel. Outline all text to paths before sending. |
| Shirts (DTG, no-min)  | Bonfire, Cotton Bureau           | Bonfire for fundraising; Cotton Bureau for one-off small drops.                                                |
| Shirts (screen, bulk) | Real Thread, Allmade             | Best for >24-shirt orders. Provide single-color separations from the mono mark variants.                       |
| Embroidery            | Stitch Logo, ThreadBird          | They digitize from the vector file. Send the mono mark.                                                        |

## Web assets

The favicon, OG share card, and social profile image ship with the deployed site as PNGs in `public/`. Their canonical source is the Figma file; if you update the mark in Figma, re-export the PNGs at the right sizes and replace:

- `public/favicon-16.png`, `favicon-32.png`, `favicon-192.png`, `favicon-512.png`
- `public/apple-touch-icon.png` (180×180)
- `public/og-image.png` (1200×630)
- `public/profile-image.png` (1024×1024)

`index.html` references these PNGs directly; no SVG fallback.

## Why Figma is canonical

- One place to design and iterate. Visual editing is faster than handwriting SVG.
- Mockup plugins let you preview swag on real photographic objects before ordering.
- Variable font axis tuning (wght, opsz, SOFT) lives in Figma's UI rather than scattered across SVG `font-variation-settings` attributes.
- Vendor handoff is a one-click PDF export — no rsvg-convert toolchain needed.

The trade-off: regenerating brand assets requires a Figma account. For a solo project that's fine; if collaborators ever need to reproduce builds, give them view access on the file.

## Variable font axes (for matching across renderers)

Fraunces is a variable font with three axes. Figma's static instances default differently than other rendering engines, which is why the same nominal font weight can look different in different tools.

When dialing the mark or any large Fraunces text in Figma to match the on-site web headline:

- **`wght`** = 500 (Medium) — favicon's nominal weight
- **`opsz`** = 144 (Display cut) — heavier strokes, decorative terminals at large sizes
- **`SOFT`** = 100 — softer, fuller cut (browser/pango default)

Set these once on the A in the `A. Mark` component; every instance across stickers, pins, shirts, and lockups inherits.

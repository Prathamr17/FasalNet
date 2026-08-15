# Illustration assets

These are original flat-illustration SVGs standing in for photography — this
sandbox has no network access to image hosts (Unsplash/Pexels aren't in the
build allowlist), so real bundled photos aren't something I could fetch and
commit here directly.

To swap in real photography later (recommended for the final submission):
1. Download free-license images — Unsplash License and Pexels License are
   both free for commercial use, no attribution required. Search: "Indian
   farmer field", "tractor harvesting India", "APMC mandi market",
   "cold storage warehouse", "drip irrigation India".
2. Save them here as .jpg/.webp (e.g. `hero-field.jpg`).
3. In each component below, swap the `<TractorField />` (etc.) SVG import
   for `<img src={...} />` — every illustration is used as a drop-in
   component so this is a one-line change per spot, not a redesign.

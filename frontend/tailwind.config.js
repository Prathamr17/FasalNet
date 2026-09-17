/** FasalNet — "Mandi Ledger" Tailwind bridge.
 *
 *  This config does NOT introduce a second design system. It exposes the
 *  CSS custom properties already defined in src/index.css (the live
 *  "Mandi Ledger" theme — husk-paper surfaces, role-based accent colors,
 *  dark "Monsoon Night" mode) as Tailwind utilities, so new components can
 *  be built with Tailwind classes (`bg-surface`, `text-ink-muted`,
 *  `border-line`, `bg-accent`, `shadow-card`, `rounded-panel`, ...) while
 *  staying perfectly in sync with the existing theme, role accents and
 *  dark-mode switch (`[data-theme="dark"]` / `.dark`) — no duplicated
 *  color values, no drift between old and new UI.
 *
 *  A small `brand` palette (static hex, not CSS-var-based) is included for
 *  marketing-only surfaces (landing page gradients/illustrations) where a
 *  fixed identity color is wanted regardless of role/theme.
 */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--bg)",
          light: "var(--bg-l)",
          muted: "var(--bg-m)",
          deep: "var(--bg-d)",
          card: "var(--bg-card)",
        },
        ink: {
          DEFAULT: "var(--tx)",
          muted: "var(--tx-m)",
          soft: "var(--tx-s)",
        },
        line: {
          DEFAULT: "var(--bd)",
          strong: "var(--bd-h)",
        },
        accent: {
          DEFAULT: "var(--cp)",
          dark: "var(--cp-dark)",
          pale: "var(--cp-pale)",
          glow: "var(--cp-glow)",
          fg: "var(--cp-text)",
        },
        safe: { DEFAULT: "var(--safe)", bg: "var(--safe-bg)" },
        warn: { DEFAULT: "var(--warn)", bg: "var(--warn-bg)" },
        danger: { DEFAULT: "var(--danger)", bg: "var(--danger-bg)" },
        info: { DEFAULT: "var(--info)", bg: "var(--info-bg)" },
        brand: {
          leaf: "#3F6B33",
          "leaf-dark": "#2E4F25",
          "leaf-light": "#DCE8D2",
          harvest: "#B4741E",
          "harvest-light": "#F1E1BF",
          husk: "#F1EEE1",
          "husk-deep": "#DDD6BE",
          soil: "#23281F",
          indigo: "#2B4570",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Work Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        sm: "var(--r)",
        md: "var(--r2)",
        panel: "14px",
        pill: "9999px",
      },
      boxShadow: {
        card: "var(--sh)",
        subtle: "var(--sh2)",
        lifted: "var(--sh3)",
        "glow-accent": "0 0 0 4px var(--cp-glow)",
      },
      maxWidth: {
        container: "1280px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float-y": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "ticker-pulse": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: ".4" },
        },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(0.16,1,0.3,1) both",
        "float-y": "float-y 4s ease-in-out infinite",
        "ticker-pulse": "ticker-pulse 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("tailwindcss-animate")],
};

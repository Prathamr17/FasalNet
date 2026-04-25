module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:  "var(--cp)",
        bg:       "var(--bg)",
        card:     "var(--bg-l)",
        border:   "var(--bd)",
        text:     "var(--tx)",
        muted:    "var(--tx-m)",
        safe:     "var(--safe)",
        warn:     "var(--warn)",
        danger:   "var(--danger)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        body:    ["Plus Jakarta Sans", "sans-serif"],
        mono:    ["DM Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)",
        card: "0 1px 2px rgba(0,0,0,.05)",
      },
    },
  },
  plugins: [],
};

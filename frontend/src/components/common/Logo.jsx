// components/common/Logo.jsx
//
// PLACEHOLDER MARK — no logo file was supplied yet.
// Swap this for the real logo the moment it's available:
//   1. Drop the real file at src/assets/logo.png (or .svg)
//   2. Replace the <svg>...</svg> block below with:
//        <img src={logoSrc} alt="FasalNet" style={{ width: size, height: size, objectFit: "contain" }} />
//      (objectFit: "contain" keeps it from ever distorting, whatever the source aspect ratio)
// Every place that needs the mark (Navbar, Footer, Login, Signup, favicon)
// already imports this one component, so the swap is a single-file edit.

export default function Logo({ size = 30, withWordmark = true, wordmarkSize = 18, dark = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}>
        <rect width="48" height="48" rx="11" fill="url(#fn-logo-grad)" />
        {/* stylised leaf-over-field mark */}
        <path d="M24 10c7 0 12.5 5.6 12.5 12.6 0 3-1 5.7-2.7 7.9C31 34 24 38 24 38s-7-4-9.8-7.5a12.2 12.2 0 0 1-2.7-7.9C11.5 15.6 17 10 24 10Z"
          fill="rgba(255,255,255,.16)" />
        <path d="M24 13.5c-4.6 3.4-6.6 7-6.6 10.4 0 2 .6 3.7 1.7 5.2M24 13.5c4.6 3.4 6.6 7 6.6 10.4"
          stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".85" />
        <path d="M14.5 33.5c3-1.2 6-1.9 9.5-1.9s6.5.7 9.5 1.9" stroke="#fff" strokeWidth="1.6"
          strokeLinecap="round" opacity=".7" />
        <defs>
          <linearGradient id="fn-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4C7A3D" />
            <stop offset="1" stopColor="#2E4F25" />
          </linearGradient>
        </defs>
      </svg>
      {withWordmark && (
        <span style={{
          fontFamily: "var(--fd)", fontWeight: 600, fontSize: wordmarkSize,
          letterSpacing: "-.2px", color: dark ? "#fff" : "var(--tx)", lineHeight: 1,
        }}>
          FasalNet
        </span>
      )}
    </span>
  );
}

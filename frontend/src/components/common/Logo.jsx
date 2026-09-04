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
      <img src="/logo.png" alt="FasalNet" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />
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

// assets/illustrations/TractorField.jsx
// Original flat-illustration standing in for photography (see README.md
// in this folder for why, and how to swap in real photos later).
export default function TractorField({ style, className }) {
  return (
    <svg viewBox="0 0 480 340" className={className} style={style} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="">
      <defs>
        <linearGradient id="tf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAF2E4" />
          <stop offset="1" stopColor="#D9E8CC" />
        </linearGradient>
        <linearGradient id="tf-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A9B5E" />
          <stop offset="1" stopColor="#4F6E38" />
        </linearGradient>
      </defs>
      <rect width="480" height="340" fill="url(#tf-sky)" />
      <circle cx="400" cy="70" r="34" fill="#F4D06F" opacity=".8" />
      <path d="M0 190 Q120 160 240 190 T480 190 V340 H0 Z" fill="url(#tf-field)" />
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M0 ${210 + i * 13} Q120 ${180 + i * 13} 240 ${210 + i * 13} T480 ${210 + i * 13}`}
          stroke="#3C5628" strokeWidth="2" fill="none" opacity=".35" />
      ))}
      {/* tractor */}
      <g transform="translate(210,215)">
        <rect x="0" y="18" width="70" height="30" rx="6" fill="#2E4F25" />
        <rect x="8" y="0" width="34" height="24" rx="4" fill="#3F6B33" />
        <rect x="12" y="4" width="24" height="12" rx="2" fill="#DCE8D2" opacity=".8" />
        <circle cx="16" cy="54" r="16" fill="#23281F" />
        <circle cx="16" cy="54" r="7" fill="#7A9B5E" />
        <circle cx="60" cy="54" r="10" fill="#23281F" />
        <circle cx="60" cy="54" r="4" fill="#7A9B5E" />
        <rect x="70" y="24" width="6" height="4" fill="#8E5B16" />
      </g>
      {/* birds */}
      <path d="M60 60 q6 -8 12 0 q6 -8 12 0" stroke="#5B6152" strokeWidth="2" fill="none" opacity=".5" />
      <path d="M110 90 q5 -7 10 0 q5 -7 10 0" stroke="#5B6152" strokeWidth="2" fill="none" opacity=".4" />
    </svg>
  );
}

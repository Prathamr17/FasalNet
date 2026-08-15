// assets/illustrations/ColdStorage.jsx
export default function ColdStorage({ style, className }) {
  return (
    <svg viewBox="0 0 480 340" className={className} style={style} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="">
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E7ECEE" />
          <stop offset="1" stopColor="#DCE2EC" />
        </linearGradient>
      </defs>
      <rect width="480" height="340" fill="url(#cs-sky)" />
      <rect x="0" y="230" width="480" height="110" fill="#C2C8B6" />
      {/* warehouse body */}
      <rect x="90" y="120" width="300" height="120" fill="#F5F6F0" stroke="#B7BDA9" strokeWidth="2" />
      <path d="M80 122 L240 60 L400 122 Z" fill="#2B4570" />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i} x={112 + i * 54} y="150" width="30" height="40" rx="3" fill="#DCE2EC" stroke="#2B4570" strokeWidth="1.5" />
      ))}
      <rect x="205" y="195" width="70" height="45" fill="#2B4570" />
      {/* thermometer badge */}
      <g transform="translate(330,145)">
        <rect x="0" y="0" width="66" height="30" rx="15" fill="#fff" opacity=".92" />
        <circle cx="15" cy="15" r="6" fill="#2B4570" />
        <rect x="26" y="10" width="30" height="10" rx="5" fill="#DCE2EC" />
      </g>
      {/* truck */}
      <g transform="translate(30,225)">
        <rect x="0" y="0" width="55" height="26" rx="3" fill="#8E5B16" />
        <rect x="55" y="8" width="24" height="18" rx="2" fill="#B4741E" />
        <circle cx="14" cy="30" r="7" fill="#23281F" />
        <circle cx="64" cy="30" r="7" fill="#23281F" />
      </g>
    </svg>
  );
}

// assets/illustrations/MandiMarket.jsx
export default function MandiMarket({ style, className }) {
  return (
    <svg viewBox="0 0 480 340" className={className} style={style} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="">
      <defs>
        <linearGradient id="mm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5EED9" />
          <stop offset="1" stopColor="#F1E1BF" />
        </linearGradient>
      </defs>
      <rect width="480" height="340" fill="url(#mm-sky)" />
      <rect x="0" y="250" width="480" height="90" fill="#E4D2A6" />
      {/* stalls */}
      {[40, 190, 340].map((x, i) => (
        <g key={i} transform={`translate(${x},130)`}>
          <path d="M0 0 L60 0 L70 26 L-10 26 Z" fill={["#B4741E", "#8E5B16", "#B4741E"][i]} />
          <rect x="0" y="26" width="60" height="90" fill="#FBFAF4" stroke="#DDD6BE" strokeWidth="1.5" />
          <rect x="8" y="34" width="44" height="18" rx="3" fill={["#3F6B33", "#B4741E", "#5C3A5C"][i]} opacity=".8" />
          <circle cx="18" cy="70" r="8" fill="#8E5B16" />
          <circle cx="32" cy="72" r="8" fill="#3F6B33" />
          <circle cx="46" cy="70" r="8" fill="#B4741E" />
        </g>
      ))}
      {/* price board */}
      <g transform="translate(200,60)">
        <rect x="0" y="0" width="90" height="40" rx="8" fill="#23281F" />
        <text x="10" y="17" fontFamily="monospace" fontSize="9" fill="#F1E1BF">WHEAT ₹2,180</text>
        <text x="10" y="31" fontFamily="monospace" fontSize="9" fill="#DCE8D2">▲ 2.4%</text>
      </g>
    </svg>
  );
}

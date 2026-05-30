/** Official NACOS seal — inline SVG, no file dependency */
export default function NacosLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer green ring */}
      <circle cx="100" cy="100" r="99" fill="#15803d"/>
      {/* White divider ring */}
      <circle cx="100" cy="100" r="84" fill="white"/>
      {/* Inner green field */}
      <circle cx="100" cy="100" r="76" fill="#16a34a"/>

      {/* Nigeria map — simplified silhouette */}
      <path
        d="M72,48 L80,42 L92,40 L106,43 L118,49 L128,58 L136,70 L139,84
           L136,98 L130,112 L122,124 L114,134 L105,140 L96,138 L85,130
           L75,118 L67,104 L62,90 L63,76 Z"
        fill="white"
        opacity="0.88"
      />

      {/* Circuit board lines radiating from center */}
      <g stroke="white" strokeWidth="2.5" strokeOpacity="0.7" strokeLinecap="round">
        {/* Top */}
        <line x1="100" y1="45" x2="100" y2="28"/>
        <circle cx="100" cy="24" r="4.5" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
        {/* Top-right */}
        <line x1="130" y1="58" x2="146" y2="48"/>
        <circle cx="150" cy="45" r="4.5" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
        {/* Right */}
        <line x1="139" y1="88" x2="158" y2="88"/>
        <circle cx="162" cy="88" r="4.5" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
        {/* Bottom-right */}
        <line x1="122" y1="126" x2="134" y2="140"/>
        <circle cx="137" cy="144" r="4.5" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
        {/* Bottom-left */}
        <line x1="75" y1="120" x2="60" y2="134"/>
        <circle cx="57" cy="138" r="4.5" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
        {/* Left */}
        <line x1="63" y1="88" x2="44" y2="88"/>
        <circle cx="40" cy="88" r="4.5" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
      </g>

      {/* Center NACOS badge */}
      <rect x="86" y="86" width="28" height="28" rx="3" fill="white" opacity="0.15"/>
      <text x="100" y="96" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="800" fontFamily="monospace" letterSpacing="0.5">N</text>
      <text x="100" y="104" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="800" fontFamily="monospace" letterSpacing="0.5">A</text>
      <text x="100" y="112" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="800" fontFamily="monospace" letterSpacing="0.5">CS</text>

      {/* Circular text path — outer ring */}
      <defs>
        <path id="topRing"    d="M 16,100 A 84,84 0 0,1 184,100"/>
        <path id="bottomRing" d="M 22,100 A 78,78 0 0,0 178,100"/>
      </defs>

      <text fontSize="9" fontWeight="700" fill="white" fontFamily="Arial, sans-serif" letterSpacing="1.4">
        <textPath href="#topRing" startOffset="4%">NIGERIA ASSOCIATION OF COMPUTING STUDENTS</textPath>
      </text>

      {/* Bottom: stars + NACOS */}
      <text fontSize="10" fill="white" fontFamily="Arial">
        <textPath href="#bottomRing" startOffset="14%">★  ★  NACOS  ★  ★</textPath>
      </text>
    </svg>
  );
}

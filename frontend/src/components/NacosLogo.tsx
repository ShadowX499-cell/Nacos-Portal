import { useState } from 'react';

/** NACOS official seal — uses real PNG, SVG ring badge as fallback */
export default function NacosLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // SVG fallback — always renders, no file dependency
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="100" cy="100" r="99" fill="#15803d"/>
        <circle cx="100" cy="100" r="84" fill="white"/>
        <circle cx="100" cy="100" r="76" fill="#16a34a"/>
        <path d="M72,48 L80,42 L92,40 L106,43 L118,49 L128,58 L136,70 L139,84 L136,98 L130,112 L122,124 L114,134 L105,140 L96,138 L85,130 L75,118 L67,104 L62,90 L63,76 Z" fill="white" opacity="0.88"/>
        <g stroke="white" strokeWidth="2.5" strokeOpacity="0.7" strokeLinecap="round">
          <line x1="100" y1="45" x2="100" y2="28"/><circle cx="100" cy="24" r="4.5" fill="none" stroke="white" strokeWidth="2.5"/>
          <line x1="130" y1="58" x2="146" y2="48"/><circle cx="150" cy="45" r="4.5" fill="none" stroke="white" strokeWidth="2.5"/>
          <line x1="139" y1="88" x2="158" y2="88"/><circle cx="162" cy="88" r="4.5" fill="none" stroke="white" strokeWidth="2.5"/>
          <line x1="75" y1="120" x2="60" y2="134"/><circle cx="57" cy="138" r="4.5" fill="none" stroke="white" strokeWidth="2.5"/>
          <line x1="63" y1="88" x2="44" y2="88"/><circle cx="40" cy="88" r="4.5" fill="none" stroke="white" strokeWidth="2.5"/>
        </g>
        <text x="100" y="165" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="3">NACOS</text>
        <defs>
          <path id="tr" d="M 16,100 A 84,84 0 0,1 184,100"/>
        </defs>
        <text fontSize="9" fontWeight="700" fill="white" fontFamily="Arial,sans-serif" letterSpacing="1.4">
          <textPath href="#tr" startOffset="4%">NIGERIA ASSOCIATION OF COMPUTING STUDENTS</textPath>
        </text>
      </svg>
    );
  }

  return (
    <img
      src="/nacos-logo.png"
      alt="NACOS Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

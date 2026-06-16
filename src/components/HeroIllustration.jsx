import { useLanguage } from './LanguageContext'
import durianIllustration from '../assets/durian-illustration.png'

function HeroIllustration() {
  const { copy } = useLanguage()

  return (
    <svg
      className="hero-illustration"
      viewBox="0 0 960 460"
      role="img"
      aria-labelledby="hero-illustration-title hero-illustration-desc"
    >
      <title id="hero-illustration-title">
        {copy.heroIllustration.title}
      </title>
      <desc id="hero-illustration-desc">
        {copy.heroIllustration.desc}
      </desc>
      <defs>
        <linearGradient id="hillGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#E7F0EA" />
          <stop offset="100%" stopColor="#C9DDC7" />
        </linearGradient>
        <linearGradient id="goldGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#F3DFB3" />
          <stop offset="100%" stopColor="#D9A441" />
        </linearGradient>
        <linearGradient id="shellGradient" x1="248" x2="776" y1="208" y2="824" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5e8e86" />
          <stop offset="0.52" stopColor="#3c6e54" />
          <stop offset="1" stopColor="#1f4734" />
        </linearGradient>
        <linearGradient id="fleshGradient" x1="342" x2="694" y1="362" y2="684" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3dfb3" />
          <stop offset="1" stopColor="#d9a441" />
        </linearGradient>
        <linearGradient id="cardGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="100%" stopColor="#FAF4E9" />
        </linearGradient>
      </defs>

      {/* Outer bounding card */}
      <rect x="18" y="22" width="924" height="396" rx="30" fill="url(#cardGradient)" />
      <rect
        x="18"
        y="22"
        width="924"
        height="396"
        rx="30"
        fill="none"
        stroke="#E2D9C6"
        strokeWidth="1.5"
      />

      {/* Cyber Grid */}
      <g opacity="0.04" stroke="#1F4734" strokeWidth="1">
        <line x1="18" y1="80" x2="942" y2="80" />
        <line x1="18" y1="140" x2="942" y2="140" />
        <line x1="18" y1="200" x2="942" y2="200" />
        <line x1="18" y1="260" x2="942" y2="260" />
        <line x1="18" y1="320" x2="942" y2="320" />
        <line x1="18" y1="380" x2="942" y2="380" />
        
        <line x1="110" y1="22" x2="110" y2="418" />
        <line x1="220" y1="22" x2="220" y2="418" />
        <line x1="330" y1="22" x2="330" y2="418" />
        <line x1="440" y1="22" x2="440" y2="418" />
        <line x1="550" y1="22" x2="550" y2="418" />
        <line x1="660" y1="22" x2="660" y2="418" />
        <line x1="770" y1="22" x2="770" y2="418" />
        <line x1="880" y1="22" x2="880" y2="418" />
      </g>

      {/* Landscape Wave */}
      <path
        d="M18 310 C180 240 280 290 382 240 C504 182 618 234 724 170 C806 120 882 146 942 186 L942 418 L18 418 Z"
        fill="url(#hillGradient)"
        opacity="0.85"
      />

      {/* Connecting Dotted Ledger Line */}
      <path
        d="M182 180 H825"
        fill="none"
        stroke="rgba(94, 142, 134, 0.15)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        className="connection-line"
        d="M182 180 H825"
        fill="none"
        stroke="#5E8E86"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Data packets flowing along the ledger line */}
      <g className="data-packets" fill="#D9A441">
        <circle className="packet packet-1" cx="182" cy="180" r="4.5" />
        <circle className="packet packet-2" cx="182" cy="180" r="4.5" />
        <circle className="packet packet-3" cx="182" cy="180" r="4.5" />
      </g>

      {/* Node 1: Smart Farm (Brand Durian Mark) */}
      <a href="#/unit/farm" className="hero-node-link">
        <g className="hero-node" style={{ transformOrigin: '182px 180px' }}>
          <rect className="node-card-bg" x="117" y="115" width="130" height="130" rx="24" />
          <image
            href={durianIllustration}
            x="147"
            y="145"
            width="70"
            height="70"
          />
          <circle cx="182" cy="180" r="46" fill="none" stroke="rgba(31, 71, 52, 0.05)" strokeWidth="1" />
        </g>
      </a>

      {/* Node 2: Smart Logistics (Sleek Delivery Truck) */}
      <a href="#/unit/transport" className="hero-node-link">
        <g className="hero-node" style={{ transformOrigin: '404px 180px' }}>
          <rect className="node-card-bg" x="339" y="115" width="130" height="130" rx="24" />
          <g transform="translate(404, 180)">
            {/* Truck cab */}
            <rect x="-38" y="-12" width="54" height="32" rx="5" fill="#1F4734" />
            <rect x="-4" y="-8" width="28" height="28" rx="4" fill="#3C6E54" />
            <rect x="12" y="-5" width="10" height="12" rx="2" fill="#FFFDF7" /> {/* Windshield */}
            <rect x="-42" y="16" width="76" height="6" rx="3" fill="#1E2A22" /> {/* Chassis */}
            
            {/* Wheels */}
            <circle cx="-24" cy="22" r="9" fill="#1E2A22" stroke="#FFFDF7" strokeWidth="1.5" />
            <circle cx="-24" cy="22" r="3.5" fill="#D9A441" />
            <circle cx="16" cy="22" r="9" fill="#1E2A22" stroke="#FFFDF7" strokeWidth="1.5" />
            <circle cx="16" cy="22" r="3.5" fill="#D9A441" />
            
            {/* Cargo highlights */}
            <rect x="-34" y="-7" width="28" height="18" rx="2" fill="#D9A441" />
            <line x1="-28" y1="2" x2="-12" y2="2" stroke="#FFFDF7" strokeWidth="1.5" strokeLinecap="round" />
            
            {/* Motion trails */}
            <line x1="-58" y1="-4" x2="-46" y2="-4" stroke="#5E8E86" strokeWidth="2" strokeLinecap="round" />
            <line x1="-64" y1="4" x2="-50" y2="4" stroke="#5E8E86" strokeWidth="2" strokeLinecap="round" />
            <line x1="-56" y1="12" x2="-46" y2="12" stroke="#5E8E86" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </g>
          <circle cx="404" cy="180" r="46" fill="none" stroke="rgba(31, 71, 52, 0.05)" strokeWidth="1" />
        </g>
      </a>

      {/* Node 3: Lab Testing (KiemNghiemIcon flask integration) */}
      <a href="#/unit/testing" className="hero-node-link">
        <g className="hero-node" style={{ transformOrigin: '653px 180px' }}>
          <rect className="node-card-bg" x="588" y="115" width="130" height="130" rx="24" />
          <g transform="translate(653, 180) scale(0.9) translate(-40, -40)">
            <defs>
              <clipPath id="kiemNghiemFlaskClip">
                <path d="M36 17V31C36 31 25 40 24 50C23 59 31 64 40 64C49 64 57 59 56 50C55 40 44 31 44 31V17Z" />
              </clipPath>
            </defs>

            {/* Outer soft circle */}
            <circle cx="40" cy="40" r="34" fill="#FFFDF7" />
            <circle cx="40" cy="40" r="34" stroke="#EFE5D2" strokeWidth="1.5" />

            {/* Soft green background shape */}
            <path
              d="M23 48C27 38 34 33 42 34C51 35 56 42 58 50C51 57 38 61 28 56C25 54 23 51 23 48Z"
              fill="#DDEBDE"
            />

            {/* Flask body */}
            <path
              d="M36 17V31C36 31 25 40 24 50C23 59 31 64 40 64C49 64 57 59 56 50C55 40 44 31 44 31V17Z"
              fill="#FFFDF7"
            />

            {/* Liquid inside */}
            <path
              d="M22 52C28 48 35 55 44 51C50 48 58 51 58 56V66H22V52Z"
              fill="#E5B84A"
              clipPath="url(#kiemNghiemFlaskClip)"
            />

            {/* Small bubbles */}
            <circle cx="34" cy="58" r="1.8" fill="#1F513F" />
            <circle cx="45" cy="54" r="1.5" fill="#FFFDF7" />
            <circle cx="49" cy="58" r="1.2" fill="#1F513F" />

            {/* Flask outline */}
            <path
              d="M36 17V31C36 31 25 40 24 50C23 59 31 64 40 64C49 64 57 59 56 50C55 40 44 31 44 31V17Z"
              stroke="#1F513F"
              strokeWidth="3.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Check badge */}
            <circle cx="56" cy="25" r="8" fill="#1F513F" />
            <path
              d="M52.5 25L55 27.5L60 22.5"
              stroke="#E5B84A"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <circle cx="653" cy="180" r="46" fill="none" stroke="rgba(31, 71, 52, 0.05)" strokeWidth="1" />
        </g>
      </a>

      {/* Node 4: Certified Ledger (Isometric Box + Seal Stamp) */}
      <a href="#/unit/export" className="hero-node-link">
        <g className="hero-node" style={{ transformOrigin: '825px 180px' }}>
          <rect className="node-card-bg" x="760" y="115" width="130" height="130" rx="24" />
          <g transform="translate(825, 180)">
            {/* Globe lines backing */}
            <circle cx="0" cy="0" r="24" fill="none" stroke="rgba(94, 142, 134, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
            
            {/* Isometric Cargo box */}
            <path d="M0 -22 L24 -11 L0 0 L-24 -11 Z" fill="#F3DFB3" stroke="#D9A441" strokeWidth="1.5" />
            <path d="M-24 -11 L0 0 V22 L-24 11 Z" fill="#D9A441" />
            <path d="M0 0 L24 -11 V11 L0 22 Z" fill="#C8893B" />
            
            {/* Sealed Stamp Circle */}
            <g transform="translate(0, 5)">
              <circle cx="0" cy="0" r="13" fill="#1F4734" stroke="#FFFDF7" strokeWidth="2" />
              <path d="M-5 0 L-2 3 L5 -4" fill="none" stroke="#D9A441" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
          <circle cx="825" cy="180" r="46" fill="none" stroke="rgba(31, 71, 52, 0.05)" strokeWidth="1" />
        </g>
      </a>

      {/* Verified Badge */}
      <g transform="translate(684 45)">
        <rect x="0" y="0" width="186" height="46" rx="23" fill="#1F4734" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
        <circle cx="26" cy="23" r="13" fill="#D9A441" />
        <path d="M20 23 L24 27 L31 18" fill="none" stroke="#1F4734" strokeLinecap="round" strokeWidth="3.5" />
        <text x="106" y="29" textAnchor="middle" className="svg-chip">
          {copy.heroIllustration.ledgerVerified}
        </text>
      </g>

      <g className="stage-labels">
        <rect x="110" y="354" width="144" height="38" rx="19" fill="#FFFDF7" opacity="0.92" />
        <text x="182" y="379" textAnchor="middle" className="svg-label">
          {copy.heroIllustration.farm}
        </text>
        <rect x="330" y="354" width="148" height="38" rx="19" fill="#FFFDF7" opacity="0.92" />
        <text x="404" y="379" textAnchor="middle" className="svg-label">
          {copy.heroIllustration.transport}
        </text>
        <rect x="578" y="354" width="150" height="38" rx="19" fill="#FFFDF7" opacity="0.92" />
        <text x="653" y="379" textAnchor="middle" className="svg-label">
          {copy.heroIllustration.testing}
        </text>
        <rect x="752" y="354" width="146" height="38" rx="19" fill="#FFFDF7" opacity="0.92" />
        <text x="825" y="379" textAnchor="middle" className="svg-label">
          {copy.heroIllustration.export}
        </text>
      </g>
    </svg>
  )
}

export default HeroIllustration

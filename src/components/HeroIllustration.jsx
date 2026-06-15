import { useLanguage } from './LanguageContext'

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
      </defs>

      <rect x="18" y="22" width="924" height="396" rx="30" fill="#FFFDF7" />
      <rect
        x="18"
        y="22"
        width="924"
        height="396"
        rx="30"
        fill="none"
        stroke="#E2D9C6"
      />
      <path
        d="M58 296 C178 226 278 280 382 230 C504 172 618 224 724 160 C806 110 872 136 918 176 L918 418 L58 418 Z"
        fill="url(#hillGradient)"
      />
      <path
        d="M92 302 C206 238 294 282 396 236 C514 184 612 218 730 164 C808 128 862 146 896 180"
        fill="none"
        stroke="#5E8E86"
        strokeDasharray="8 13"
        strokeLinecap="round"
        strokeWidth="4"
      />

      <g transform="translate(104 162)">
        <rect x="12" y="92" width="164" height="92" rx="18" fill="#1F4734" />
        <rect x="32" y="113" width="124" height="50" rx="10" fill="#3C6E54" />
        <path d="M52 78 C25 58 30 31 55 18 C82 35 78 64 52 78Z" fill="#3C6E54" />
        <path d="M92 72 C65 52 69 24 95 10 C122 28 118 59 92 72Z" fill="#1F4734" />
        <path d="M132 78 C106 58 110 31 135 18 C163 35 158 65 132 78Z" fill="#3C6E54" />
        <circle cx="64" cy="139" r="12" fill="url(#goldGradient)" />
        <circle cx="94" cy="139" r="12" fill="url(#goldGradient)" />
        <circle cx="124" cy="139" r="12" fill="url(#goldGradient)" />
      </g>

      <g transform="translate(316 192)">
        <rect x="0" y="78" width="184" height="66" rx="16" fill="#F3DFB3" />
        <rect x="35" y="40" width="102" height="58" rx="10" fill="#D9A441" />
        <rect x="120" y="62" width="58" height="36" rx="8" fill="#C8893B" />
        <circle cx="47" cy="148" r="20" fill="#1E2A22" />
        <circle cx="148" cy="148" r="20" fill="#1E2A22" />
        <circle cx="47" cy="148" r="7" fill="#FFFDF7" />
        <circle cx="148" cy="148" r="7" fill="#FFFDF7" />
        <path d="M60 53 H112" stroke="#1E2A22" strokeLinecap="round" strokeWidth="5" />
      </g>

      <g transform="translate(552 132)">
        <rect x="10" y="36" width="188" height="174" rx="20" fill="#E2EDEA" />
        <rect x="34" y="60" width="140" height="34" rx="8" fill="#FFFDF7" />
        <path
          d="M88 86 V130 L62 176 C58 184 64 194 75 194 H133 C144 194 150 184 146 176 L120 130 V86"
          fill="#FFFDF7"
          stroke="#5E8E86"
          strokeWidth="5"
        />
        <path d="M78 153 H130" stroke="#D9A441" strokeLinecap="round" strokeWidth="8" />
        <path d="M80 170 H128" stroke="#3C6E54" strokeLinecap="round" strokeWidth="8" />
      </g>

      <g transform="translate(758 132)">
        <rect x="8" y="96" width="150" height="96" rx="12" fill="#1F4734" />
        <path d="M44 94 V42 H140" stroke="#5E8E86" strokeLinecap="round" strokeWidth="8" />
        <path d="M140 42 V88" stroke="#5E8E86" strokeLinecap="round" strokeWidth="8" />
        <rect x="32" y="120" width="102" height="14" rx="7" fill="#3C6E54" />
        <rect x="32" y="150" width="102" height="14" rx="7" fill="#D9A441" />
        <circle cx="84" cy="96" r="20" fill="#FFFDF7" stroke="#5E8E86" strokeWidth="5" />
        <path d="M76 96 L82 103 L96 86" fill="none" stroke="#1F4734" strokeLinecap="round" strokeWidth="5" />
      </g>

      <g transform="translate(664 52)">
        <rect x="0" y="0" width="196" height="54" rx="27" fill="#1F4734" />
        <circle cx="32" cy="27" r="15" fill="#D9A441" />
        <path d="M26 28 L32 34 L43 21" fill="none" stroke="#1F4734" strokeLinecap="round" strokeWidth="4" />
        <text x="112" y="34" textAnchor="middle" className="svg-chip">
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

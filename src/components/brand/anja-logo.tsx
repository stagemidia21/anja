interface AnjaLogoProps {
  size?: number
  variant?: 'dark' | 'light' | 'amber'
  showWordmark?: boolean
  className?: string
}

export function AnjaSymbol({ size = 40, variant = 'dark', className = '' }: {
  size?: number
  variant?: 'dark' | 'light' | 'amber'
  className?: string
}) {
  const stroke = variant === 'light' ? '#1E1008' : variant === 'amber' ? '#C8902A' : '#F4EEE2'
  const amber = variant === 'light' ? '#9A6A18' : '#C8902A'
  const amberLt = variant === 'light' ? '#9A6A18' : '#E0B050'
  const wing = variant === 'light' ? 'rgba(154,106,24,0.3)' : 'rgba(200,144,42,0.35)'
  const haloFill = variant === 'light' ? 'rgba(154,106,24,0.08)' : 'rgba(200,144,42,0.1)'

  // Proportional viewBox: 120 wide, 130 tall
  const vw = 120, vh = 130

  return (
    <svg
      width={size}
      height={Math.round(size * vh / vw)}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      className={className}
    >
      {/* Halo glow background */}
      <ellipse cx="60" cy="22" rx="38" ry="11" fill={haloFill} />

      {/* Halo outer ring */}
      <ellipse cx="60" cy="22" rx="30" ry="8.5" fill="none" stroke={amberLt} strokeWidth="1.4" opacity="0.78" />

      {/* Halo inner ring subtle */}
      <ellipse cx="60" cy="22" rx="14" ry="3.5" fill={amber} opacity="0.1" />

      {/* Halo center point */}
      <circle cx="60" cy="14" r="2.8" fill={amber} opacity="0.95" />

      {/* Vertical line from halo base to A apex */}
      <line x1="60" y1="30.5" x2="60" y2="35" stroke={amber} strokeWidth="1" opacity="0.4" />

      {/* Left wing */}
      <path
        d="M42 82 C32 66, 16 55, 2 60 C-4 64, -2 73, 10 72"
        fill="none" stroke={wing} strokeWidth="1.3" strokeLinecap="round"
      />
      <path
        d="M42 88 C30 76, 16 68, 2 72"
        fill="none" stroke={wing} strokeWidth="0.7" strokeLinecap="round" opacity="0.5"
      />

      {/* Right wing */}
      <path
        d="M78 82 C88 66, 104 55, 118 60 C124 64, 122 73, 110 72"
        fill="none" stroke={wing} strokeWidth="1.3" strokeLinecap="round"
      />
      <path
        d="M78 88 C90 76, 104 68, 118 72"
        fill="none" stroke={wing} strokeWidth="0.7" strokeLinecap="round" opacity="0.5"
      />

      {/* A — left stroke */}
      <line x1="36" y1="108" x2="59" y2="35" stroke={stroke} strokeWidth="3" strokeLinecap="round" />

      {/* A — right stroke */}
      <line x1="84" y1="108" x2="61" y2="35" stroke={stroke} strokeWidth="3" strokeLinecap="round" />

      {/* A — crossbar (amber) */}
      <line x1="47" y1="83" x2="73" y2="83" stroke={amber} strokeWidth="2" strokeLinecap="round" />

      {/* A — left serif foot */}
      <line x1="24" y1="108" x2="46" y2="108" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />

      {/* A — right serif foot */}
      <line x1="74" y1="108" x2="96" y2="108" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function AnjaLogo({ size = 40, variant = 'dark', showWordmark = false, className = '' }: AnjaLogoProps) {
  const textColor = variant === 'light' ? 'text-[#1E1008]' : 'text-[#C8902A]'
  const subColor = variant === 'light' ? 'text-[#9A6A18]/60' : 'text-[#C8902A]/50'

  if (!showWordmark) return <AnjaSymbol size={size} variant={variant} className={className} />

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <AnjaSymbol size={size} variant={variant} />
      <div className="flex flex-col">
        <span className={`font-display text-xl font-normal tracking-widest uppercase leading-none ${textColor}`}>
          Anja
        </span>
        <span className={`text-[8px] tracking-[0.3em] uppercase leading-none mt-1 ${subColor}`}>
          Secretária Executiva
        </span>
      </div>
    </div>
  )
}

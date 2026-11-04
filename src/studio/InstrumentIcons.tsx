import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
}

export function ApricotIcon({ size = 28, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path d="M5 29 Q14 23 22 7 M13 22 L27 19" stroke="#705032" strokeWidth="2.5" strokeLinecap="round" />
      {[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx="16" cy="9" rx="4.5" ry="6" transform={`rotate(${angle} 16 16)`} fill="#f2c94c" stroke="#dba637" strokeWidth="0.6" />)}
      <circle cx="16" cy="16" r="3" fill="#bd762a" />
      <path d="M23 24 Q30 22 28 16 Q21 17 23 24" fill="#72934d" />
    </svg>
  )
}

export function OrchidIcon({ size = 28, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path d="M16 29 Q12 21 16 13 M16 29 Q4 29 3 18 Q12 20 16 29 M16 29 Q28 28 29 18 Q22 21 16 29" stroke="#59734b" fill="#83a775" strokeWidth="1.5" />
      <ellipse cx="16" cy="9" rx="4" ry="7" fill="#d4abe6" />
      <ellipse cx="9" cy="14" rx="7" ry="4.5" transform="rotate(25 9 14)" fill="#be8ad8" />
      <ellipse cx="23" cy="14" rx="7" ry="4.5" transform="rotate(-25 23 14)" fill="#be8ad8" />
      <path d="M12 16 Q16 12 20 16 L19 23 Q16 26 13 23 Z" fill="#a96cc8" />
      <ellipse cx="16" cy="18" rx="2.5" ry="4" fill="#f4d275" />
    </svg>
  )
}

/** Đàn bầu — Hoa sen: Traditional Vietnamese Lotus flower with blooming petals & golden carpel */
export function LotusIcon({ size = 28, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="lotus-petal-main" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#d81b60" />
          <stop offset="60%" stopColor="#f06292" />
          <stop offset="100%" stopColor="#f8bbd0" />
        </linearGradient>
        <linearGradient id="lotus-petal-side" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#c2185b" />
          <stop offset="70%" stopColor="#e91e63" />
          <stop offset="100%" stopColor="#f48fb1" />
        </linearGradient>
        <linearGradient id="lotus-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#66bb6a" />
          <stop offset="100%" stopColor="#2e7d32" />
        </linearGradient>
      </defs>
      {/* Lily pad base */}
      <ellipse cx="16" cy="27" rx="13" ry="3.5" fill="url(#lotus-leaf)" />
      <path d="M16 27 C 12 26, 8 28, 4 27" stroke="#1b5e20" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M16 27 C 20 26, 24 28, 28 27" stroke="#1b5e20" strokeWidth="0.8" strokeLinecap="round" />
      {/* Outer lotus petals */}
      <path d="M7 23 C 5 18, 7 13, 11 11 C 12 15, 12 19, 10 23 Z" fill="url(#lotus-petal-side)" opacity="0.95" />
      <path d="M25 23 C 27 18, 25 13, 21 11 C 20 15, 20 19, 22 23 Z" fill="url(#lotus-petal-side)" opacity="0.95" />
      {/* Mid lotus petals */}
      <path d="M10 24 C 8 16, 12 8, 15 6 C 16 11, 16 18, 13 24 Z" fill="url(#lotus-petal-main)" />
      <path d="M22 24 C 24 16, 20 8, 17 6 C 16 11, 16 18, 19 24 Z" fill="url(#lotus-petal-main)" />
      {/* Center standing lotus petal */}
      <path d="M16 4 C 18 8, 19 14, 16 25 C 13 14, 14 8, 16 4 Z" fill="#fce4ec" />
      <path d="M16 6 C 17.5 10, 18 15, 16 23 C 14 15, 14.5 10, 16 6 Z" fill="url(#lotus-petal-main)" opacity="0.85" />
      {/* Golden carpel center */}
      <ellipse cx="16" cy="22" rx="3.5" ry="1.8" fill="#fbc02d" stroke="#f57f17" strokeWidth="0.6" />
      <circle cx="14.5" cy="21.8" r="0.6" fill="#795548" />
      <circle cx="16" cy="21.5" r="0.6" fill="#795548" />
      <circle cx="17.5" cy="21.8" r="0.6" fill="#795548" />
    </svg>
  )
}

/** Sáo trúc — Cây tre: Bamboo culm, fluttering bamboo blades & flute holes */
export function BambooIcon({ size = 28, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="bamboo-stem" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#43a047" />
          <stop offset="45%" stopColor="#7cb342" />
          <stop offset="75%" stopColor="#8bc34a" />
          <stop offset="100%" stopColor="#388e3c" />
        </linearGradient>
        <linearGradient id="bamboo-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8bc34a" />
          <stop offset="100%" stopColor="#2e7d32" />
        </linearGradient>
      </defs>
      {/* Lower culm */}
      <rect x="13.5" y="19" width="5" height="11" rx="1.2" fill="url(#bamboo-stem)" />
      {/* Joint ring lower */}
      <line x1="12" y1="19" x2="20" y2="19" stroke="#255d1e" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12.5" y1="18.2" x2="19.5" y2="18.2" stroke="#dcedc8" strokeWidth="1" strokeLinecap="round" />
      {/* Middle culm (flute body with sound holes) */}
      <rect x="13.5" y="9" width="5" height="10" rx="1.2" fill="url(#bamboo-stem)" />
      {/* Flute finger holes */}
      <circle cx="16" cy="11.5" r="1.1" fill="#1b3d16" />
      <circle cx="16" cy="14.5" r="1.1" fill="#1b3d16" />
      {/* Joint ring upper */}
      <line x1="12" y1="9" x2="20" y2="9" stroke="#255d1e" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12.5" y1="8.2" x2="19.5" y2="8.2" stroke="#dcedc8" strokeWidth="1" strokeLinecap="round" />
      {/* Upper culm */}
      <rect x="13.5" y="2" width="5" height="7" rx="1.2" fill="url(#bamboo-stem)" />
      {/* Left fluttering bamboo leaves */}
      <path d="M13 18 C 8 16, 3 19, 1 24 C 5 22, 10 21, 13 18 Z" fill="url(#bamboo-leaf-grad)" />
      <path d="M13 9 C 7 7, 3 11, 2 15 C 6 12, 10 11, 13 9 Z" fill="url(#bamboo-leaf-grad)" />
      {/* Right fluttering bamboo leaves */}
      <path d="M19 18 C 24 15, 29 17, 31 22 C 27 20, 22 20, 19 18 Z" fill="url(#bamboo-leaf-grad)" />
      <path d="M19 8 C 25 5, 29 8, 30 12 C 26 10, 22 9, 19 8 Z" fill="url(#bamboo-leaf-grad)" />
      <path d="M16 2 C 18 -1, 23 1, 25 4 C 21 3, 18 3, 16 2 Z" fill="url(#bamboo-leaf-grad)" />
    </svg>
  )
}

/** Đàn tranh — Cành đào: Blooming 5-petal peach blossom with wooden zither bridge lines */
export function PeachBlossomIcon({ size = 28, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="peach-petal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fce4ec" />
          <stop offset="45%" stopColor="#f48fb1" />
          <stop offset="90%" stopColor="#e91e63" />
          <stop offset="100%" stopColor="#c2185b" />
        </radialGradient>
        <linearGradient id="peach-wood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8d6e63" />
          <stop offset="100%" stopColor="#4e342e" />
        </linearGradient>
      </defs>
      {/* Peach blossom twig */}
      <path d="M4 29 C 10 24, 14 20, 24 25" stroke="url(#peach-wood)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 22 C 14 19, 16 16, 16 16" stroke="url(#peach-wood)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Little bud */}
      <ellipse cx="6" cy="23" rx="2.5" ry="1.8" transform="rotate(-30 6 23)" fill="#e91e63" />
      {/* 5 Petals of Peach Blossom */}
      {/* Top petal */}
      <ellipse cx="16" cy="9" rx="5" ry="6.5" fill="url(#peach-petal)" />
      {/* Top-Right petal */}
      <ellipse cx="22.5" cy="13.5" rx="5" ry="6.5" transform="rotate(72 22.5 13.5)" fill="url(#peach-petal)" />
      {/* Bottom-Right petal */}
      <ellipse cx="20" cy="21.5" rx="5" ry="6.5" transform="rotate(144 20 21.5)" fill="url(#peach-petal)" />
      {/* Bottom-Left petal */}
      <ellipse cx="12" cy="21.5" rx="5" ry="6.5" transform="rotate(-144 12 21.5)" fill="url(#peach-petal)" />
      {/* Top-Left petal */}
      <ellipse cx="9.5" cy="13.5" rx="5" ry="6.5" transform="rotate(-72 9.5 13.5)" fill="url(#peach-petal)" />
      {/* Blossom center */}
      <circle cx="16" cy="16" r="3.2" fill="#ad1457" />
      {/* Golden stamens */}
      <circle cx="16" cy="13.5" r="0.9" fill="#ffd54f" />
      <circle cx="18.2" cy="14.8" r="0.9" fill="#ffd54f" />
      <circle cx="17.5" cy="17.8" r="0.9" fill="#ffd54f" />
      <circle cx="14.5" cy="17.8" r="0.9" fill="#ffd54f" />
      <circle cx="13.8" cy="14.8" r="0.9" fill="#ffd54f" />
      <circle cx="16" cy="16" r="1.1" fill="#ffe082" />
    </svg>
  )
}

/** Trống cơm — Bông lúa: Graceful golden rice ears with traditional lacquered folk drum */
export function RiceEarIcon({ size = 28, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="rice-grain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff59d" />
          <stop offset="40%" stopColor="#fbc02d" />
          <stop offset="100%" stopColor="#f57f17" />
        </linearGradient>
        <linearGradient id="drum-lacquer" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b71c1c" />
          <stop offset="50%" stopColor="#d32f2f" />
          <stop offset="100%" stopColor="#880e4f" />
        </linearGradient>
      </defs>
      {/* Golden Rice Stalk arching over */}
      <path d="M5 28 C 9 20, 16 11, 26 8" stroke="#827717" strokeWidth="1.8" strokeLinecap="round" />
      {/* Plump Rice Grains nodding along stalk */}
      <ellipse cx="26" cy="8" rx="2.2" ry="3.8" transform="rotate(45 26 8)" fill="url(#rice-grain)" stroke="#f57f17" strokeWidth="0.5" />
      <ellipse cx="23" cy="11" rx="2" ry="3.6" transform="rotate(50 23 11)" fill="url(#rice-grain)" stroke="#f57f17" strokeWidth="0.5" />
      <ellipse cx="20" cy="14" rx="2" ry="3.6" transform="rotate(55 20 14)" fill="url(#rice-grain)" stroke="#f57f17" strokeWidth="0.5" />
      <ellipse cx="17" cy="17" rx="2" ry="3.4" transform="rotate(60 17 17)" fill="url(#rice-grain)" stroke="#f57f17" strokeWidth="0.5" />
      <ellipse cx="14" cy="20" rx="1.8" ry="3.2" transform="rotate(65 14 20)" fill="url(#rice-grain)" stroke="#f57f17" strokeWidth="0.5" />
      {/* Opposite grains */}
      <ellipse cx="22" cy="7" rx="1.8" ry="3.4" transform="rotate(25 22 7)" fill="url(#rice-grain)" stroke="#f57f17" strokeWidth="0.5" />
      <ellipse cx="18" cy="10" rx="1.8" ry="3.4" transform="rotate(30 18 10)" fill="url(#rice-grain)" stroke="#f57f17" strokeWidth="0.5" />
      <ellipse cx="15" cy="13" rx="1.8" ry="3.2" transform="rotate(35 15 13)" fill="url(#rice-grain)" stroke="#f57f17" strokeWidth="0.5" />
      {/* Rice awn bristles */}
      <line x1="26" y1="8" x2="30" y2="4" stroke="#c0ca33" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="23" y1="11" x2="27" y2="7" stroke="#c0ca33" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="20" y1="14" x2="24" y2="10" stroke="#c0ca33" strokeWidth="0.8" strokeLinecap="round" />
      {/* Traditional Folk Drum (Trống Cơm) at the bottom left */}
      <g transform="translate(4, 18)">
        <ellipse cx="6" cy="4" rx="4.5" ry="1.6" fill="#fff9c4" stroke="#fbc02d" strokeWidth="0.6" />
        <path d="M1.5 4 C 1 7, 2 10, 6 10 C 10 10, 11 7, 10.5 4 Z" fill="url(#drum-lacquer)" />
        <line x1="2.5" y1="5" x2="5" y2="9.5" stroke="#ffe082" strokeWidth="0.6" />
        <line x1="9.5" y1="5" x2="7" y2="9.5" stroke="#ffe082" strokeWidth="0.6" />
        <ellipse cx="6" cy="4" rx="1.8" ry="0.7" fill="#6d4c41" />
      </g>
    </svg>
  )
}

/** Action Icon: Sân khấu AR / Bài học */
export function StageArIcon({ size = 22, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M12 2L3 7v11l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 22V12" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 7l-9 5-9-5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" fill="#ffd54f" />
    </svg>
  )
}

/** Action Icon: Tập chơi từng bước / Cử chỉ tay */
export function HandPinchIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M18 11V6a2 2 0 0 0-4 0v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 10V4a2 2 0 0 0-4 0v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 10.5V7a2 2 0 0 0-4 0v8a5 5 0 0 0 5 5h3a5 5 0 0 0 5-5v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="4" r="1.5" fill="#fbc02d" />
    </svg>
  )
}

/** Action Icon: Nghe tác phẩm mẫu */
export function MelodyNoteIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" fill="currentColor" />
      <circle cx="18" cy="16" r="3" fill="currentColor" />
      <path d="M9 9l12-2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

/** Sample Card Floral Medallion */
export function SampleFlowerIcon({ size = 22, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" fill="#fcedcb" stroke="#d4a026" strokeWidth="1" />
      <path d="M12 6 C 13 9, 15 11, 18 12 C 15 13, 13 15, 12 18 C 11 15, 9 13, 6 12 C 9 11, 11 9, 12 6 Z" fill="#b83c2e" />
      <circle cx="12" cy="12" r="2.2" fill="#ffeb3b" />
    </svg>
  )
}

/** Toolbar Undo */
export function ToolbarUndoIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M3 10h10a5 5 0 0 1 5 5v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 6L3 10l4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Toolbar Redo */
export function ToolbarRedoIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M21 10H11a5 5 0 0 0-5 5v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6l4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Toolbar Reset / Làm lại */
export function ToolbarResetIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M3 12a9 9 0 1 0 2.5-6.2L3 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Toolbar Replay / Phát lại */
export function ToolbarReplayIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
    </svg>
  )
}

/** Toolbar Save */
export function ToolbarSaveIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Toolbar Export PNG */
export function ToolbarExportIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Sound On Icon */
export function SoundOnIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Sound Off Icon */
export function SoundOffIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Fullscreen Icon */
export function FullscreenIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

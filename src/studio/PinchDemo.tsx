/** Looping illustration of the gesture: fingertips meet, a sprout grows, fingers part, a flower opens. */
export function PinchDemo() {
  return (
    <div className="pinch-demo-box" title="Cử chỉ tay: Chụm ngón cái và ngón trỏ để gieo nét vẽ, tách ngón để nở hoa">
      <svg className="pinch-demo" viewBox="0 0 150 76" role="img" aria-label="Minh họa: chụm ngón cái và ngón trỏ để vẽ, tách ngón để nở hoa">
        <defs>
          <linearGradient id="demo-sprout-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2e7d32" />
            <stop offset="60%" stopColor="#43a047" />
            <stop offset="100%" stopColor="#81c784" />
          </linearGradient>
          <linearGradient id="demo-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#81c784" />
            <stop offset="100%" stopColor="#2e7d32" />
          </linearGradient>
          <linearGradient id="demo-petal-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#d81b60" />
            <stop offset="60%" stopColor="#f06292" />
            <stop offset="100%" stopColor="#fce4ec" />
          </linearGradient>
          <radialGradient id="demo-touch-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffeb3b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffb300" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ff8f00" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="demo-finger-grad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#eceff1" />
            <stop offset="100%" stopColor="#90a4ae" />
          </radialGradient>
        </defs>

        {/* Subtle background path */}
        <path d="M24 58 C 48 56, 72 32, 116 22" fill="none" stroke="rgba(219, 211, 193, 0.45)" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Growing Sprout Stem */}
        <path className="demo-sprout" d="M24 58 C 48 56, 72 32, 116 22" pathLength={1} />

        {/* Sprouting Leaves */}
        <g className="demo-leaf demo-leaf-a" transform="translate(54, 46) rotate(-40)">
          <ellipse cx="0" cy="0" rx="9" ry="4" fill="url(#demo-leaf-grad)" />
          <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="0.8" />
        </g>
        <g className="demo-leaf demo-leaf-b" transform="translate(82, 32) rotate(18)">
          <ellipse cx="0" cy="0" rx="9" ry="4" fill="url(#demo-leaf-grad)" />
          <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="0.8" />
        </g>

        {/* Blooming Flower at tip */}
        <g className="demo-flower" transform="translate(116, 22)">
          {[0, 60, 120, 180, 240, 300].map(angle => (
            <ellipse key={angle} cx="0" cy="-7" rx="4" ry="7" transform={`rotate(${angle})`} fill="url(#demo-petal-grad)" />
          ))}
          <circle r="4" className="demo-flower-center" fill="#fbc02d" stroke="#f57f17" strokeWidth="0.7" />
          <circle r="1.8" fill="#fff9c4" />
        </g>

        {/* Animated Fingertips */}
        <g className="demo-hand">
          <circle className="demo-spark" cx="0" cy="0" r="9" fill="url(#demo-touch-glow)" />
          <g className="demo-thumb" transform="translate(0, 8)">
            <rect x="-5.5" y="-5.5" width="11" height="13" rx="5.5" fill="url(#demo-finger-grad)" stroke="#37474f" strokeWidth="1.6" />
            <ellipse cx="0" cy="-2" rx="3" ry="1.8" fill="rgba(255, 255, 255, 0.75)" />
          </g>
          <g className="demo-index" transform="translate(0, -8)">
            <rect x="-5.5" y="-7.5" width="11" height="13" rx="5.5" fill="url(#demo-finger-grad)" stroke="#37474f" strokeWidth="1.6" />
            <ellipse cx="0" cy="2" rx="3" ry="1.8" fill="rgba(255, 255, 255, 0.75)" />
          </g>
        </g>
      </svg>
      <span className="pinch-demo-caption">Chụm ngón để vẽ · Tách ngón nở hoa</span>
    </div>
  )
}

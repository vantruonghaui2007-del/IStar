/** Looping illustration of the gesture: fingertips meet, a sprout grows, fingers part, a flower opens. */
export function PinchDemo() {
  return (
    <svg className="pinch-demo" viewBox="0 0 160 90" role="img" aria-label="Minh họa: chụm ngón cái và ngón trỏ để vẽ, tách ngón để nở hoa">
      <path className="demo-sprout" d="M30 72 C 55 70, 70 40, 112 30" pathLength={1} />
      <ellipse className="demo-leaf demo-leaf-a" cx="62" cy="58" rx="9" ry="4" transform="rotate(-50 62 58)" />
      <ellipse className="demo-leaf demo-leaf-b" cx="84" cy="40" rx="9" ry="4" transform="rotate(10 84 40)" />
      <g className="demo-flower" transform="translate(112 30)">
        {[0, 72, 144, 216, 288].map(angle => (
          <ellipse key={angle} cx="0" cy="-7" rx="4.5" ry="7" transform={`rotate(${angle})`} />
        ))}
        <circle r="3.5" className="demo-flower-center" />
      </g>
      <g className="demo-hand">
        <circle className="demo-thumb" cx="0" cy="8" r="6" />
        <circle className="demo-index" cx="0" cy="-8" r="6" />
      </g>
    </svg>
  )
}

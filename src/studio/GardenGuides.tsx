import { CANVAS_HEIGHT as H, CANVAS_WIDTH as W } from '../artwork/types'
import type { InstrumentId } from '../music/instruments'
import { DEGREES, noteLabel, STRINGS, xOfString, yOfDegree } from '../music/scale'

type Props = {
  instrument: InstrumentId
  visible: boolean
}

const formatNote = (degree: number) => {
  const { name, octave } = noteLabel(degree)
  return `${name}${'·'.repeat(octave)}`
}

/**
 * Spatial music guides over the Giấy Dó garden canvas.
 * Pure SVG overlay (`pointer-events: none`) so the underlying 2D canvas and PNG export remain untouched.
 */
export function GardenGuides({ instrument, visible }: Props) {
  if (!visible) return null

  return (
    <svg className="garden-guides" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {(instrument === 'dan-bau' || instrument === 'sao-truc' || instrument === 'dan-nguyet' || instrument === 'dan-ty-ba') && (
        <g className="guides-lanes">
          {Array.from({ length: DEGREES }, (_, degree) => {
            const y = yOfDegree(degree)
            const isRoot = degree % 5 === 0
            return (
              <g key={degree} className={isRoot ? 'lane-root' : 'lane-step'}>
                <line x1={60} y1={y} x2={W - 130} y2={y} />
                <text x={W - 60} y={y + 8} textAnchor="end">
                  {formatNote(degree)}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {instrument === 'dan-tranh' && (
        <g className="guides-strings">
          {Array.from({ length: STRINGS }, (_, string) => {
            const x = xOfString(string)
            const isRoot = string % 5 === 0
            const bridgeY = 820 - string * 22
            return (
              <g key={string} className={isRoot ? 'string-root' : 'string-step'}>
                <line x1={x} y1={50} x2={x} y2={H - 75} />
                <polygon points={`${x - 12},${bridgeY + 12} ${x},${bridgeY - 8} ${x + 12},${bridgeY + 12}`} />
                <text x={x} y={H - 35} textAnchor="middle">
                  {formatNote(string)}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {instrument === 'trong-com' && (
        <g className="guides-drum">
          <line x1={80} y1={H / 2} x2={W - 80} y2={H / 2} />
          <text x={W - 70} y={H / 2 - 28} textAnchor="end">
            TÌNH · Nửa trên (cao)
          </text>
          <text x={W - 70} y={H / 2 + 42} textAnchor="end">
            TÙNG · Nửa dưới (trầm)
          </text>
        </g>
      )}
    </svg>
  )
}

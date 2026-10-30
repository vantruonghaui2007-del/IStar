import type { Stroke } from '../artwork/types'
import type { InstrumentId } from './instruments'
import { scoreOf, type MusicEvent } from './score'

export type TutorialStep = { text: string; check: (strokes: Stroke[]) => boolean }

const count = (events: MusicEvent[], kind: MusicEvent['kind']) => events.filter(event => event.kind === kind).length
const degrees = (events: MusicEvent[]) => events.flatMap(event => ('degree' in event ? [event.degree] : []))
const duration = (stroke: Stroke) => stroke.points[stroke.points.length - 1].t
const monotonic = (values: number[], direction: 1 | -1) => values.length >= 5 && values.every((value, i) => i === 0 || (value - values[i - 1]) * direction > 0)

/** Only strokes of this instrument count, each with its finished score. */
const on = (instrument: InstrumentId, test: (stroke: Stroke, events: MusicEvent[]) => boolean) => (strokes: Stroke[]) =>
  strokes.some(stroke => stroke.instrument === instrument && test(stroke, scoreOf(stroke, true)))

/** Three guided steps per instrument; each passes once the visitor has played it (strokes made since the step began). */
export const TUTORIALS: Record<InstrumentId, TutorialStep[]> = {
  'dan-bau': [
    { text: 'Chụm ngón (hoặc nhấn chuột) để gảy một tiếng đàn.', check: on('dan-bau', (_, events) => count(events, 'pluck') > 0) },
    { text: 'Giữ chụm và đưa tay lên, xuống để luyến qua vài nốt — như uốn cần đàn.', check: on('dan-bau', (_, events) => count(events, 'glide') >= 2) },
    { text: 'Luyến một câu rồi thả tay: tiếng đàn ngân, hoa sen nở.', check: on('dan-bau', (_, events) => count(events, 'glide') >= 1) },
  ],
  'sao-truc': [
    { text: 'Chụm và giữ ít nhất một giây để thổi một nốt ngân dài.', check: on('sao-truc', stroke => duration(stroke) >= 1000) },
    { text: 'Đang giữ, đưa tay lên cao để tiếng sáo vút lên.', check: on('sao-truc', (_, events) => degrees(events).some((degree, i, all) => i > 0 && degree > all[0])) },
    { text: 'Thổi một câu ngắn rồi thả tay để ngắt hơi.', check: on('sao-truc', (_, events) => count(events, 'release') > 0) },
  ],
  'dan-tranh': [
    {
      text: 'Chạm (chụm rồi thả tại chỗ) ba dây khác nhau — trái trầm, phải bổng.',
      check: strokes => strokes.filter(stroke => stroke.instrument === 'dan-tranh' && scoreOf(stroke, true).length === 1).length >= 3,
    },
    { text: 'Chụm rồi lướt tay sang phải qua nhiều dây: kỹ thuật rải.', check: on('dan-tranh', (_, events) => monotonic(degrees(events), 1)) },
    { text: 'Giờ rải ngược từ phải sang trái.', check: on('dan-tranh', (_, events) => monotonic(degrees(events), -1)) },
  ],
  'trong-com': [
    { text: 'Gõ một tiếng “tùng” ở nửa dưới khung.', check: on('trong-com', (_, events) => degrees(events)[0] < 5) },
    { text: 'Gõ một tiếng “tình” ở nửa trên khung.', check: on('trong-com', (_, events) => degrees(events)[0] >= 5) },
    {
      text: 'Gõ bốn tiếng liền theo nhịp đều.',
      check: strokes => {
        const hits = strokes.filter(stroke => stroke.instrument === 'trong-com').slice(-4)
        if (hits.length < 4) return false
        const gaps = hits.slice(1).map((stroke, i) => stroke.startedAt - hits[i].startedAt)
        const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
        return mean > 150 && gaps.every(gap => Math.abs(gap - mean) <= mean * 0.25)
      },
    },
  ],
}

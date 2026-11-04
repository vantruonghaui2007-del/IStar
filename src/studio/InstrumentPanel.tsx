import type { ReactNode } from 'react'
import { INSTRUMENTS, INSTRUMENT_IDS, type InstrumentId } from '../music/instruments'
import { MELODIES, PIECE_NOTE } from '../music/pieces'
import { TUTORIALS } from '../music/tutorial'
import { BambooIcon, HandPinchIcon, LotusIcon, MelodyNoteIcon, PeachBlossomIcon, RiceEarIcon, StageArIcon, ApricotIcon, OrchidIcon } from './InstrumentIcons'

export type TutorialState = { instrument: InstrumentId; step: number; since: number } | null

type Props = {
  instrument: InstrumentId
  tutorial: TutorialState
  playingPiece: InstrumentId | null
  onSelect: (id: InstrumentId) => void
  onTutorial: (start: boolean) => void
  onPiece: (id: InstrumentId) => void
  onLesson: (id: InstrumentId) => void
}

const INSTRUMENT_META: Record<InstrumentId, { icon: (props: { size?: number }) => ReactNode; gesture: string }> = {
  'dan-nguyet': { icon: ApricotIcon, gesture: 'Chụm rồi thả để gảy · Đưa tay lên xuống chọn nốt và nhấn luyến' },
  'dan-ty-ba': { icon: OrchidIcon, gesture: 'Chụm thả để gảy dây · Nâng/hạ tay để nhấn luyến' },
  'dan-bau': { icon: LotusIcon, gesture: 'Chụm để gảy nốt · Nâng/hạ tay uốn cần đàn để luyến' },
  'sao-truc': { icon: BambooIcon, gesture: 'Chụm giữ để thổi ngân · Đưa tay lên xuống theo cao độ' },
  'dan-tranh': { icon: PeachBlossomIcon, gesture: 'Chụm gảy từng dây · Lướt ngang để rải 16 dây hoa đào' },
  'trong-com': { icon: RiceEarIcon, gesture: 'Gõ nhanh: Nửa trên tiếng Tình · Nửa dưới tiếng Tùng' },
}

/** Pick an instrument, learn gesture, practise step by step, and listen to its piece. */
export function InstrumentPanel({ instrument, tutorial, playingPiece, onSelect, onTutorial, onPiece, onLesson }: Props) {
  const current = INSTRUMENTS[instrument]
  const meta = INSTRUMENT_META[instrument]
  const steps = TUTORIALS[instrument]
  const active = tutorial?.instrument === instrument ? tutorial : null
  const finished = active !== null && active.step >= steps.length
  const CurrentIcon = meta.icon

  return (
    <div className="instruments">
      <div className="instrument-picker" role="radiogroup" aria-label="Chọn nhạc cụ">
        {INSTRUMENT_IDS.map(id => {
          const item = INSTRUMENTS[id]
          const isSelected = id === instrument
          const Icon = INSTRUMENT_META[id].icon
          return (
            <button key={id} type="button" role="radio" aria-checked={isSelected} className={`instrument ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(id)}>
              <span className="instrument-badge" aria-hidden="true">
                <Icon size={26} />
              </span>
              <span className="instrument-name">
                <b>{item.name}</b>
                <small>{item.plant}</small>
              </span>
            </button>
          )
        })}
      </div>

      <section className="instrument-card" aria-labelledby="instrument-title">
        <div className="instrument-card-header">
          <div className="card-title-wrap">
            <span className="card-species-icon" aria-hidden="true">
              <CurrentIcon size={28} />
            </span>
            <h2 id="instrument-title">
              {current.name} <small>→ {current.plant}</small>
            </h2>
          </div>
          <span className="species-tag">{current.plant}</span>
        </div>

        <div className="gesture-callout">
          <span className="gesture-tag" aria-hidden="true">CỬ CHỈ TAY</span>
          <p className="gesture-text">{meta.gesture}</p>
        </div>

        <details className="instrument-more">
          <summary>Tìm hiểu nhạc cụ</summary>
          <p>{current.about.join(' ')}</p>
        </details>

        {active && (
          <div className="tutorial" data-testid="tutorial">
            <div className="tutorial-head">
              <h3>Tập chơi {current.name}</h3>
              <button type="button" className="link-button" onClick={() => onTutorial(false)}>
                {finished ? 'Đóng' : 'Dừng tập'}
              </button>
            </div>
            <ol>
              {steps.map((step, index) => (
                <li key={step.text} className={index < active.step ? 'done' : index === active.step ? 'current' : ''}>
                  <span aria-hidden="true">{index < active.step ? '✓' : index + 1}</span> {step.text}
                </li>
              ))}
            </ol>
            {finished ? <p className="tutorial-done">Tuyệt vời! Bạn đã chơi được {current.name}. Hãy nghe tác phẩm mẫu bên dưới.</p> : null}
          </div>
        )}

        <div className="instrument-actions">
          <button type="button" className="lesson-start" onClick={() => onLesson(instrument)}>
            <StageArIcon size={26} className="action-icon" />
            <span>
              <b>Tập đánh cả bài “{MELODIES[instrument].title}”</b>
              <small>Sân khấu AR · nốt sáng vàng chờ bạn đánh đúng</small>
            </span>
          </button>

          <div className="action-row">
            {!active && (
              <button type="button" className="practice" onClick={() => onTutorial(true)}>
                <HandPinchIcon size={18} className="btn-icon" />
                <span>Tập chơi từng bước</span>
              </button>
            )}

            <button type="button" className="piece" onClick={() => onPiece(instrument)} aria-pressed={playingPiece === instrument} title={PIECE_NOTE}>
              <MelodyNoteIcon size={18} className="btn-icon" />
              <span>Nghe tác phẩm “{MELODIES[instrument].title}”</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

import { INSTRUMENTS, INSTRUMENT_IDS, type InstrumentId } from '../music/instruments'
import { MELODIES, PIECE_NOTE } from '../music/pieces'
import { TUTORIALS } from '../music/tutorial'

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

/** Pick an instrument, learn what it is and how to play it, practise step by step, and listen to its piece. */
export function InstrumentPanel({ instrument, tutorial, playingPiece, onSelect, onTutorial, onPiece, onLesson }: Props) {
  const current = INSTRUMENTS[instrument]
  const steps = TUTORIALS[instrument]
  const active = tutorial?.instrument === instrument ? tutorial : null
  const finished = active !== null && active.step >= steps.length

  return (
    <div className="instruments">
      <div className="instrument-picker" role="radiogroup" aria-label="Chọn nhạc cụ">
        {INSTRUMENT_IDS.map(id => {
          const item = INSTRUMENTS[id]
          return (
            <button key={id} type="button" role="radio" aria-checked={id === instrument} className={`instrument ${id === instrument ? 'selected' : ''}`} onClick={() => onSelect(id)}>
              <span className="swatches" style={{ background: `linear-gradient(90deg, ${item.swatch[0]} 33%, ${item.swatch[1]} 33% 66%, ${item.swatch[2]} 66%)` }} />
              <span className="instrument-name">
                <b>{item.name}</b>
                <small>{item.plant}</small>
              </span>
            </button>
          )
        })}
      </div>

      <section className="instrument-card" aria-labelledby="instrument-title">
        <h2 id="instrument-title">
          {current.name} <small>→ {current.plant}</small>
        </h2>
        {current.about.map(line => (
          <p key={line}>{line}</p>
        ))}

        <h3>Cách chơi bằng tay</h3>
        <ol className="how-to">
          {current.howTo.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ol>

        {active ? (
          <div className="tutorial" data-testid="tutorial">
            <h3>Tập chơi {current.name}</h3>
            <ol>
              {steps.map((step, index) => (
                <li key={step.text} className={index < active.step ? 'done' : index === active.step ? 'current' : ''}>
                  <span aria-hidden="true">{index < active.step ? '✓' : index + 1}</span> {step.text}
                </li>
              ))}
            </ol>
            {finished ? <p className="tutorial-done">Tuyệt vời! Bạn đã chơi được {current.name}. Hãy nghe tác phẩm mẫu bên dưới.</p> : null}
            <button type="button" className="link-button" onClick={() => onTutorial(false)}>
              {finished ? 'Đóng' : 'Dừng tập'}
            </button>
          </div>
        ) : (
          <button type="button" className="practice" onClick={() => onTutorial(true)}>
            ✋ Tập chơi từng bước
          </button>
        )}

        <button type="button" className="lesson-start" onClick={() => onLesson(instrument)}>
          <span aria-hidden="true">🎼</span>
          <span>
            Tập đánh cả bài “{MELODIES[instrument].title}”
            <small>Trên sân khấu AR: nốt nào sáng vàng thì đánh nốt đó.</small>
          </span>
        </button>

        <button type="button" className="piece" onClick={() => onPiece(instrument)} aria-pressed={playingPiece === instrument}>
          <span aria-hidden="true">♫</span>
          <span>
            Nghe tác phẩm “{MELODIES[instrument].title}”
            <small>{PIECE_NOTE}</small>
          </span>
        </button>
      </section>
    </div>
  )
}

import type { ReplaySpeed, ReplayState } from './useReplay'

type Props = ReplayState & {
  onToggle: () => void
  onRestart: () => void
  onSpeed: (speed: ReplaySpeed) => void
  onClose: () => void
}

/** Controls shown over the canvas while an artwork replays. */
export function ReplayBar({ playing, finished, progress, speed, onToggle, onRestart, onSpeed, onClose }: Props) {
  return (
    <div className="replay-bar" role="group" aria-label="Điều khiển phát lại">
      <button type="button" onClick={onToggle} aria-label={playing ? 'Tạm dừng' : finished ? 'Xem lại' : 'Tiếp tục'}>
        {playing ? '❚❚' : '▶'}
      </button>
      <button type="button" onClick={onRestart} aria-label="Bắt đầu lại">
        ↺
      </button>
      <div className="replay-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Tiến độ phát lại">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="replay-label" data-testid="replay-state">
        {finished ? 'Phát lại xong' : playing ? 'Đang phát lại' : 'Tạm dừng'}
      </span>
      <button type="button" onClick={() => onSpeed(speed === 1 ? 2 : 1)} aria-label={`Tốc độ ${speed === 1 ? 2 : 1}×`}>
        {speed}×
      </button>
      <button type="button" onClick={onClose} aria-label="Thoát phát lại">
        ✕
      </button>
    </div>
  )
}

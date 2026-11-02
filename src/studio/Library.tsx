import type { Artwork } from '../storage/artworks'
import { SampleFlowerIcon } from './InstrumentIcons'

type Props = {
  artworks: Artwork[]
  samples: Artwork[]
  onOpenSample: (sample: Artwork) => void
  currentId: string
  unavailable: boolean
  onNew: () => void
  onOpen: (artwork: Artwork) => void
  onRename: (artwork: Artwork) => void
  onDelete: (artwork: Artwork) => void
}

const when = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Artworks saved on this device, plus curated traditional sample pieces. */
export function Library({ artworks, samples, onOpenSample, currentId, unavailable, onNew, onOpen, onRename, onDelete }: Props) {
  return (
    <div className="library" data-testid="library">
      <div className="library-header">
        <span className="section-label">THƯ VIỆN CỦA BẠN</span>
        <button type="button" className="library-new" onClick={onNew} title="Tạo một khu vườn mới hoàn toàn">
          ＋ Tác phẩm mới
        </button>
      </div>

      {unavailable && <p className="library-note">Thư viện không khả dụng trên trình duyệt này — vẫn vẽ và xuất PNG được.</p>}
      {artworks.length === 0 && !unavailable && <p className="library-empty">Chưa có khu vườn nào được lưu.</p>}

      {artworks.length > 0 && (
        <div className="library-list">
          {artworks.map(artwork => (
            <div className="library-row" key={artwork.id}>
              <button type="button" className={`library-item ${artwork.id === currentId ? 'selected' : ''}`} onClick={() => onOpen(artwork)} title={`Mở “${artwork.name}”`}>
                <span className="library-name">{artwork.name}</span>
                <small>
                  {artwork.strokes.length} nét · {when.format(artwork.updatedAt)}
                </small>
              </button>
              <button type="button" className="row-action" aria-label={`Đổi tên ${artwork.name}`} title="Đổi tên" onClick={() => onRename(artwork)}>
                ✎
              </button>
              <button type="button" className="row-action danger" aria-label={`Xóa ${artwork.name}`} title="Xóa" onClick={() => onDelete(artwork)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <span className="section-label library-samples">TÁC PHẨM MẪU</span>
      <div className="sample-grid">
        {samples.map(sample => (
          <button key={sample.id} type="button" className="sample-card" onClick={() => onOpenSample(sample)} title="Nghe tác phẩm và xem khu vườn mọc theo tiếng nhạc">
            <span className="sample-icon" aria-hidden="true">
              <SampleFlowerIcon size={24} />
            </span>
            <div className="sample-body">
              <span className="library-name">✿ {sample.name}</span>
              <small>{sample.strokes.length} nốt · Nghe mẫu</small>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

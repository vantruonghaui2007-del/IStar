import type { Artwork } from '../storage/artworks'

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

/** Artworks saved on this device. */
export function Library({ artworks, samples, onOpenSample, currentId, unavailable, onNew, onOpen, onRename, onDelete }: Props) {
  return (
    <div className="library" data-testid="library">
      <button type="button" className="palette" onClick={onNew}>
        ＋ Tác phẩm mới
      </button>
      {unavailable && <p className="palette-note">Thư viện không khả dụng trên trình duyệt này — vẫn vẽ và xuất PNG được.</p>}
      {artworks.map(artwork => (
        <div className="library-row" key={artwork.id}>
          <button type="button" className={`palette ${artwork.id === currentId ? 'selected' : ''}`} onClick={() => onOpen(artwork)} title={`Mở “${artwork.name}”`}>
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
      <span className="section-label library-samples">VƯỜN MẪU</span>
      {samples.map(sample => (
        <button key={sample.id} type="button" className="palette" onClick={() => onOpenSample(sample)} title="Mở một bản sao để xem, phát lại hoặc vẽ tiếp">
          <span className="library-name">✿ {sample.name}</span>
          <small>{sample.strokes.length} nét · mẫu</small>
        </button>
      ))}
    </div>
  )
}

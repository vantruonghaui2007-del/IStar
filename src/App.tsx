import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import './App.css'
import { MAX_POINTS, countPoints } from './artwork/editor'
import { PALETTES, PALETTE_IDS } from './artwork/palettes'
import { grownPlant } from './artwork/plant'
import { renderArtwork, type Cursor, type SceneItem } from './artwork/render'
import { CANVAS_HEIGHT, CANVAS_WIDTH, type PaletteId } from './artwork/types'
import { deleteArtwork, listArtworks, saveArtwork, type Artwork } from './storage/artworks'
import { CameraPreview } from './studio/CameraPreview'
import { EditorStore, useEditor } from './studio/editorStore'
import { GardenCanvas } from './studio/GardenCanvas'
import { PinchDemo } from './studio/PinchDemo'
import { StrokeInput } from './studio/strokeInput'
import { useHandTracking } from './studio/useHandTracking'
import { PinchController, type HandState } from './tracking/gesture'
import { isLowLight } from './tracking/light'
import type { HandSample } from './tracking/protocol'

const DEFAULT_NAME = 'Khu vườn chưa đặt tên'
const INTRO = 'Bấm Bắt đầu để bật camera, hoặc kéo chuột trên khu vườn để thử ngay.'
const newId = (): string => crypto.randomUUID()

const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export default function App() {
  const store = useMemo(() => new EditorStore(), [])
  const strokes = useEditor(store, state => state.strokes)
  const canRedo = useEditor(store, state => state.redo.length > 0)
  const drawing = useEditor(store, state => state.current !== null)
  const limitReached = useEditor(store, state => state.limitReached)

  const [palette, setPalette] = useState<PaletteId>('vuon-xuan')
  const paletteRef = useRef(palette)
  useEffect(() => {
    paletteRef.current = palette
  }, [palette])
  const input = useMemo(() => new StrokeInput(store, () => paletteRef.current), [store])
  const controller = useMemo(() => new PinchController(), [])

  const [notice, setNotice] = useState(INTRO)
  const [name, setName] = useState(DEFAULT_NAME)
  const [artworkId, setArtworkId] = useState(newId)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [hand, setHand] = useState<HandState>('absent')
  const [cameraHidden, setCameraHidden] = useState(false)

  const video = useRef<HTMLVideoElement>(null)
  const cursor = useRef<Cursor | null>(null)
  const lastSample = useRef<HandSample | null>(null)
  const sceneOverride = useRef<(() => SceneItem[] | null) | null>(null)
  const mouseDrawing = useRef(false)

  const onSample = useCallback(
    (sample: HandSample) => {
      lastSample.current = sample
      const update = controller.update(sample)
      update.events.forEach(input.handle)
      cursor.current = update.cursor ? { x: update.cursor.x * CANVAS_WIDTH, y: update.cursor.y * CANVAS_HEIGHT, drawing: update.state === 'drawing' } : null
      setHand(update.state)
    },
    [controller, input],
  )
  const tracking = useHandTracking(video, onSample)
  const cameraOn = tracking.status !== 'off'
  const handMode = tracking.status === 'ready'

  /** Ends whatever stroke is open (hand or mouse) and forgets the cursor. */
  const interrupt = useCallback(() => {
    controller.reset().forEach(input.handle)
    if (mouseDrawing.current) {
      mouseDrawing.current = false
      input.handle({ type: 'stroke-end', time: performance.now() })
    }
    cursor.current = null
    setHand('absent')
  }, [controller, input])

  const onFrame = useCallback(
    (now: number) => {
      const update = controller.tick(now)
      update.events.forEach(input.handle)
      if (update.events.length && !update.cursor) cursor.current = null
    },
    [controller, input],
  )

  const { pause, resume } = tracking
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        interrupt()
        pause()
      } else resume()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [interrupt, pause, resume])

  useEffect(() => {
    if (limitReached) setNotice(`Khu vườn đã đủ ${MAX_POINTS.toLocaleString('vi-VN')} điểm. Hãy lưu, xuất PNG hoặc tạo tác phẩm mới.`)
  }, [limitReached])

  // ——— Library & saving ———
  const refreshLibrary = useCallback(() => listArtworks().then(setArtworks), [])
  useEffect(() => {
    refreshLibrary().catch(() => setNotice('Không đọc được thư viện trên thiết bị này. Bạn vẫn vẽ và xuất PNG được.'))
  }, [refreshLibrary])

  const persist = useCallback(async () => {
    const now = Date.now()
    await saveArtwork({ id: artworkId, name: name.trim() || DEFAULT_NAME, createdAt: now, updatedAt: now, width: 1920, height: 1080, strokes })
    await refreshLibrary()
  }, [artworkId, name, strokes, refreshLibrary])

  useEffect(() => {
    if (!strokes.length) return
    const timer = window.setTimeout(() => {
      persist()
        .then(() => setNotice('Đã tự lưu tác phẩm trên thiết bị.'))
        .catch(() => setNotice('Không lưu được vào bộ nhớ. Tác phẩm vẫn ở trên màn hình — hãy xuất PNG.'))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [strokes, persist])

  const save = () =>
    persist()
      .then(() => setNotice('Đã lưu tác phẩm trên thiết bị này.'))
      .catch(() => setNotice('Không lưu được vào bộ nhớ. Bạn vẫn có thể xuất PNG.'))

  const openArtwork = (artwork: Artwork) => {
    interrupt()
    setArtworkId(artwork.id)
    setName(artwork.name)
    store.dispatch({ type: 'load', strokes: artwork.strokes })
    setNotice(`Đã mở “${artwork.name}”.`)
  }

  const newArtwork = () => {
    interrupt()
    setArtworkId(newId())
    setName(DEFAULT_NAME)
    store.dispatch({ type: 'clear' })
    setNotice('Khu vườn mới đã sẵn sàng.')
  }

  const removeArtwork = async (artwork: Artwork) => {
    if (!window.confirm(`Xóa “${artwork.name}” khỏi thiết bị? Không thể hoàn tác.`)) return
    await deleteArtwork(artwork.id)
    await refreshLibrary()
    if (artwork.id === artworkId) newArtwork()
  }

  // ——— Editing ———
  const undo = useCallback(() => store.dispatch({ type: 'undo' }), [store])
  const redo = useCallback(() => store.dispatch({ type: 'redo' }), [store])
  const startOver = () => {
    if (strokes.length && !window.confirm('Làm lại từ đầu? Mọi nét trên khu vườn này sẽ bị xóa.')) return
    interrupt()
    store.dispatch({ type: 'clear' })
    setNotice('Đã làm lại. Gieo nét đầu tiên nhé!')
  }

  const exportPng = () => {
    interrupt()
    const link = document.createElement('a')
    const slug = (name.trim() || 'khu-vuon').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
    link.download = `mua-net-ai-${slug || 'khu-vuon'}.png`
    link.href = renderArtwork(store.getState().strokes).toDataURL('image/png')
    link.click()
    setNotice('Đã xuất ảnh PNG 1920 × 1080.')
  }

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const key = event.key.toLowerCase()
      const mod = event.ctrlKey || event.metaKey
      if (mod && key === 'z' && !event.shiftKey) undo()
      else if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) redo()
      else if (!mod && key === 'f') toggleFullscreen()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, toggleFullscreen])

  // ——— Camera ———
  const startCamera = () => {
    setNotice('Đang mở camera và tải AI nhận diện tay…')
    void tracking.start()
  }
  const stopCamera = () => {
    interrupt()
    tracking.stop()
    setNotice('Camera đã tắt. Bạn có thể tiếp tục bằng chuột.')
  }
  useEffect(() => {
    if (tracking.status === 'ready') setNotice('Đưa tay vào khung, chụm ngón cái và ngón trỏ để vẽ; tách ngón để nở hoa.')
  }, [tracking.status])

  // ——— Mouse ———
  const toCanvas = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)), y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)) }
  }
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || hand === 'drawing') return
    event.currentTarget.setPointerCapture(event.pointerId)
    mouseDrawing.current = true
    input.handle({ type: 'stroke-start', point: toCanvas(event), time: performance.now() })
  }
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (mouseDrawing.current) input.handle({ type: 'stroke-move', point: toCanvas(event), time: performance.now() })
  }
  const pointerUp = () => {
    if (!mouseDrawing.current) return
    mouseDrawing.current = false
    input.handle({ type: 'stroke-end', time: performance.now() })
  }

  // ——— Labels ———
  const trackingLabel = { off: 'Camera đã tắt', loading: 'Đang tải AI', ready: 'AI đang nhận diện', error: 'AI gặp lỗi' }[tracking.status]
  const handLabel = !handMode ? 'Chế độ chuột' : { absent: 'Đưa tay vào khung', ready: 'Sẵn sàng', drawing: 'Đang vẽ' }[hand]
  const lowLight = handMode && tracking.stats?.luma != null && isLowLight(tracking.stats.luma)
  const garden = useMemo(() => {
    const plants = strokes.map(grownPlant)
    return { trees: plants.filter(plant => plant.segments.length > 0).length, leaves: plants.reduce((sum, plant) => sum + plant.leaves.length, 0), flowers: plants.filter(plant => plant.flower).length }
  }, [strokes])
  const points = countPoints(strokes)

  return (
    <main className="app" data-hand={handMode ? hand : 'mouse'}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <div>
            <b>Múa Nét AI</b>
            <small>MỖI NÉT VẼ LÀ MỘT MẦM SỐNG</small>
          </div>
        </div>
        <div className="top-status">
          <span className={`dot ${handMode ? 'live' : tracking.status === 'error' ? 'bad' : ''}`} />
          <span data-testid="tracking-status">{trackingLabel}</span>
          {cameraOn && tracking.stats && (
            <span className="stats" data-testid="ai-stats" title="Số lần AI nhận diện mỗi giây · thời gian xử lý một khung hình">
              {tracking.stats.detectionsPerSecond} lần/giây · {Math.round(tracking.stats.inferenceMs)} ms
            </span>
          )}
        </div>
        <button type="button" className="icon-button" onClick={toggleFullscreen} aria-label="Toàn màn hình" title="Toàn màn hình (F)">
          ⛶
        </button>
      </header>

      <section className="intro">
        <div>
          <span className="eyebrow">TRẢI NGHIỆM TƯƠNG TÁC · 01</span>
          <h1>Gieo mầm</h1>
          <p>Mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp.</p>
        </div>
        <PinchDemo />
        <button type="button" className="start" onClick={cameraOn ? stopCamera : startCamera}>
          {cameraOn ? 'Tắt camera' : 'Bắt đầu'} <span aria-hidden="true">↗</span>
        </button>
      </section>

      <div className="studio">
        <aside className="guide">
          <span className="section-label">CÁCH CHƠI</span>
          <ol className="steps">
            <li>
              <i>01</i>
              <div>
                <b>Đưa tay vào khung</b>
                <small>Bật camera, giữ cả bàn tay trong khung nét đứt.</small>
              </div>
            </li>
            <li>
              <i>02</i>
              <div>
                <b>Chụm ngón để vẽ</b>
                <small>Chạm ngón cái vào ngón trỏ rồi di chuyển. Đi chậm cho thân dày, nhanh cho cành mảnh.</small>
              </div>
            </li>
            <li>
              <i>03</i>
              <div>
                <b>Tách ngón để nở hoa</b>
                <small>Mỗi nét kết thúc bằng một bông hoa. Chụm tại chỗ để gieo một bông nhỏ.</small>
              </div>
            </li>
          </ol>
          <div className="hint" role="status" aria-live="polite">
            <span aria-hidden="true">✦</span>
            <span>{tracking.problem ?? (lowLight ? 'Ánh sáng hơi yếu — hãy bật thêm đèn hoặc quay mặt về phía nguồn sáng để AI thấy tay rõ hơn.' : notice)}</span>
            {tracking.problem && (
              <button type="button" onClick={tracking.retry}>
                Thử lại
              </button>
            )}
          </div>

          <span className="section-label">BẢNG MÀU</span>
          <div className="palettes">
            {PALETTE_IDS.map(id => (
              <button key={id} type="button" className={`palette ${id === palette ? 'selected' : ''}`} aria-pressed={id === palette} onClick={() => setPalette(id)}>
                <span className="swatches" style={{ background: `linear-gradient(90deg, ${PALETTES[id].stem} 33%, ${PALETTES[id].leaves[0]} 33% 66%, ${PALETTES[id].petals[0]} 66%)` }} />
                {PALETTES[id].name}
                {id === palette && <b aria-hidden="true">✓</b>}
              </button>
            ))}
          </div>
          <p className="palette-note">Bảng màu mới áp dụng cho những nét vẽ tiếp theo.</p>

          <div className="privacy">
            <span aria-hidden="true">♧</span>
            <span>Hình ảnh camera được AI xử lý ngay trên máy này — không tải lên máy chủ và không được lưu lại.</span>
          </div>

          <span className="section-label">THƯ VIỆN</span>
          <button type="button" className="palette" onClick={newArtwork}>
            ＋ Tác phẩm mới
          </button>
          {artworks.map(artwork => (
            <div className="library-row" key={artwork.id}>
              <button type="button" className={`palette ${artwork.id === artworkId ? 'selected' : ''}`} onClick={() => openArtwork(artwork)}>
                {artwork.name}
              </button>
              <button type="button" className="row-action" aria-label={`Xóa ${artwork.name}`} onClick={() => void removeArtwork(artwork)}>
                ×
              </button>
            </div>
          ))}
        </aside>

        <section className="art-area">
          <div className="art-top">
            <span>KHU VƯỜN CỦA BẠN</span>
            <span className="garden-stats" data-testid="garden-stats">
              {garden.trees} cây · {garden.leaves} lá · {garden.flowers} hoa
            </span>
            <span className={`mode ${hand}`} data-testid="hand-state">
              {handLabel}
            </span>
          </div>
          <div className="canvas-wrap">
            <GardenCanvas store={store} cursor={cursor} override={sceneOverride} onFrame={onFrame} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} />
            {strokes.length === 0 && !drawing && (
              <div className="canvas-caption">
                <span className="seed" aria-hidden="true">✳</span>
                <b>Khu vườn đang chờ bạn</b>
                <small>{handMode ? 'Chụm ngón cái và ngón trỏ để gieo nét đầu tiên' : 'Kéo chuột để gieo nét đầu tiên'}</small>
              </div>
            )}
            <CameraPreview video={video} sample={lastSample} handState={hand} visible={cameraOn} hidden={cameraHidden} onToggle={() => setCameraHidden(value => !value)} />
          </div>
          <div className="toolbar">
            <button type="button" onClick={undo} disabled={!strokes.length || drawing} title="Hoàn tác (Ctrl+Z)">
              ↶ <span>Hoàn tác</span>
            </button>
            <button type="button" onClick={redo} disabled={!canRedo || drawing} title="Khôi phục (Ctrl+Y)">
              ↷ <span>Khôi phục</span>
            </button>
            <button type="button" onClick={startOver} disabled={!strokes.length}>
              ⟲ <span>Làm lại</span>
            </button>
            <span className="toolbar-spacer" />
            <button type="button" className="save" onClick={() => void save()} disabled={!strokes.length}>
              ♡ <span>Lưu</span>
            </button>
            <button type="button" onClick={exportPng} disabled={!strokes.length}>
              ⇩ <span>Xuất PNG</span>
            </button>
          </div>
          <div className="name-row">
            <input aria-label="Tên tác phẩm" value={name} maxLength={80} onChange={event => setName(event.target.value)} />
            <span data-testid="point-count" className={points >= MAX_POINTS ? 'full' : ''}>
              {points.toLocaleString('vi-VN')} / {MAX_POINTS.toLocaleString('vi-VN')} điểm
            </span>
          </div>
        </section>
      </div>

      <footer>
        <span>
          Múa Nét AI <i>·</i> Gieo mầm
        </span>
        <span>AI nhận diện bàn tay: MediaPipe Hand Landmarker · Cây, lá, hoa: thuật toán tạo hình theo seed</span>
      </footer>
    </main>
  )
}

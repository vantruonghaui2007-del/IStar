import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import './App.css'
import { MAX_POINTS, countPoints } from './artwork/editor'
import { PALETTES, PALETTE_IDS } from './artwork/palettes'
import { grownPlant } from './artwork/plant'
import { renderArtwork, type Cursor, type SceneItem } from './artwork/render'
import { CANVAS_HEIGHT, CANVAS_WIDTH, type PaletteId } from './artwork/types'
import { ARTWORK_VERSION, ArtworkRepository, DEFAULT_ARTWORK_NAME, StorageError, type Artwork } from './storage/artworks'
import { Autosaver, type SaveState } from './storage/autosave'
import { CameraPreview } from './studio/CameraPreview'
import { EditorStore, useEditor } from './studio/editorStore'
import { GardenCanvas } from './studio/GardenCanvas'
import { Library } from './studio/Library'
import { PinchDemo } from './studio/PinchDemo'
import { ReplayBar } from './studio/ReplayBar'
import { StrokeInput } from './studio/strokeInput'
import { useHandTracking } from './studio/useHandTracking'
import { useReplay } from './studio/useReplay'
import { PinchController, type HandState } from './tracking/gesture'
import { isLowLight } from './tracking/light'
import type { HandSample } from './tracking/protocol'

const DEFAULT_NAME = DEFAULT_ARTWORK_NAME
const LAST_ARTWORK_KEY = 'mua-net-ai:last-artwork'
const INTRO = 'Bấm Bắt đầu để bật camera, hoặc kéo chuột trên khu vườn để thử ngay.'
const newId = (): string => crypto.randomUUID()

const repository = new ArtworkRepository()
const timeFormat = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
const remember = (id: string | null) => {
  try {
    if (id) localStorage.setItem(LAST_ARTWORK_KEY, id)
    else localStorage.removeItem(LAST_ARTWORK_KEY)
  } catch {
    // Private mode: the artwork simply isn't reopened next time.
  }
}
const recall = () => {
  try {
    return localStorage.getItem(LAST_ARTWORK_KEY)
  } catch {
    return null
  }
}
const storageMessage = (error: unknown) => (error instanceof StorageError ? error.message : new StorageError(error).message)

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
  const createdAt = useRef(Date.now())
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [libraryUnavailable, setLibraryUnavailable] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })
  const [hand, setHand] = useState<HandState>('absent')
  const [cameraHidden, setCameraHidden] = useState(false)

  const video = useRef<HTMLVideoElement>(null)
  const cursor = useRef<Cursor | null>(null)
  const lastSample = useRef<HandSample | null>(null)
  const sceneOverride = useRef<(() => SceneItem[] | null) | null>(null)
  const mouseDrawing = useRef(false)
  const replay = useReplay(sceneOverride)

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
  const refreshLibrary = useCallback(async () => {
    try {
      setArtworks(await repository.list())
      setLibraryUnavailable(false)
    } catch {
      setLibraryUnavailable(true)
    }
  }, [])

  const autosaver = useMemo(
    () =>
      new Autosaver<Artwork>(
        async artwork => {
          if (artwork.strokes.length) await repository.save(artwork)
          else await repository.remove(artwork.id)
          remember(artwork.strokes.length ? artwork.id : null)
          await refreshLibrary()
        },
        setSaveState,
        1000,
      ),
    [refreshLibrary],
  )
  const snapshot = useCallback(
    (): Artwork => ({ version: ARTWORK_VERSION, id: artworkId, name: name.trim() || DEFAULT_NAME, createdAt: createdAt.current, updatedAt: Date.now(), width: 1920, height: 1080, strokes }),
    [artworkId, name, strokes],
  )

  // Reopen the garden that was open last time (e.g. after an app update reload).
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    void (async () => {
      await refreshLibrary()
      const id = recall()
      if (!id) return
      try {
        const artwork = await repository.get(id)
        if (!artwork || store.getState().strokes.length) return
        setArtworkId(artwork.id)
        setName(artwork.name)
        createdAt.current = artwork.createdAt
        store.dispatch({ type: 'load', strokes: artwork.strokes })
        dirty.current = false
        setNotice(`Đã mở lại “${artwork.name}” từ lần trước.`)
      } catch {
        // Library unavailable: start with an empty garden.
      }
    })()
  }, [refreshLibrary, store])

  const dirty = useRef(false)
  useEffect(() => {
    if (!dirty.current) return
    autosaver.schedule(snapshot())
  }, [snapshot, autosaver])
  const markDirty = useCallback(() => {
    dirty.current = true
  }, [])
  useEffect(() => store.subscribe(markDirty), [store, markDirty])
  useEffect(() => {
    if (saveState.status === 'error') setNotice(storageMessage(saveState.error))
  }, [saveState])

  const renameCurrent = (value: string) => {
    dirty.current = true
    setName(value)
  }

  const save = async () => {
    autosaver.schedule(snapshot())
    await autosaver.flush()
  }

  const openArtwork = async (artwork: Artwork) => {
    replay.stop()
    interrupt()
    await autosaver.flush()
    setArtworkId(artwork.id)
    setName(artwork.name)
    createdAt.current = artwork.createdAt
    store.dispatch({ type: 'load', strokes: artwork.strokes })
    dirty.current = false
    remember(artwork.id)
    setSaveState({ status: 'saved', at: artwork.updatedAt })
    setNotice(`Đã mở “${artwork.name}”.`)
  }

  const newArtwork = async () => {
    replay.stop()
    interrupt()
    await autosaver.flush()
    setArtworkId(newId())
    setName(DEFAULT_NAME)
    createdAt.current = Date.now()
    store.dispatch({ type: 'clear' })
    dirty.current = false
    remember(null)
    setSaveState({ status: 'idle' })
    setNotice('Khu vườn mới đã sẵn sàng.')
  }

  const renameArtwork = async (artwork: Artwork) => {
    const next = window.prompt('Tên mới cho tác phẩm:', artwork.name)?.trim()
    if (!next || next === artwork.name) return
    if (artwork.id === artworkId) {
      renameCurrent(next)
      return
    }
    try {
      await repository.rename(artwork.id, next)
      await refreshLibrary()
    } catch (error) {
      setNotice(storageMessage(error))
    }
  }

  const removeArtwork = async (artwork: Artwork) => {
    if (!window.confirm(`Xóa “${artwork.name}” khỏi thiết bị? Không thể hoàn tác.`)) return
    try {
      if (artwork.id === artworkId) {
        autosaver.cancel()
        await repository.remove(artwork.id)
        await newArtwork()
      } else await repository.remove(artwork.id)
      await refreshLibrary()
      setNotice(`Đã xóa “${artwork.name}”.`)
    } catch (error) {
      setNotice(storageMessage(error))
    }
  }

  // ——— Replay ———
  const startReplay = () => {
    interrupt()
    pause()
    replay.start(store.getState().strokes)
    setNotice('Đang phát lại quá trình sáng tác. Camera không được dùng khi xem.')
  }
  const stopReplay = useCallback(() => {
    replay.stop()
    resume()
    setNotice('Đã thoát phát lại.')
  }, [replay, resume])

  // ——— Editing ———
  const undo = useCallback(() => {
    if (!sceneOverride.current) store.dispatch({ type: 'undo' })
  }, [store])
  const redo = useCallback(() => {
    if (!sceneOverride.current) store.dispatch({ type: 'redo' })
  }, [store])
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
      else if (replay.active && key === ' ') replay.toggle()
      else if (replay.active && key === 'escape') stopReplay()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, toggleFullscreen, replay, stopReplay])

  // ——— Camera ———
  const startCamera = () => {
    if (replay.active) stopReplay()
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
    if (event.button !== 0 || hand === 'drawing' || replay.active) return
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
          <Library
            artworks={artworks}
            currentId={artworkId}
            unavailable={libraryUnavailable}
            onNew={() => void newArtwork()}
            onOpen={artwork => void openArtwork(artwork)}
            onRename={artwork => void renameArtwork(artwork)}
            onDelete={artwork => void removeArtwork(artwork)}
          />
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
            {replay.active && <ReplayBar {...replay} onToggle={replay.toggle} onRestart={replay.restart} onSpeed={replay.setSpeed} onClose={stopReplay} />}
            <CameraPreview video={video} sample={lastSample} handState={hand} visible={cameraOn} hidden={cameraHidden} onToggle={() => setCameraHidden(value => !value)} />
          </div>
          <div className="toolbar">
            <button type="button" onClick={undo} disabled={!strokes.length || drawing || replay.active} title="Hoàn tác (Ctrl+Z)">
              ↶ <span>Hoàn tác</span>
            </button>
            <button type="button" onClick={redo} disabled={!canRedo || drawing || replay.active} title="Khôi phục (Ctrl+Y)">
              ↷ <span>Khôi phục</span>
            </button>
            <button type="button" onClick={startOver} disabled={!strokes.length || replay.active}>
              ⟲ <span>Làm lại</span>
            </button>
            <span className="toolbar-spacer" />
            <button type="button" onClick={replay.active ? stopReplay : startReplay} disabled={!strokes.length || drawing} title="Phát lại quá trình sáng tác">
              ▷ <span>{replay.active ? 'Thoát phát lại' : 'Phát lại'}</span>
            </button>
            <button type="button" className="save" onClick={() => void save()} disabled={!strokes.length}>
              ♡ <span>Lưu</span>
            </button>
            <button type="button" onClick={exportPng} disabled={!strokes.length}>
              ⇩ <span>Xuất PNG</span>
            </button>
          </div>
          <div className="name-row">
            <input aria-label="Tên tác phẩm" value={name} maxLength={80} onChange={event => renameCurrent(event.target.value)} />
            <span className={`save-state ${saveState.status === 'error' ? 'bad' : ''}`} data-testid="save-state">
              {{ idle: '', pending: 'Chờ lưu…', saving: 'Đang lưu…', saved: saveState.at ? `Đã lưu lúc ${timeFormat.format(saveState.at)}` : 'Đã lưu', error: 'Chưa lưu được' }[saveState.status]}
            </span>
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

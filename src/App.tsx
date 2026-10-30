import { useEffect, useRef, useState } from 'react'
import './App.css'
import { drawGarden, type Stroke, type Palette } from './artwork/draw'
import { deleteArtwork, listArtworks, saveArtwork, type Artwork } from './storage/artworks'
import { CameraPreview } from './studio/CameraPreview'
import { useHandTracking } from './studio/useHandTracking'
import { PinchController, type GestureEvent, type HandState, type Vec } from './tracking/gesture'
import type { HandSample } from './tracking/protocol'

const palettes: Record<string, Palette> = {
  'Vườn xuân': { stem: '#376747', leaf: '#82a96b', flower: '#d8796d', center: '#e8b85e' },
  'Hoàng hôn': { stem: '#594b48', leaf: '#8b8060', flower: '#dc8062', center: '#e9bd76' },
  'Đêm đom đóm': { stem: '#355b50', leaf: '#78a28a', flower: '#d8b5d3', center: '#e8cf72' },
}
const id = () => crypto.randomUUID()

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [artworkId, setArtworkId] = useState<string>(id())
  const [current, setCurrent] = useState<Stroke | null>(null)
  const [palette, setPalette] = useState('Vườn xuân')
  const [message, setMessage] = useState('Chọn Bắt đầu để bật camera hoặc vẽ bằng chuột.')
  const [name, setName] = useState('Khu vườn chưa đặt tên')
  const [playing, setPlaying] = useState(false)
  const controller = useRef(new PinchController())
  const paletteRef = useRef(palette)
  useEffect(() => { paletteRef.current = palette }, [palette])

  useEffect(() => { drawGarden(canvas.current, strokes, current, palettes[palette]) }, [strokes,current,palette])
  const [cursor, setCursor] = useState<Vec|null>(null)
  const [hand, setHand] = useState<HandState>('absent')
  /** Hand and mouse both draw through this one path (canvas-normalized points). */
  const strokeEvent = (event: GestureEvent) => {
    if (event.type === 'stroke-start') setCurrent({ id: id(), palette: paletteRef.current, seed: Math.random() * 1e9 | 0, points: [{ x: event.point.x * 1920, y: event.point.y * 1080, t: event.time }] })
    else if (event.type === 'stroke-move') setCurrent(s => s ? { ...s, points: [...s.points, { x: event.point.x * 1920, y: event.point.y * 1080, t: Math.max(event.time, s.points.at(-1)!.t + 1) }] } : s)
    else finish()
  }
  const lastSample = useRef<HandSample | null>(null)
  const [cameraHidden, setCameraHidden] = useState(false)
  const onSample = (sample: HandSample) => {
    lastSample.current = sample
    const update = controller.current.update(sample)
    update.events.forEach(strokeEvent)
    setCursor(update.cursor ? { x: update.cursor.x * 1920, y: update.cursor.y * 1080 } : null)
    setHand(update.state)
  }
  useEffect(() => {
    let raf = 0
    const tick = () => { controller.current.tick(performance.now()).events.forEach(strokeEvent); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })
  const tracking = useHandTracking(video, onSample)
  const camera = tracking.status !== 'off'
  const mode = tracking.status === 'ready' ? 'hand' : 'mouse'
  const trackingLabel = tracking.status==='ready'?'AI đang nhận diện':tracking.status==='loading'?'Đang tải AI':tracking.status==='error'?'AI gặp lỗi':camera?'Đang tải AI':'Camera đã tắt'
  const handLabel = mode==='mouse'?'Chế độ chuột':hand==='drawing'?'Đang vẽ':hand==='ready'?'Sẵn sàng':'Đưa tay vào khung'
  const { pause, resume } = tracking
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) { controller.current.reset().forEach(strokeEvent); setCursor(null); pause() } else resume()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  })
  useEffect(() => { void listArtworks().then(setArtworks).catch(()=>setMessage('Không thể đọc thư viện trên thiết bị này.')) }, [])
  useEffect(() => {
    if (!strokes.length) return
    const timer=window.setTimeout(()=>{
      const now=Date.now(); const artwork:Artwork={id:artworkId,name:name.trim()||'Khu vườn chưa đặt tên',createdAt:now,updatedAt:now,width:1920,height:1080,strokes}
      void saveArtwork(artwork).then(()=>listArtworks().then(setArtworks)).then(()=>setMessage('Đã tự lưu tác phẩm trên thiết bị.')).catch(()=>setMessage('Không thể lưu bộ nhớ. Tác phẩm vẫn còn trên màn hình; hãy xuất PNG.'))
    },1000)
    return ()=>window.clearTimeout(timer)
  },[strokes,name,artworkId])
  useEffect(() => {
    if (!playing) return
    const saved=[...strokes],origin=Math.min(...saved.flatMap(s=>s.points.map(p=>p.t))),start=performance.now()
    const timer=window.setInterval(()=>{
      const elapsed=(performance.now()-start)*.8,cutoff=origin+elapsed
      const completed:Stroke[]=[];let active:Stroke|null=null
      for(const stroke of saved){const points=stroke.points.filter(p=>p.t<=cutoff);if(points.length===stroke.points.length)completed.push(stroke);else if(points.length){active={...stroke,points};break}else break}
      setStrokes(completed);setCurrent(active)
      if(completed.length===saved.length){window.clearInterval(timer);setCurrent(null);setPlaying(false)}
    },30)
    return ()=>window.clearInterval(timer)
  }, [playing])
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r=e.currentTarget.getBoundingClientRect(); return {x:Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))} }
  const begin = (e: React.PointerEvent<HTMLCanvasElement>) => { if(playing||hand==='drawing')return; e.currentTarget.setPointerCapture(e.pointerId); strokeEvent({type:'stroke-start',point:point(e),time:performance.now()}) }
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if(current&&!playing&&e.currentTarget.hasPointerCapture(e.pointerId))strokeEvent({type:'stroke-move',point:point(e),time:performance.now()}) }
  const end = (e: React.PointerEvent<HTMLCanvasElement>) => { if(e.currentTarget.hasPointerCapture(e.pointerId))strokeEvent({type:'stroke-end',time:performance.now()}) }
  const finish = () => { setCurrent(active=>{if(active){setStrokes(previous=>previous.includes(active)?previous:[...previous,active]);setRedoStack([])}return null}) }
  const undo = () => { const last=strokes.at(-1);if(last){setStrokes(strokes.slice(0,-1));setRedoStack([...redoStack,last])} }
  const redo = () => { const next=redoStack.at(-1);if(next){setStrokes([...strokes,next]);setRedoStack(redoStack.slice(0,-1))} }
  const save = async () => { const now=Date.now();try{await saveArtwork({id:artworkId,name:name.trim()||'Khu vườn chưa đặt tên',createdAt:now,updatedAt:now,width:1920,height:1080,strokes});setArtworks(await listArtworks());setMessage('Đã lưu tác phẩm trên thiết bị này.')}catch{setMessage('Không thể lưu bộ nhớ. Bạn vẫn có thể xuất PNG.')} }
  const openArtwork=(artwork:Artwork)=>{setArtworkId(artwork.id);setStrokes(artwork.strokes);setRedoStack([]);setName(artwork.name);setMessage('Đã mở tác phẩm.')}
  const newArtwork=()=>{setArtworkId(id());setStrokes([]);setRedoStack([]);setName('Khu vườn chưa đặt tên')}
  const removeArtwork=async(artwork:Artwork)=>{if(window.confirm(`Xóa “${artwork.name}”?`)){await deleteArtwork(artwork.id);setArtworks(await listArtworks());if(artwork.id===artworkId)newArtwork()}}
  const cameraOn = () => { setMessage('Đang mở camera và tải AI nhận diện tay…'); void tracking.start() }
  const cameraOff = () => { controller.current.reset().forEach(strokeEvent); tracking.stop(); setHand('absent'); setCursor(null); setMessage('Camera đã tắt. Bạn có thể tiếp tục bằng chuột.') }
  const exportPng = () => { const c=document.createElement('canvas');c.width=1920;c.height=1080;drawGarden(c,strokes,null,palettes[palette]);const a=document.createElement('a');a.download='mua-net-ai.png';a.href=c.toDataURL('image/png');a.click() }
  const fullscreen = () => { if(document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen() }

  return <main className="app">
    <header><div className="brand"><span className="brand-mark">✳</span><div><b>Múa Nét AI</b><small>MỖI NÉT VẼ LÀ MỘT MẦM SỐNG</small></div></div><div className="top-status"><span className={camera?'live-dot':'offline-dot'} /><span data-testid="tracking-status">{trackingLabel}</span>{tracking.stats&&camera&&<span data-testid="ai-stats">{tracking.stats.detectionsPerSecond} lần/giây · {Math.round(tracking.stats.inferenceMs)} ms</span>}<span className="divider"/> <span className="offline-label">● Chưa chuẩn bị offline</span></div><button className="plain" onClick={fullscreen} aria-label="Toàn màn hình">⛶</button></header>
    <section className="intro"><div><span className="eyebrow">TRẢI NGHIỆM TƯƠNG TÁC · 01</span><h1>Gieo mầm</h1><p>Mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp.</p></div><button className="start" onClick={camera?cameraOff:cameraOn}>{camera?'Tắt camera':'Bắt đầu'} <span>↗</span></button></section>
    <div className="studio"><aside className="guide"><span className="section-label">CÁCH CHƠI</span><div className="step"><i>01</i><div><b>Đưa tay vào khung</b><small>Bật camera và đặt tay trước ống kính.</small></div></div><div className="step"><i>02</i><div><b>Chụm ngón để vẽ</b><small>Di chuyển để nuôi thân cây và cành.</small></div></div><div className="step"><i>03</i><div><b>Tách ngón để nở hoa</b><small>Mỗi nét kết thúc bằng một bông hoa.</small></div></div><div className="hint" role="status">✦ <span>{tracking.problem ?? message}</span>{(tracking.problem)&&<button onClick={tracking.retry}>Thử lại</button>}</div><label className="section-label palette-label">BẢNG MÀU</label>{Object.keys(palettes).map((p,i)=><button key={p} className={`palette ${p===palette?'selected':''}`} onClick={()=>setPalette(p)}><span className={`swatches swatch-${i}`}/>{p}{p===palette&&<b>✓</b>}</button>)}<div className="privacy">♧ <span>Hình ảnh camera được xử lý trên thiết bị, không tải lên máy chủ.</span></div><label className="section-label palette-label">THƯ VIỆN</label><button className="palette" onClick={newArtwork}>＋ Tác phẩm mới</button>{artworks.map(a=><div className="library-row" key={a.id}><button className="palette" onClick={()=>openArtwork(a)}>{a.name}</button><button aria-label={`Xóa ${a.name}`} onClick={()=>void removeArtwork(a)}>×</button></div>)}</aside>
    <section className="art-area"><div className="art-top"><span>KHU VƯỜN CỦA BẠN</span><span className="mode" data-testid="hand-state">{handLabel}</span></div><div className="canvas-wrap"><canvas ref={canvas} data-testid="art-canvas" data-cursor={cursor?`${Math.round(cursor.x)},${Math.round(cursor.y)}`:undefined} width={1920} height={1080} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label="Vùng vẽ khu vườn"/><div className="canvas-caption">{strokes.length===0&&!current&&<><span className="seed">✳</span><b>Khu vườn đang chờ bạn</b><small>Chạm và kéo để gieo nét đầu tiên</small></>}</div>{cursor&&<div className={`hand-cursor ${hand==='drawing'?'drawing':''}`} style={{left:`${cursor.x/19.2}%`,top:`${cursor.y/10.8}%`}}/>}<CameraPreview video={video} sample={lastSample} handState={hand} visible={camera} hidden={cameraHidden} onToggle={()=>setCameraHidden(h=>!h)}/></div><div className="toolbar"><button onClick={undo} disabled={!strokes.length}>↶ <span>Hoàn tác</span></button><button onClick={redo} disabled={!redoStack.length}>↷ <span>Làm lại</span></button><span className="toolbar-spacer"/><button onClick={()=>setPlaying(true)} disabled={!strokes.length||playing}>▷ <span>Phát lại</span></button><button className="save" onClick={()=>void save()}>♡ <span>Lưu</span></button><button onClick={exportPng}>⇩ <span>Xuất PNG</span></button></div><div className="name-row"><input aria-label="Tên tác phẩm" value={name} onChange={e=>setName(e.target.value)}/><span data-testid="point-count">{strokes.reduce((n,s)=>n+s.points.length,0).toLocaleString("vi-VN")} / 20.000 điểm</span></div></section></div>
    <footer><span>Múa Nét AI <i>·</i> Gieo mầm</span><span>* Offline sau khi tải tài nguyên trước trên trình duyệt này</span></footer>
  </main>
}

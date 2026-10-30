import { useEffect, useRef, useState } from 'react'
import './App.css'
import { drawGarden, type Stroke, type Palette } from './artwork/draw'
import { deleteArtwork, listArtworks, saveArtwork, type Artwork } from './storage/artworks'

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
  const [camera, setCamera] = useState(false)
  const [message, setMessage] = useState('Chọn Bắt đầu để bật camera hoặc vẽ bằng chuột.')
  const [mode, setMode] = useState<'mouse'|'hand'>('mouse')
  const [name, setName] = useState('Khu vườn chưa đặt tên')
  const [playing, setPlaying] = useState(false)
  const [trackingReady, setTrackingReady] = useState(false)
  const busy = useRef(false)
  const workerRef = useRef<Worker | null>(null)
  const pinchRef = useRef(false)
  const smoothRef = useRef<{x:number;y:number}|null>(null)

  useEffect(() => { drawGarden(canvas.current, strokes, current, palettes[palette]) }, [strokes,current,palette])
  useEffect(() => {
    if (!camera) return
    const worker = new Worker(new URL('./tracking/hand.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current=worker
    worker.onmessage=(event:MessageEvent)=>{
      const data=event.data
      if(data.type==='ready'){setTrackingReady(true);setMessage('Đưa tay vào khung rồi chụm ngón cái và ngón trỏ để vẽ.')}
      if(data.type==='error'){setMessage(`Không tải được model nhận diện: ${data.message}. Bạn vẫn có thể dùng chuột.`);setTrackingReady(false)}
      if(data.type==='result'){
        busy.current=false
        const landmarks=data.landmarks as {x:number;y:number}[]|null
        if(!landmarks){if(pinchRef.current){pinchRef.current=false;finish()}return}
        const palm=Math.hypot(landmarks[5].x-landmarks[17].x,landmarks[5].y-landmarks[17].y)
        if(palm<.025)return
        const ratio=Math.hypot(landmarks[4].x-landmarks[8].x,landmarks[4].y-landmarks[8].y)/palm
        const pinching=pinchRef.current?ratio<=.42:ratio<.28
        const x=(1-landmarks[8].x)*1920,y=landmarks[8].y*1080
        const prev=smoothRef.current;const smoothed=prev?{x:prev.x*.65+x*.35,y:prev.y*.65+y*.35}:{x,y};smoothRef.current=smoothed
        if(pinching&&!pinchRef.current){setCurrent({id:id(),palette,seed:Math.random()*1e9|0,points:[{...smoothed,t:performance.now()}]})}
        else if(pinching){setCurrent(s=>s?{...s,points:[...s.points,{...smoothed,t:performance.now()}]}:s)}
        else if(pinchRef.current)finish()
        pinchRef.current=pinching
      }
    }
    worker.postMessage({type:'init'})
    let raf=0,last=0
    const tick=(time:number)=>{if(!video.current?.paused&&video.current?.readyState===4&&time-last>50&&!busy.current){last=time;busy.current=true;createImageBitmap(video.current).then(bitmap=>worker.postMessage({type:'frame',bitmap,timestamp:time},[bitmap])).catch(()=>{busy.current=false})}raf=requestAnimationFrame(tick)}
    raf=requestAnimationFrame(tick)
    return ()=>{cancelAnimationFrame(raf);worker.postMessage({type:'close'});worker.terminate();workerRef.current=null;setTrackingReady(false);busy.current=false;pinchRef.current=false}
  },[camera])
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
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r=e.currentTarget.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*1920,y:(e.clientY-r.top)/r.height*1080,t:performance.now()} }
  const begin = (e: React.PointerEvent<HTMLCanvasElement>) => { if(playing)return; e.currentTarget.setPointerCapture(e.pointerId); setCurrent({id:id(),palette,seed:Math.random()*1e9|0,points:[point(e)]}) }
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if(current&&!playing){const p=point(e);setCurrent({...current,points:[...current.points,{...p,t:current.points.length?Math.max(p.t,current.points.at(-1)!.t+1):p.t}]})} }
  const finish = () => { setCurrent(active=>{if(active){setStrokes(previous=>[...previous,active]);setRedoStack([])}return null}) }
  const undo = () => { const last=strokes.at(-1);if(last){setStrokes(strokes.slice(0,-1));setRedoStack([...redoStack,last])} }
  const redo = () => { const next=redoStack.at(-1);if(next){setStrokes([...strokes,next]);setRedoStack(redoStack.slice(0,-1))} }
  const save = async () => { const now=Date.now();try{await saveArtwork({id:artworkId,name:name.trim()||'Khu vườn chưa đặt tên',createdAt:now,updatedAt:now,width:1920,height:1080,strokes});setArtworks(await listArtworks());setMessage('Đã lưu tác phẩm trên thiết bị này.')}catch{setMessage('Không thể lưu bộ nhớ. Bạn vẫn có thể xuất PNG.')} }
  const openArtwork=(artwork:Artwork)=>{setArtworkId(artwork.id);setStrokes(artwork.strokes);setRedoStack([]);setName(artwork.name);setMessage('Đã mở tác phẩm.')}
  const newArtwork=()=>{setArtworkId(id());setStrokes([]);setRedoStack([]);setName('Khu vườn chưa đặt tên')}
  const removeArtwork=async(artwork:Artwork)=>{if(window.confirm(`Xóa “${artwork.name}”?`)){await deleteArtwork(artwork.id);setArtworks(await listArtworks());if(artwork.id===artworkId)newArtwork()}}
  const cameraOn = async () => {
    if(!navigator.mediaDevices?.getUserMedia){setMessage('Trình duyệt không hỗ trợ camera. Bạn có thể dùng Chế độ chuột.');return}
    try { const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}}); if(video.current){video.current.srcObject=stream; await video.current.play()};setCamera(true);setMode('hand');setMessage('Camera đã bật. AI nhận diện tay sẽ sẵn sàng sau khi tải model.') }
    catch(e){setMessage(e instanceof Error && e.name==='NotAllowedError'?'Bạn chưa cấp quyền camera. Hãy cho phép trong trình duyệt rồi thử lại.':'Không thể mở camera (không có camera hoặc đang được ứng dụng khác sử dụng).')}
  }
  const exportPng = () => { const c=document.createElement('canvas');c.width=1920;c.height=1080;drawGarden(c,strokes,null,palettes[palette]);const a=document.createElement('a');a.download='mua-net-ai.png';a.href=c.toDataURL('image/png');a.click() }
  const fullscreen = () => { if(document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen() }

  return <main className="app">
    <header><div className="brand"><span className="brand-mark">✳</span><div><b>Múa Nét AI</b><small>MỖI NÉT VẼ LÀ MỘT MẦM SỐNG</small></div></div><div className="top-status"><span className={camera?'live-dot':'offline-dot'} />{camera?trackingReady?'AI đang nhận diện':'Đang tải AI':'Camera chưa bật'}<span className="divider"/> <span className="offline-label">● Chưa chuẩn bị offline</span></div><button className="plain" onClick={fullscreen} aria-label="Toàn màn hình">⛶</button></header>
    <section className="intro"><div><span className="eyebrow">TRẢI NGHIỆM TƯƠNG TÁC · 01</span><h1>Gieo mầm</h1><p>Mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp.</p></div><button className="start" onClick={camera?()=>{video.current?.srcObject&&((video.current.srcObject as MediaStream).getTracks().forEach(t=>t.stop()));setCamera(false);setMode('mouse');setMessage('Camera đã tắt. Bạn có thể tiếp tục bằng chuột.')}:cameraOn}>{camera?'Tắt camera':'Bắt đầu'} <span>↗</span></button></section>
    <div className="studio"><aside className="guide"><span className="section-label">CÁCH CHƠI</span><div className="step"><i>01</i><div><b>Đưa tay vào khung</b><small>Bật camera và đặt tay trước ống kính.</small></div></div><div className="step"><i>02</i><div><b>Chụm ngón để vẽ</b><small>Di chuyển để nuôi thân cây và cành.</small></div></div><div className="step"><i>03</i><div><b>Tách ngón để nở hoa</b><small>Mỗi nét kết thúc bằng một bông hoa.</small></div></div><div className="hint">✦ <span>{message}</span></div><label className="section-label palette-label">BẢNG MÀU</label>{Object.keys(palettes).map((p,i)=><button key={p} className={`palette ${p===palette?'selected':''}`} onClick={()=>setPalette(p)}><span className={`swatches swatch-${i}`}/>{p}{p===palette&&<b>✓</b>}</button>)}<div className="privacy">♧ <span>Hình ảnh camera được xử lý trên thiết bị, không tải lên máy chủ.</span></div><label className="section-label palette-label">THƯ VIỆN</label><button className="palette" onClick={newArtwork}>＋ Tác phẩm mới</button>{artworks.map(a=><div className="library-row" key={a.id}><button className="palette" onClick={()=>openArtwork(a)}>{a.name}</button><button aria-label={`Xóa ${a.name}`} onClick={()=>void removeArtwork(a)}>×</button></div>)}</aside>
    <section className="art-area"><div className="art-top"><span>KHU VƯỜN CỦA BẠN</span><span className="mode">{mode==='mouse'?'✥ Chế độ chuột':'◉ Chế độ bàn tay'}</span></div><div className="canvas-wrap"><canvas ref={canvas} width={1920} height={1080} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} aria-label="Vùng vẽ khu vườn"/><div className="canvas-caption">{strokes.length===0&&!current&&<><span className="seed">✳</span><b>Khu vườn đang chờ bạn</b><small>Chạm và kéo để gieo nét đầu tiên</small></>}</div><div className="camera-preview" hidden={!camera}><video ref={video} muted playsInline/><span>CAMERA · XỬ LÝ CỤC BỘ</span></div></div><div className="toolbar"><button onClick={undo} disabled={!strokes.length}>↶ <span>Hoàn tác</span></button><button onClick={redo} disabled={!redoStack.length}>↷ <span>Làm lại</span></button><span className="toolbar-spacer"/><button onClick={()=>setPlaying(true)} disabled={!strokes.length||playing}>▷ <span>Phát lại</span></button><button className="save" onClick={()=>void save()}>♡ <span>Lưu</span></button><button onClick={exportPng}>⇩ <span>Xuất PNG</span></button></div><div className="name-row"><input aria-label="Tên tác phẩm" value={name} onChange={e=>setName(e.target.value)}/><span>{strokes.reduce((n,s)=>n+s.points.length,0).toLocaleString()} / 20.000 điểm</span></div></section></div>
    <footer><span>Múa Nét AI <i>·</i> Gieo mầm</span><span>* Offline sau khi tải tài nguyên trước trên trình duyệt này</span></footer>
  </main>
}

import { useEffect, useRef, useState } from 'react'
import './App.css'
import { drawGarden, type Stroke, type Palette } from './artwork/draw'

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
  useEffect(() => {
    const saved = localStorage.getItem('mua-net-artwork')
    if (saved) try { const a = JSON.parse(saved); setStrokes(a.strokes); setName(a.name) } catch { /* ignore corrupt local draft */ }
  }, [])
  useEffect(() => {
    if (!playing) return
    const saved = [...strokes]; setStrokes([])
    let index = 0
    const timer = window.setInterval(() => { if (index >= saved.length) { window.clearInterval(timer); setPlaying(false); setStrokes(saved); return } setStrokes(saved.slice(0, ++index)) }, 700)
    return () => window.clearInterval(timer)
  }, [playing])
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r=e.currentTarget.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*1920,y:(e.clientY-r.top)/r.height*1080,t:performance.now()} }
  const begin = (e: React.PointerEvent<HTMLCanvasElement>) => { if(playing)return; e.currentTarget.setPointerCapture(e.pointerId); setCurrent({id:id(),palette,seed:Math.random()*1e9|0,points:[point(e)]}) }
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if(current) setCurrent({...current,points:[...current.points,point(e)]}) }
  const finish = () => { setCurrent(active=>{if(active)setStrokes(previous=>[...previous,active]);return null}) }
  const save = () => { try { localStorage.setItem('mua-net-artwork',JSON.stringify({name,strokes})); setMessage('Đã lưu tác phẩm trên thiết bị này.') } catch { setMessage('Không thể lưu bộ nhớ. Bạn vẫn có thể xuất PNG.') } }
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
    <div className="studio"><aside className="guide"><span className="section-label">CÁCH CHƠI</span><div className="step"><i>01</i><div><b>Đưa tay vào khung</b><small>Bật camera và đặt tay trước ống kính.</small></div></div><div className="step"><i>02</i><div><b>Chụm ngón để vẽ</b><small>Di chuyển để nuôi thân cây và cành.</small></div></div><div className="step"><i>03</i><div><b>Tách ngón để nở hoa</b><small>Mỗi nét kết thúc bằng một bông hoa.</small></div></div><div className="hint">✦ <span>{message}</span></div><label className="section-label palette-label">BẢNG MÀU</label>{Object.keys(palettes).map((p,i)=><button key={p} className={`palette ${p===palette?'selected':''}`} onClick={()=>setPalette(p)}><span className={`swatches swatch-${i}`}/>{p}{p===palette&&<b>✓</b>}</button>)}<div className="privacy">♧ <span>Hình ảnh camera được xử lý trên thiết bị, không tải lên máy chủ.</span></div></aside>
    <section className="art-area"><div className="art-top"><span>KHU VƯỜN CỦA BẠN</span><span className="mode">{mode==='mouse'?'✥ Chế độ chuột':'◉ Chế độ bàn tay'}</span></div><div className="canvas-wrap"><canvas ref={canvas} width={1920} height={1080} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} aria-label="Vùng vẽ khu vườn"/><div className="canvas-caption">{strokes.length===0&&!current&&<><span className="seed">✳</span><b>Khu vườn đang chờ bạn</b><small>Chạm và kéo để gieo nét đầu tiên</small></>}</div><div className="camera-preview" hidden={!camera}><video ref={video} muted playsInline/><span>CAMERA · XỬ LÝ CỤC BỘ</span></div></div><div className="toolbar"><button onClick={()=>{setStrokes(strokes.slice(0,-1));setCurrent(null)}} disabled={!strokes.length}>↶ <span>Hoàn tác</span></button><button onClick={()=>{setStrokes([]);setCurrent(null)}} disabled={!strokes.length}>↻ <span>Làm mới</span></button><span className="toolbar-spacer"/><button onClick={()=>setPlaying(true)} disabled={!strokes.length||playing}>▷ <span>Phát lại</span></button><button className="save" onClick={save}>♡ <span>Lưu</span></button><button onClick={exportPng}>⇩ <span>Xuất PNG</span></button></div><div className="name-row"><input aria-label="Tên tác phẩm" value={name} onChange={e=>setName(e.target.value)}/><span>{strokes.reduce((n,s)=>n+s.points.length,0).toLocaleString()} / 20.000 điểm</span></div></section></div>
    <footer><span>Múa Nét AI <i>·</i> Gieo mầm</span><span>* Offline sau khi tải tài nguyên trước trên trình duyệt này</span></footer>
  </main>
}

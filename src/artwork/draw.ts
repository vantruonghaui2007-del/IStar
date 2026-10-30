export type Point = { x: number; y: number; t: number }
export type Stroke = { id: string; palette: string; seed: number; points: Point[] }
export type Palette = { stem: string; leaf: string; flower: string; center: string }
const paletteBook:Record<string,Palette>={
  'Vườn xuân':{stem:'#376747',leaf:'#82a96b',flower:'#d8796d',center:'#e8b85e'},
  'Hoàng hôn':{stem:'#594b48',leaf:'#8b8060',flower:'#dc8062',center:'#e9bd76'},
  'Đêm đom đóm':{stem:'#355b50',leaf:'#78a28a',flower:'#d8b5d3',center:'#e8cf72'},
}

export function drawGarden(canvas: HTMLCanvasElement | null, strokes: Stroke[], current: Stroke | null, palette: Palette) {
  if (!canvas) return
  const ctx = canvas.getContext('2d'); if (!ctx) return
  const { width, height } = canvas; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#faf8f2'; ctx.fillRect(0,0,width,height)
  ctx.strokeStyle='#e9e5da';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,height*.82);ctx.bezierCurveTo(width*.3,height*.78,width*.7,height*.86,width,height*.81);ctx.stroke()
  for(const stroke of [...strokes,...(current?[current]:[])]) {
    const p=stroke.points;if(!p.length)continue;const colors=paletteBook[stroke.palette]??palette;ctx.strokeStyle=colors.stem;ctx.lineCap='round';ctx.lineJoin='round'
    if(p.length===1){ctx.beginPath();ctx.arc(p[0].x,p[0].y,5,0,Math.PI*2);ctx.fillStyle=colors.stem;ctx.fill()}
    else {for(let i=1;i<p.length;i++){ctx.beginPath();ctx.moveTo(p[i-1].x,p[i-1].y);const mid={x:(p[i-1].x+p[i].x)/2,y:(p[i-1].y+p[i].y)/2};ctx.quadraticCurveTo(p[i-1].x,p[i-1].y,mid.x,mid.y);ctx.lineWidth=Math.max(3,11-(p[i].t-p[i-1].t)/45);ctx.stroke()}}
    let distance=0,leaves=0;for(let i=1;i<p.length&&leaves<20;i++){const a=p[i-1],b=p[i],d=Math.hypot(b.x-a.x,b.y-a.y);distance+=d;if(distance>76){distance=0;const side=leaves%2?1:-1,angle=Math.atan2(b.y-a.y,b.x-a.x)+side*.85;const x=(a.x+b.x)/2,y=(a.y+b.y)/2;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.ellipse(0,0,22,9,0,0,Math.PI*2);ctx.fillStyle=colors.leaf;ctx.fill();ctx.restore();leaves++}}
    const end=p[p.length-1];ctx.fillStyle=colors.flower;for(let petal=0;petal<7;petal++){const angle=petal*Math.PI*2/7;ctx.beginPath();ctx.ellipse(end.x+Math.cos(angle)*10,end.y+Math.sin(angle)*10,8,5,angle,0,Math.PI*2);ctx.fill()}ctx.beginPath();ctx.arc(end.x,end.y,5,0,Math.PI*2);ctx.fillStyle=colors.center;ctx.fill()
  }
}

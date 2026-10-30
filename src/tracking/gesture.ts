export type NormalizedLandmark = { x:number; y:number; z?:number }
export type GestureState = { pinching:boolean; point:{x:number;y:number}|null }
export function handGesture(landmarks: NormalizedLandmark[] | null, wasPinching: boolean, previous: {x:number;y:number}|null): GestureState {
  if(!landmarks||landmarks.length<18||landmarks.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return {pinching:false,point:null}
  const palm=Math.hypot(landmarks[5].x-landmarks[17].x,landmarks[5].y-landmarks[17].y)
  if(palm<0.025)return {pinching:false,point:null}
  const ratio=Math.hypot(landmarks[4].x-landmarks[8].x,landmarks[4].y-landmarks[8].y)/palm
  const pinching=wasPinching?ratio<=0.42:ratio<0.28
  const x=1-landmarks[8].x,y=landmarks[8].y
  return {pinching,point:previous?{x:previous.x*.65+x*.35,y:previous.y*.65+y*.35}:{x,y}}
}

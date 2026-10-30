/// <reference lib="webworker" />
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

let landmarker: HandLandmarker | undefined
self.onmessage = async (event: MessageEvent) => {
  const data = event.data as { type: 'init'|'frame'|'close'; bitmap?: ImageBitmap; timestamp?: number }
  try {
    if(data.type==='init') {
      const vision=await FilesetResolver.forVisionTasks('/wasm')
      landmarker=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'/models/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:1})
      self.postMessage({type:'ready'});return
    }
    if(data.type==='close'){landmarker?.close();landmarker=undefined;return}
    if(data.bitmap&&landmarker){const result=landmarker.detectForVideo(data.bitmap,data.timestamp??performance.now());self.postMessage({type:'result',landmarks:result.landmarks[0]??null,timestamp:data.timestamp});data.bitmap.close()}
  } catch(error) { self.postMessage({type:'error',message:error instanceof Error?error.message:'Không tải được model nhận diện.'}) }
}
export {}

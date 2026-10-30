import { describe, expect, it } from 'vitest'
import { handGesture, type NormalizedLandmark } from './gesture'
function hand(distance:number): NormalizedLandmark[] { const p=Array.from({length:21},()=>({x:.5,y:.5}));p[5]={x:.4,y:.5};p[17]={x:.6,y:.5};p[4]={x:.5-distance/2,y:.5};p[8]={x:.5+distance/2,y:.5};return p }
describe('hand gesture',()=>{
 it('starts below pinch threshold and releases above hysteresis threshold',()=>{expect(handGesture(hand(.04),false,null).pinching).toBe(true);expect(handGesture(hand(.07),true,null).pinching).toBe(true);expect(handGesture(hand(.09),true,null).pinching).toBe(false)})
 it('smooths coordinates and mirrors horizontal direction',()=>{const result=handGesture(hand(.1),false,{x:.8,y:.2});expect(result.point?.x).toBeCloseTo(.6775);expect(result.point?.y).toBeCloseTo(.305)})
 it('stops immediately when hand is missing or invalid',()=>{expect(handGesture(null,true,null)).toEqual({pinching:false,point:null});expect(handGesture([{x:NaN,y:0}],true,null).pinching).toBe(false)})
})

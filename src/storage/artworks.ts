import type { Stroke } from '../artwork/draw'

export type Artwork = { id:string; name:string; createdAt:number; updatedAt:number; width:1920; height:1080; strokes:Stroke[] }
const DB='mua-net-ai', STORE='artworks', VERSION=1
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,VERSION);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
export async function saveArtwork(artwork:Artwork):Promise<void>{const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(artwork);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});db.close()}
export async function listArtworks():Promise<Artwork[]>{const db=await openDb();const rows=await new Promise<Artwork[]>((resolve,reject)=>{const request=db.transaction(STORE).objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result as Artwork[]);request.onerror=()=>reject(request.error)});db.close();return rows.sort((a,b)=>b.updatedAt-a.updatedAt)}
export async function deleteArtwork(id:string):Promise<void>{const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()}

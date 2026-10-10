import {createPredictiveRig} from './predictive-rig.mjs';
import {stepCBody,resolveCBodyOverlaps,shapeOverlaps} from './physics-c.mjs';
import {VISUAL_SCALE,PROJECTION_X_RATIO,topSupport} from './alpha-contact.mjs';
import {snapshotBody} from './state-adapter.mjs';
import {poseEnvelope,worldEnvelope,visibleEnvelope} from './envelope.mjs';
import {withCanvasScope} from './canvas-scope.mjs';
export const C_CONFIG=Object.freeze({width:1.28,height:1.24,visualScale:VISUAL_SCALE,projectionXRatio:PROJECTION_X_RATIO});
export const cEnabled=params=>params.get('render')==='compat'&&params.get('bird')==='benjiu-c';
export function createMemoryStorage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(String(k),String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear()};}
export function createCModeHost({enabled=true,manifest,images={},boundaries}){
 let epoch=0,tick=0,failed=null,visual=null,initialized=false,pending=false,lastFacts={},lastBody=null,contacts=[],contactAnchor=null,lastScale=null,geometryStamp=null,geometryChanged=false,resizePending=false,lastPlacement=null;
 const stamp=plats=>plats.map(f=>[f.x,f.y,f.w,f.h,f.active!==false,!!f.solid]).flat().join(',');
 const fail=(code,error)=>{if(!failed)failed={code,message:String(error?.message??error)};return false;};
 const ensure=p=>{snapshotBody(p);if(initialized&&lastBody!==p){initialized=false;pending=false;contactAnchor=null;contacts=[];lastFacts={};}if(lastScale!==null&&lastScale!==p.scale){contactAnchor=null;resizePending=true;}lastScale=p.scale;if(!initialized){visual=createPredictiveRig(manifest,images);visual.seed(p);initialized=true;}lastBody=p;};
 const fit=(p,platforms,pose)=>{
  if(pending&&contactAnchor)pose=visual.constrainHead(pose,contactAnchor);
  const bad=q=>platforms.some(f=>shapeOverlaps(p,f,q.layers,boundaries));
  if(bad(pose)){const held=visual.constrainHead(pose);if(!bad(held))pose=held;else {const joints=visual.constrainAccessories(held);if(!bad(joints))pose=joints;else p.trapped=true;}}
  // Animation sampling never relocates the physical player. Explicit resolve
  // handles external geometry/placement separately; idle growth is constrained.
  return pose;
 };
 const adapter={get layers(){return visual?.layers??[];},get pose(){return visual?.rig.pose??null;},get visual(){return visual?.visual??null;}};
 const host={enabled,storage:enabled?createMemoryStorage():null,adapter,
  resizeBody(p){if(enabled){if(lastBody===p&&lastScale!==p.scale)contactAnchor=null;p.w=1.28*p.scale;p.h=1.24*p.scale;}return p;},
  reset(){if(!enabled||failed)return;epoch++;tick=0;visual=null;initialized=false;pending=false;lastBody=null;lastFacts={};contacts=[];contactAnchor=null;lastScale=null;geometryStamp=null;geometryChanged=false;resizePending=false;lastPlacement=null;},
  step(p,input,platforms,dt,extra){if(failed)return p;try{ensure(p);geometryChanged=geometryStamp!==null&&stamp(platforms)!==geometryStamp;extra.visualFacts=lastFacts;const r=stepCBody(p,input,platforms,dt,extra,visual,boundaries);pending=true;contacts=r.contacts;contactAnchor=r.contacts.length?r.pose:null;return p;}catch(e){fail('physics-exception',e);return p;}},
  resolve(p,platforms,{reason='explicit-placement'}={}){if(failed)return false;try{
   ensure(p);geometryChanged=geometryChanged||(geometryStamp!==null&&stamp(platforms)!==geometryStamp);const pose=fit(p,platforms,visual.predict(p,0,lastFacts));visual.commit(pose);const overlaps=platforms.some(f=>shapeOverlaps(p,f,visual.layers,boundaries));
   const explicit=reason!=='post-mechanism'||geometryChanged||resizePending;const before={x:p.x,y:p.y};let moved=false;
   if(overlaps&&explicit)moved=resolveCBodyOverlaps(p,platforms,visual.layers,boundaries);else p.trapped=overlaps;
   lastPlacement={reason,geometryChanged,resize:resizePending,moved,before,after:{x:p.x,y:p.y},trapped:!!p.trapped};geometryStamp=stamp(platforms);resizePending=false;return moved;
  }catch(e){return fail('physics-exception',e);}},
  sample(facts){if(!enabled)return true;if(failed)return false;try{ensure(facts.body);const dt=pending?0:facts.dt??0;lastFacts={...facts,landing:pending?null:facts.landing};let pose=visual.predict(facts.body,dt,lastFacts);pose=fit(facts.body,facts.platforms??[],pose);visual.commit(pose);if(facts.endOfTick){pending=false;contactAnchor=null;}tick++;return true;}catch(e){return fail('pose-exception',e);}},
  draw(context,{body,x,y,unit,platforms=[],clipX=null,opacity=1}){if(!enabled||failed)return false;try{
   snapshotBody(body);if(!initialized)throw Error('Draw before sample');const e=poseEnvelope(visual.layers,manifest,body.facing);e.left*=PROJECTION_X_RATIO;e.right*=PROJECTION_X_RATIO;const full=worldEnvelope(e,body,VISUAL_SCALE),visible=visibleEnvelope(full,clipX);if(!visible)return {drawn:false,culled:true,envelope:full};
   // Guard severe disagreement, not subpixel AA rasterization. Kernel contact
   // remains at exact alpha>4 cell boundary with 1e-8 world tolerance.
   const tolerance=.006*body.scale;if(full.left<body.x-body.w/2-tolerance||full.right>body.x+body.w/2+tolerance||full.top>body.y+body.h+tolerance||full.bottom<body.y-tolerance)throw Error('Severe pose/body disagreement');
   for(const f of platforms){if(f.active===false||!f.solid)continue;const l=Math.max(f.x-f.w/2,clipX?.left??-Infinity),r=Math.min(f.x+f.w/2,clipX?.right??Infinity);if(l>=r)continue;const clipped={...f,x:(l+r)/2,w:r-l};if(shapeOverlaps(body,clipped,visual.layers,boundaries)){const s=topSupport(visual.layers,boundaries,body,l,r),depth=s?body.y+s.height-(f.y-(f.h||.55)):0;if(depth>tolerance&&body.y<f.y-tolerance)throw Error('Severe visible solid overlap');}}
   withCanvasScope(context,c=>visual.rig.draw(c,x,y,unit*body.scale*VISUAL_SCALE,{facing:body.facing,opacity:c.globalAlpha*opacity}));return {drawn:true,culled:false,envelope:full};
  }catch(e){return fail('draw-exception',e);}},fail,
  get failed(){return failed;},get status(){return {enabled,failed,epoch,tick,action:tick>0?(adapter.pose?.action?.state??null):null,progress:enabled?'browser-local-v2':null,collision:enabled?C_CONFIG:null};},get lastContacts(){return contacts;},get lastPlacement(){return lastPlacement;}
 };return host;
}
export async function createCMode(params){if(!cEnabled(params))return createCModeHost({enabled:false});const url=new URL('./assets/layers.json',import.meta.url),r=await fetch(url),br=await fetch(new URL('./alpha-boundaries.json',import.meta.url));if(!r.ok||!br.ok)throw Error('C geometry unavailable');const manifest=await r.json(),boundaries=await br.json(),images={};await Promise.all(Object.entries(manifest.assets).map(async([k,p])=>{const image=new Image();image.src=new URL(p,url).href;await image.decode();if(!image.naturalWidth)throw Error('C image unavailable');images[k]=image;}));return createCModeHost({manifest,images,boundaries});}

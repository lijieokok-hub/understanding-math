import {DESIGN} from './rig-predict.mjs';
export const VISUAL_SCALE=.985;
export const PROJECTION_X_RATIO=22/Math.sqrt(22*22+5*5);
const cache=new WeakMap();
export const contactStats={preparedPoses:0,transformedEdges:0,queries:0,queryCacheHits:0};
export function prepareUpperPose(layers,boundaries,p){
 let stored=cache.get(layers);if(!stored){stored=new Map();cache.set(layers,stored);}const key=p.scale+','+p.facing;if(stored.has(key))return stored.get(key);
 const k=p.scale*VISUAL_SCALE/DESIGN.pixelsPerWorld,kx=k*p.facing*PROJECTION_X_RATIO,segments=[],heads=[];let minX=Infinity,maxX=-Infinity;
 function transform(edges,m,to,part){const a=m[0]*kx,b=m[2]*kx,c=-m[1]*k,d=-m[3]*k,tx=(m[4]-DESIGN.centerX)*kx,ty=(DESIGN.footY-m[5])*k,det=a*d-b*c;
  for(const e of edges){if((-b*e[4]+a*e[5])/det<-1e-12)continue;let x0=a*e[0]+b*e[1]+tx,y0=c*e[0]+d*e[1]+ty,x1=a*e[2]+b*e[3]+tx,y1=c*e[2]+d*e[3]+ty;if(x0>x1){[x0,x1]=[x1,x0];[y0,y1]=[y1,y0];}to.push([x0,y0,x1,y1,part]);minX=Math.min(minX,x0);maxX=Math.max(maxX,x1);contactStats.transformedEdges++;}
 }
 for(const l of layers){if((l.opacity??1)<=0||l.clip)continue;const part=boundaries.parts[l.key];if(!part)throw Error('Missing boundary '+l.key);const at=segments.length;transform(part.full,l.m,segments,l.key);if(part.head===true)heads.push(...segments.slice(at));else if(part.head)transform(part.head,l.m,heads,l.key);}
 const pose={segments,heads,minX,maxX,queries:new Map()};stored.set(key,pose);contactStats.preparedPoses++;return pose;
}
function scan(segments,lo,hi){let best=null;for(const e of segments){if(e[2]<lo||e[0]>hi)continue;let y0=e[1],y1=e[3],x0=e[0],x1=e[2];if(x1>x0){const slope=(y1-y0)/(x1-x0);if(x0<lo){y0+=slope*(lo-x0);x0=lo;}if(x1>hi){y1-=slope*(x1-hi);x1=hi;}}if(!best||y0>best.height)best={height:y0,x:x0,part:e[4]};if(y1>best.height)best={height:y1,x:x1,part:e[4]};}return best;}
export function supportPair(layers,boundaries,p,left,right){
 const pose=prepareUpperPose(layers,boundaries,p),lo=left-p.x,hi=right-p.x;if(hi<pose.minX||lo>pose.maxX)return {full:null,head:null};const key=lo+','+hi;
 let result=pose.queries.get(key);if(result){contactStats.queryCacheHits++;}else{contactStats.queries++;result={full:scan(pose.segments,lo,hi),head:scan(pose.heads,lo,hi)};pose.queries.set(key,result);}
 // Cache local witnesses; translating the same pose must not return stale x.
 return {full:result.full&&{...result.full,x:result.full.x+p.x},head:result.head&&{...result.head,x:result.head.x+p.x}};
}
export function topSupport(layers,boundaries,p,left,right,{headOnly=false}={}){const pair=supportPair(layers,boundaries,p,left,right);return headOnly?pair.head:pair.full;}
export function upperContact(current,next,boundaries,before,after,f){
 const left=f.x-f.w/2,right=f.x+f.w/2,bottom=f.y-(f.h||.55),oldBottom=bottom-(f.dy||0),a=supportPair(current,boundaries,{...after,y:before.y},left,right),b=supportPair(next,boundaries,after,left,right);if(!a.full&&!b.full)return null;
 const useCurrent=!!a.full&&(!b.full||a.full.height>b.full.height),chosen=useCurrent?a:b,support=chosen.full;
 if(before.y+(a.full?.height??-Infinity)>oldBottom+1e-8)return {preexisting:true,support,useCurrent};if(after.y+support.height<bottom-1e-8)return null;
 return {support,useCurrent,footY:bottom-support.height,head:!!chosen.head&&Math.abs(chosen.head.height-support.height)<1e-7,witness:{x:support.x,y:bottom,part:support.part},bottom};
}
// Underside-cap helper only; caller must first check full body AABB overlap,
// active/solid flags and the upper-cap region (shapeOverlaps does that).
export function upperOverlap(layers,boundaries,p,f){const s=topSupport(layers,boundaries,p,f.x-f.w/2,f.x+f.w/2);return !!s&&p.y+s.height>f.y-(f.h||.55)+1e-8;}

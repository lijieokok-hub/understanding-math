// Actual visible support volumes and periodic images of the same cylinder.
// These are collision parts, never additional birds or mechanism states.
const parts=new WeakMap(),images=new WeakMap();
export function platformSupport(f){
 if(!f.pillar)return null;let part=parts.get(f);if(!part){part={source:f,part:'pillar',solid:true,collision:'solid',groundVolume:true};parts.set(f,part);}
 Object.assign(part,{x:f.x,y:f.y-f.h/2,w:f.w*.85,h:6,depth:1.75,active:f.active,dx:f.dx||0,dy:f.dy||0,main:f.main});return part;
}
export function collisionPlatforms(platforms,wrap=null,body=null){
 const result=[];for(const f of platforms){result.push(f);const support=platformSupport(f);if(support)result.push(support);}
 if(wrap&&body&&body.y<=wrap.rim&&body.y>=wrap.floor-.5&&body.x>=wrap.left-1&&body.x<=wrap.right+1){
  for(const f of platforms){if(!f.wrapSurface)continue;let pair=images.get(f);if(!pair){pair=[{},{}];images.set(f,pair);}for(let j=0;j<2;j++){Object.assign(pair[j],f,{x:f.x+(j?1:-1)*wrap.length,source:f,part:'periodic-image'});result.push(pair[j]);}}
 }
 return result;
}

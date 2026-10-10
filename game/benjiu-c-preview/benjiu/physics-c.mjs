// Isolated experimental C kernel. No public runtime currently imports this file.
// Native input/force constants are imported unchanged; C refines only the cap.
import {PHYSICS,approach,bodyOverlaps} from '../physics.mjs';
import {topSupport,upperContact,upperOverlap} from './alpha-contact.mjs';
const E=1e-8,bottom=f=>f.y-(f.h||.55),upperRegion=(p,f)=>bottom(f)>p.y+.4*p.scale;
const horizontal=(p,f)=>p.x+p.w/2>f.x-f.w/2+E&&p.x-p.w/2<f.x+f.w/2-E;
export function shapeOverlaps(p,f,layers,boundaries){
 if(!bodyOverlaps(p,f))return false;
 return upperRegion(p,f)?upperOverlap(layers,boundaries,p,f):true;
}
// Unified recovery for player spawn/resize/post-mechanism calls. The geometric
// candidate under a solid uses actual pose support, never the 1.24 empty cap.
export function resolveCBodyOverlaps(p,platforms,layers,boundaries){
 const solids=platforms.filter(f=>f.active!==false&&f.solid),bad=q=>solids.filter(f=>shapeOverlaps(q,f,layers,boundaries)),blockers=bad(p);p.trapped=false;if(!blockers.length)return false;
 const origin={x:p.x,y:p.y},seen=new Set(blockers);let chosen=null;
 for(let pass=0;pass<12;pass++){
  const xs=new Set([origin.x]),ys=new Set([origin.y]);for(const f of seen){xs.add(f.x-f.w/2-p.w/2);xs.add(f.x+f.w/2+p.w/2);ys.add(f.y);const s=topSupport(layers,boundaries,p,f.x-f.w/2,f.x+f.w/2);if(s)ys.add(bottom(f)-s.height);}
  const poses=[];for(const x of xs)for(const y of ys){const dx=x-origin.x,dy=y-origin.y;if(Math.abs(dx)+Math.abs(dy)<1e-10)continue;const under=dy<0&&blockers.some(f=>f.pillar||f.groundVolume);poses.push({x,y,cost:dx*dx+dy*dy+(under?10000:0)});}poses.sort((a,b)=>a.cost-b.cost);
  const count=seen.size;for(const q of poses){if(chosen&&q.cost>=chosen.cost)break;const collisions=bad({...p,...q});if(!collisions.length){chosen=q;break;}collisions.forEach(f=>seen.add(f));}if(seen.size===count)break;
 }
 if(!chosen){p.trapped=true;return false;}if(Math.abs(chosen.x-p.x)>E)p.vx=0;if(Math.abs(chosen.y-p.y)>E)p.vy=0;p.x=chosen.x;p.y=chosen.y;p.grounded=false;p.on=null;
 const support=platforms.find(f=>f.active!==false&&Math.abs(p.y-f.y)<E&&horizontal(p,f));if(support){p.grounded=true;p.on=support;p.flaps=1;}p.collisionRecovered=true;return true;
}
export function stepCBody(p,input,platforms,dt,extra={},visual,boundaries){
 const cfg=PHYSICS,unit=Math.sqrt(p.scale),before={...p};p.landed=null;
 if(input.jumpPressed)p.buffer=cfg.buffer;else p.buffer=Math.max(0,p.buffer-dt);
 if(p.grounded)p.coyote=cfg.coyote;else p.coyote=Math.max(0,p.coyote-dt);
 const oldGround=p.grounded,oldX=p.x,oldY=p.y;let jumped=false;
 if(p.buffer>0&&(p.grounded||p.coyote>0)){p.vy=cfg.jump*unit;p.grounded=false;p.coyote=0;p.buffer=0;jumped=true;p.on=null;extra.onJump?.('jump');}
 else if(input.jumpPressed&&p.flaps>0&&!p.grounded){p.vy=Math.max(p.vy,cfg.flap*unit);p.flaps--;p.buffer=0;jumped=true;extra.onJump?.('flap');}
 if(input.jumpReleased&&p.vy>3.2*unit)p.vy*=.52;
 const target=(input.axis||0)*cfg.maxSpeed*unit,force=extra.airForces;
 if(force&&!p.grounded){const ax=force.steer*(input.axis||0)-force.drag*p.vx+force.x;p.vx+=ax*dt;extra.onAcceleration?.({x:ax,y:force.y-cfg.gravity});}else p.vx=approach(p.vx,target,dt*(input.axis?(p.grounded?cfg.accel:cfg.airAccel):cfg.friction));
 if(input.axis)p.facing=input.axis>0?1:-1;
 if(p.on&&p.on.active!==false&&!jumped){p.x+=(p.on.dx||0);p.y+=(p.on.dy||0);}
 p.vy+=(force&&!p.grounded?force.y-cfg.gravity:-cfg.gravity)*dt;p.x+=p.vx*dt+(extra.wind||0)*dt;
 const prediction=()=>visual.predict(p,dt,{...extra.visualFacts,animationVX:p.vx+(extra.wind||0),...(p.landed?{landing:{incomingVY:before.vy,scaleAtImpact:before.scale}}:{})});let pose=null;const getPose=()=>pose??=prediction();
 for(const f of platforms){if(f.active===false||!f.solid||p.y>=f.y-E||p.y+p.h<=bottom(f)+E)continue;
  const left=f.x-f.w/2,right=f.x+f.w/2,pl=left-(f.dx||0),pr=right-(f.dx||0);
  if(!upperRegion(p,f)){
   if(oldX+p.w/2<=pl+E&&p.x+p.w/2>left){p.x=left-p.w/2;p.vx=0;pose=null;}else if(oldX-p.w/2>=pr-E&&p.x-p.w/2<right){p.x=right+p.w/2;p.vx=0;pose=null;}
  }else if(horizontal(p,f)){
   // Only true visible-cap intersections can block under-board traversal.
   const next=getPose(),over=x=>{const q={...p,x};return upperOverlap(visual.layers,boundaries,q,f)||upperOverlap(next.layers,boundaries,q,f);};
   if(over(p.x)&&!over(oldX)&&Math.abs(p.x-oldX)>E){let lo=0,hi=1;for(let j=0;j<20;j++){const t=(lo+hi)/2;if(over(oldX+(p.x-oldX)*t))hi=t;else lo=t;}p.x=oldX+(p.x-oldX)*lo;p.vx=0;pose=null;}
  }
 }
 p.y+=p.vy*dt;p.grounded=false;p.on=null;pose=null;
 for(const f of platforms){if(f.active===false||extra.ignoreLanding?.(f,p)||!horizontal(p,f))continue;const previousTop=f.y-(f.dy||0),relativeY=p.y-oldY-(f.dy||0);
  if(relativeY<=E&&oldY>=previousTop-.12&&p.y<=f.y+E){p.y=f.y;p.vy=0;p.grounded=true;p.flaps=1;p.on=f;if(!oldGround||f!==extra.previousPlatform)p.landed=f;}
 }
 pose=prediction();
 // Pose enlargement is not physical travel. Before testing the upward sweep,
 // reject unsafe parent/crest enlargement at the old foot plane; otherwise a
 // new taller jump pose could force feet through the floor and make recovery
 // choose the roof top. Foot/gaze/wing local updates still come from this tick.
 const base={...p,y:p.grounded?p.y:oldY};
 const unsafeAtBase=q=>platforms.some(f=>upperRegion(base,f)&&shapeOverlaps(base,f,q.layers,boundaries));
 if(unsafeAtBase(pose)){const held=visual.constrainHead(pose);if(!unsafeAtBase(held))pose=held;}
 let selected=null;
 if(p.vy>0)for(const f of platforms){if(f.active===false||!f.solid||!horizontal(p,f)||p.y+p.h<bottom(f)-E||oldY>=f.y-E)continue;const hit=upperContact(visual.layers,pose.layers,boundaries,before,p,f);if(hit&&!hit.preexisting&&(!selected||hit.footY<selected.hit.footY))selected={f,hit};}
 let constrained=false,contacts=[];
 if(selected){const {f,hit}=selected,anchor=hit.useCurrent?null:pose;p.vy=0;let final=prediction();final=visual.constrainHead(final,anchor);const support=topSupport(final.layers,boundaries,p,f.x-f.w/2,f.x+f.w/2);p.y=bottom(f)-support.height;pose=final;constrained=true;
  const head=topSupport(pose.layers,boundaries,p,f.x-f.w/2,f.x+f.w/2,{headOnly:true});contacts.push({platform:f,head:!!head&&Math.abs(head.height-support.height)<E,witness:{x:support.x,y:bottom(f),part:support.part},blankBox:false,finalHeadGap:head?bottom(f)-p.y-head.height:null});
 }
 const bad=layers=>platforms.filter(f=>shapeOverlaps(p,f,layers,boundaries));let blockers=bad(pose.layers);
 if(blockers.length){const held=visual.constrainHead(pose);if(!bad(held.layers).length){pose=held;constrained=true;blockers=[];}}
 if(blockers.length){
  // Normal motion never asks the global placement solver to choose a different
  // side of a solid. Restrict only conflicting pose freedoms, then clip actual
  // intended travel to the first contact on the old->new position segment.
  let held=visual.constrainHead(pose);const atOld=q=>platforms.some(f=>shapeOverlaps({...p,x:oldX,y:oldY},f,q.layers,boundaries));
  if(atOld(held))held=visual.constrainAccessories(held);
  if(!atOld(held)){
   pose=held;constrained=true;const tx=p.x,ty=p.y;let lo=0,hi=1;
   for(let j=0;j<24;j++){const t=(lo+hi)/2,q={...p,x:oldX+(tx-oldX)*t,y:oldY+(ty-oldY)*t};if(platforms.some(f=>shapeOverlaps(q,f,pose.layers,boundaries)))hi=t;else lo=t;}
   p.x=oldX+(tx-oldX)*lo;p.y=oldY+(ty-oldY)*lo;if(Math.abs(tx-p.x)>E)p.vx=0;if(Math.abs(ty-p.y)>E)p.vy=0;
   const support=platforms.find(f=>f.active!==false&&Math.abs(p.y-f.y)<E&&horizontal(p,f));p.grounded=!!support;p.on=support??null;if(support)p.flaps=1;blockers=bad(pose.layers);
  }
 }
 // Impossible externally changed geometry is reported as trapped. Only explicit
 // spawn/resize/post-mechanism recovery may call resolveCBodyOverlaps.
 if(blockers.length)p.trapped=true;
 visual.commit(pose);
 for(const c of contacts){const s=topSupport(pose.layers,boundaries,p,c.platform.x-c.platform.w/2,c.platform.x+c.platform.w/2,{headOnly:true});c.finalHeadGap=s?bottom(c.platform)-p.y-s.height:null;if(c.head&&Math.abs(c.finalHeadGap??Infinity)<1e-7)extra.onHeadHit?.(c.platform,c);}
 return {body:p,contacts,constrained,pose,blockers};
}

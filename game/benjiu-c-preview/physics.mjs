export const PHYSICS={gravity:27,jump:11.8,flap:9.1,maxSpeed:7.4,accel:51,airAccel:31,friction:47,coyote:.12,buffer:.14,step:1/120};
export const approach=(a,b,d)=>a<b?Math.min(b,a+d):Math.max(b,a-d);
export function bodyAt(x=2,y=0){return {x,y,vx:0,vy:0,w:.68,h:1.24,scale:1,grounded:false,coyote:0,buffer:0,flaps:1,facing:1,on:null,jumpWas:false,landed:null};}
export function setScale(p,s){p.scale=s;p.w=.68*s;p.h=1.24*s;}
export function stepBody(p,input,platforms,dt,extra={}){
 const cfg=PHYSICS,unit=Math.sqrt(p.scale);p.landed=null;
 if(input.jumpPressed)p.buffer=cfg.buffer;else p.buffer=Math.max(0,p.buffer-dt);
 if(p.grounded)p.coyote=cfg.coyote;else p.coyote=Math.max(0,p.coyote-dt);
 const oldGround=p.grounded,oldX=p.x,oldY=p.y;
 let jumped=false;
 if(p.buffer>0&&(p.grounded||p.coyote>0)){p.vy=cfg.jump*unit;p.grounded=false;p.coyote=0;p.buffer=0;jumped=true;p.on=null;extra.onJump?.('jump');}
 else if(input.jumpPressed&&p.flaps>0&&!p.grounded){p.vy=Math.max(p.vy,cfg.flap*unit);p.flaps--;p.buffer=0;jumped=true;extra.onJump?.('flap');}
 if(input.jumpReleased&&p.vy>3.2*unit)p.vy*=.52;
 const target=(input.axis||0)*cfg.maxSpeed*unit;
 const force=extra.airForces;
 if(force&&!p.grounded){const ax=force.steer*(input.axis||0)-force.drag*p.vx+force.x;p.vx+=ax*dt;extra.onAcceleration?.({x:ax,y:force.y-cfg.gravity});}
 else p.vx=approach(p.vx,target,dt*(input.axis?(p.grounded?cfg.accel:cfg.airAccel):cfg.friction));
 if(input.axis)p.facing=input.axis>0?1:-1;
 if(p.on&&p.on.active!==false&&!jumped){p.x+=(p.on.dx||0);p.y+=(p.on.dy||0);}
 p.vy+=(force&&!p.grounded?force.y-cfg.gravity:-cfg.gravity)*dt;p.x+=p.vx*dt+(extra.wind||0)*dt;
 for(const f of platforms){if(f.active===false||!f.solid)continue;const left=f.x-f.w/2,right=f.x+f.w/2,bottom=f.y-(f.h||.55),previousLeft=left-(f.dx||0),previousRight=right-(f.dx||0);
  if(p.y+p.h>bottom+1e-8&&p.y<f.y-1e-8){
   if(oldX+p.w/2<=previousLeft+1e-8&&p.x+p.w/2>left){p.x=left-p.w/2;p.vx=0;}
   else if(oldX-p.w/2>=previousRight-1e-8&&p.x-p.w/2<right){p.x=right+p.w/2;p.vx=0;}
  }
 }
 p.y+=p.vy*dt;p.grounded=false;p.on=null;
 for(const f of platforms){if(f.active===false||extra.ignoreLanding?.(f,p))continue;const left=f.x-f.w/2,right=f.x+f.w/2;if(p.x+p.w/2<=left+1e-8||p.x-p.w/2>=right-1e-8)continue;
  const previousTop=f.y-(f.dy||0),relativeY=p.y-oldY-(f.dy||0);
  if(relativeY<=1e-8&&oldY>=previousTop-.12&&p.y<=f.y+1e-8){p.y=f.y;p.vy=0;p.grounded=true;p.flaps=1;p.on=f;if(!oldGround||f!==extra.previousPlatform)p.landed=f;}
  else if(f.solid){const bottom=f.y-(f.h||.55),previousBottom=bottom-(f.dy||0);if(relativeY>0&&oldY+p.h<=previousBottom+1e-8&&p.y+p.h>=bottom){const hitUp=p.vy>0;p.y=bottom-p.h;p.vy=Math.min(0,p.vy);if(hitUp)extra.onHeadHit?.(f);}}
 }
 resolveBodyOverlaps(p,platforms);
 return p;
}

// Positive-volume intersections only. Shared by physics, immediate resize/spawn
// placement and end-of-tick validation after mechanisms change their geometry.
export function bodyOverlaps(p,f,epsilon=1e-8){return f.active!==false&&f.solid&&p.x+p.w/2>f.x-f.w/2+epsilon&&p.x-p.w/2<f.x+f.w/2-epsilon&&p.y+p.h>f.y-(f.h||.55)+epsilon&&p.y<f.y-epsilon;}
export function resolveBodyOverlaps(p,platforms){
 const blockers=platforms.filter(f=>bodyOverlaps(p,f));p.trapped=false;if(!blockers.length)return false;const solids=platforms.filter(f=>f.active!==false&&f.solid);
 const origin={x:p.x,y:p.y},seen=new Set(blockers);let chosen=null;
 for(let pass=0;pass<12;pass++){
  const xs=new Set([origin.x]),ys=new Set([origin.y]);for(const f of seen){xs.add(f.x-f.w/2-p.w/2);xs.add(f.x+f.w/2+p.w/2);ys.add(f.y);ys.add(f.y-(f.h||.55)-p.h);}
  const poses=[];for(const x of xs)for(const y of ys){const dx=x-origin.x,dy=y-origin.y;if(Math.abs(dx)+Math.abs(dy)<1e-10)continue;const underGround=dy<0&&blockers.some(f=>f.pillar||f.groundVolume);poses.push({x,y,cost:dx*dx+dy*dy+(underGround?10000:0)});}poses.sort((a,b)=>a.cost-b.cost);
  const before=seen.size;let best=null;
  for(const pose of poses){if(best&&pose.cost>=best.cost)break;const candidate={...p,x:pose.x,y:pose.y},bad=solids.filter(f=>bodyOverlaps(candidate,f));if(!bad.length)best=pose;else bad.forEach(f=>seen.add(f));}
  if(best)chosen=best;if(seen.size===before)break;

 }
 if(!chosen){p.trapped=true;return false;}
 if(Math.abs(chosen.x-p.x)>1e-9)p.vx=0;if(Math.abs(chosen.y-p.y)>1e-9)p.vy=0;p.x=chosen.x;p.y=chosen.y;p.grounded=false;p.on=null;
 const support=platforms.find(f=>f.active!==false&&Math.abs(p.y-f.y)<1e-8&&p.x+p.w/2>f.x-f.w/2+1e-8&&p.x-p.w/2<f.x+f.w/2-1e-8);
 if(support){p.grounded=true;p.on=support;p.flaps=1;}p.collisionRecovered=true;return true;
}

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function snapshotBody(p){
 const q={};for(const k of ['x','y','vx','vy','w','h','scale','facing']){q[k]=p[k];if(!Number.isFinite(q[k]))throw new Error('Nonfinite body '+k);}
 if(q.scale<=0||q.w<=0||q.h<=0)throw new Error('Invalid body dimensions');
 q.grounded=!!p.grounded;q.flaps=p.flaps;return Object.freeze(q);
}
export function captureLanding(before,p){return p.landed?Object.freeze({incomingVY:before.vy,scaleAtImpact:before.scale,grounded:!!p.grounded}):null;}
export function initialVisualState(epoch=0){return {epoch,tick:-1,time:0,expression:'idle',expressionAge:99,eventId:0,event:null,body:null};}
// Only scalar facts from completed real game ticks enter this reducer. It never
// owns the player's velocity, jump timing, grace timers or physics callbacks.
export function reduceVisualState(previous,facts){
 const {epoch,tick,dt=0}=facts;
 if(!Number.isInteger(tick)||tick<0||!Number.isFinite(dt)||dt<0||dt>.05)throw new Error('Invalid sample clock');
 const old=previous?.epoch===epoch?previous:initialVisualState(epoch);
 if(tick<=old.tick)return old;
 const body=snapshotBody(facts.body),next={...old,tick,time:old.time+dt,expressionAge:old.expressionAge+dt,body};
 if(facts.respawn){next.expression='recover';next.expressionAge=0;next.event='fall';next.eventId++;}
 else if(facts.solved){next.expression='insight';next.expressionAge=0;}
 else if(facts.headHit){next.expression='question';next.expressionAge=0;}
 if(next.expressionAge>2.1)next.expression='idle';
 const motionVX=facts.animationVX??body.vx;if(!Number.isFinite(motionVX))throw new Error('Nonfinite effective speed');
 const impact=facts.landing?clamp(Math.abs(facts.landing.incomingVY)/(12*Math.sqrt(facts.landing.scaleAtImpact)),.15,1):undefined;
 next.input={delta:dt,time:next.time,speed:clamp(Math.abs(motionVX)/(7.4*Math.sqrt(body.scale))),verticalSpeed:body.vy/Math.sqrt(body.scale),flying:!body.grounded,facing:body.facing,reducedMotion:!!facts.reducedMotion,state:next.expression,expressionAge:next.expressionAge,event:next.event,eventId:next.eventId,impact,anticipation:0,gliding:false};
 return next;
}


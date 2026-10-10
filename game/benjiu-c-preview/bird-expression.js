// Only explicit game facts may request an expression. No random or idle-time inference.
const DURATIONS={question:1.5,insight:1.8,solved:2.2},PRIORITY={question:1,insight:2,solved:3};
export function createBirdExpression(){let active=null,pending=null,time=0,serial=0,seen=new Set(),last={question:-Infinity,insight:-Infinity,solved:-Infinity};
 return {
  reset(){active=pending=null;seen.clear();last={question:-Infinity,insight:-Infinity,solved:-Infinity};},
  request(state,token){if(!DURATIONS[state]||seen.has(token))return false;seen.add(token);if(state!=='solved'&&time-last[state]<4)return false;if(active&&PRIORITY[active.state]>PRIORITY[state])return false;const event={state,age:0,duration:DURATIONS[state],id:++serial};last[state]=time;
   if(!active)active=event;else if(!pending||PRIORITY[state]>=PRIORITY[pending.state])pending=event;return true;},
  advance(dt){time+=dt;if(!active)return;active.age+=dt;if(active.age>=active.duration){active=pending;pending=null;}},
  sample(locomotion='idle'){return {state:active?.state||locomotion,locomotion,expressionAge:active?.age||0,expressionDuration:active?.duration,eventId:active?.id||0};},
  get active(){return active?{...active}:null;}
 };
}

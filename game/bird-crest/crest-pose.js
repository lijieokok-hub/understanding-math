/** Renderer-independent, deterministic expression timeline. All times are seconds. */
export const CREST_DURATIONS = Object.freeze({question:1.5,insight:1.8,solved:2.2});
export const CREST_STATES = Object.freeze(['idle','moving','flutter','question','insight','solved']);
export const clamp = (x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth = (a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*t*(t*(t*6-15)+10);};
const expressions=new Set(['question','insight','solved']);
/** Pure sampling; no random triggers, timer, wall clock, or physics side effects. */
export function sampleCrestPose({state='idle',time=0,expressionAge=0,expressionDuration,locomotion='idle',flying=false,reducedMotion=false}={}){
  if(!CREST_STATES.includes(state))state='idle';
  const active=expressions.has(state),duration=Math.max(.7,expressionDuration??CREST_DURATIONS[state]??1);
  const age=Math.max(0,expressionAge),expired=active&&age>=duration;
  if(expired)state='idle';
  const expression=expressions.has(state),enter=state==='question'?.32:.28,exit=state==='solved'?.48:.34;
  const shape=expression?(reducedMotion?1:smooth(0,enter,age)*(1-smooth(duration-exit,duration,age))):0;
  const flight=flying||locomotion==='flutter'||state==='flutter';
  // Two gentle swings in the insight entrance, at most 3.4 degrees; no perpetual oscillation.
  const gesture=state==='insight'&&age<1.1?Math.sin(age/1.1*Math.PI*4)*Math.pow(1-age/1.1,1.7)*.059:0;
  const idleSway=Math.sin(time*2.0)*.018+(flight?Math.sin(time*3.3)*.008:0);
  const sway=reducedMotion?0:idleSway*(1-shape)+gesture*shape;
  const pulseProgress=state==='solved'&&!reducedMotion?clamp((age-.28)/1.22):null;
  const pulseEnvelope=state==='solved'&&!reducedMotion?smooth(.20,.38,age)*(1-smooth(1.40,1.66,age)):0;
  return {state,locomotion,age,duration,shape,sway,question:state==='question'?shape:0,
    upright:state==='insight'||state==='solved'?shape:0,dot:shape,
    glow:reducedMotion?0:(state==='insight'?.13*shape:state==='solved'?.09*shape:0),
    pulseProgress,pulseEnvelope,reducedMotion,expired};
}
/** Optional state holder for asset previews. Games can pass event fields straight into update(). */
export function createCrestTimeline(){
  let state='idle',started=0,duration,eventId=null;
  return {
    setState(next,{time=0,expressionDuration,eventId:id}={}){
      if(!CREST_STATES.includes(next))throw new RangeError(`Unknown crest state: ${next}`);
      if(id!==undefined&&id===eventId)return false;
      state=next;started=time;duration=expressionDuration;eventId=id??null;return true;
    },
    sample(input={}){return sampleCrestPose({...input,state:input.state??state,
      expressionAge:input.expressionAge??Math.max(0,(input.time??0)-started),
      expressionDuration:input.expressionDuration??duration});},
    get state(){return state;},get eventId(){return eventId;}
  };
}

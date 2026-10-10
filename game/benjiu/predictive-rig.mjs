import {createAdventureRig} from './rig-predict.mjs';import {initialVisualState,reduceVisualState} from './state-adapter.mjs';
const mul=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
function inverse(m){const d=m[0]*m[3]-m[1]*m[2];return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
export function createPredictiveRig(manifest,images={}){
 const rig=createAdventureRig(manifest,images);let visual=initialVisualState(1);
 function predict(body,dt,facts={}){const next=reduceVisualState(visual,{...facts,epoch:1,tick:visual.tick+1,body,dt});const before=rig.saveState();if(facts.landing)rig.update({...next.input,delta:0,flying:false,verticalSpeed:0});rig.update(next.input);const state=rig.saveState();rig.restoreState(before);return {layers:state.layers,state,visual:next,constrained:false};}
 return {rig,predict,commit(prediction){rig.restoreState(prediction.state);visual=prediction.visual;},
  constrainHead(prediction,anchor){
   // Restrain only the parent body tilt/breath deformation and crest joint.
   // Keep next feet, wing joint motion, gaze/blink/mouth, all clocks and physical
   // x/y. Eye local motion is reparented, never frozen with the body matrix.
   const old=anchor?.state??rig.saveState(),oldBody=old.layers.find(l=>l.key==='body').m,newBody=prediction.layers.find(l=>l.key==='body').m,correction=mul(oldBody,inverse(newBody));
   const layers=prediction.layers.map(l=>l.key.startsWith('foot')?l:l.key==='crest'?old.layers.find(o=>o.key==='crest'):{...l,m:mul(correction,l.m),...(l.clipMatrix?{clipMatrix:mul(correction,l.clipMatrix)}:{})});
   return {...prediction,layers,constrained:true,state:{...prediction.state,layers,lastInput:{...prediction.state.lastInput,contactConstrained:['body-parent-deformation','crest-joint']}}};
  },constrainAccessories(prediction){
   const old=rig.saveState(),keys=new Set(['wingFar','wingNear','strap','beakUpper','beakLower']);const layers=prediction.layers.map(l=>keys.has(l.key)?old.layers.find(o=>o.key===l.key):l);
   return {...prediction,layers,constrained:true,state:{...prediction.state,layers}};
  },get layers(){return rig.layers;},get visual(){return visual;},seed(body){this.commit(predict(body,0));}};
}

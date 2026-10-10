import {createMotionDirector} from './motion-predict.mjs';
// Fixed painted layers + continuous bones. This is explicitly 2.5D, not a 3D mesh.
export const DESIGN={footY:1240,centerX:660,pixelsPerWorld:1100};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const I=()=>[1,0,0,1,0,0];
const mul=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
const T=(x,y)=>[1,0,0,1,x,y],S=(x,y=x)=>[x,0,0,y,0,0],R=a=>[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0];
export const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
function anchored(x,y,ax,ay,scale,angle=0,sy=scale){return mul(mul(mul(T(x,y),R(angle)),S(scale,sy)),T(-ax,-ay));}

export function createAdventureRig(manifest,images){
  let time=0,gazeX=0,gazeY=0,crestAngle=0,crestVelocity=0,flight=0,headLag=0,previousGround=true,landingAge=99,turn=1;
  let layers=[],lastInput={};const motion=createMotionDirector();
  function layer(key,m,extra={}){return {key,m,...extra};}
  function update(input={}){
    const dt=clamp(input.delta??1/60,0,.05);time=input.time??time+dt;
    const speed=clamp(Math.abs(input.speed??0)),flying=!!input.flying,ground=!flying,reduced=!!input.reducedMotion;
    if(ground&&!previousGround)landingAge=0;else landingAge+=dt;previousGround=ground;
    const blend=1-Math.exp(-dt*14);flight+=(Number(flying)-flight)*blend;turn=input.facing??turn;
    const action=motion.update(input,dt);
    const state=input.state??'idle',age=input.expressionAge??0;
    const e=state==='question'||state==='insight'?(smooth(0,.18,age)*(1-smooth(1.65,2.1,age))):0;
    const question=state==='question'?e:0,joy=state==='insight'?e:0;
    const desiredX=input.lookX??(question?-.30:.50),desiredY=input.lookY??(action.automaticGazeY??(question?-.65:-.05));
    gazeX+=(clamp(desiredX,-1,1)-gazeX)*blend;gazeY+=(clamp(desiredY,-1,1)-gazeY)*blend;headLag+=(-gazeX*.007+gazeY*.008-headLag)*(1-Math.exp(-dt*4));
    const step=action.stride,settle=0;
    const breath=reduced?0:Math.sin(time*2.0)*.004;
    const bob=-action.bodyY;
    const bodyAngle=action.bodyTilt+question*.035-joy*.023+headLag;
    const bodyM=mul(mul(mul(T(680,1140-bob),R(bodyAngle)),S(action.scaleX-breath*.2,action.scaleY+breath)),T(-680,-1140));
    const headM=bodyM;
    const flap=reduced?0:Math.sin(time*16);
    const nearWingAngle=action.wingNear-(reduced?0:Math.sin(time*1.5)*.018)+joy*.32+question*.10;
    const farWingAngle=action.wingFar+joy*.25;
    const targetCrest=(reduced?0:-bodyAngle*1.8+Math.sin(time*1.7)*.035)+question*.13-joy*.09+action.crestImpulse;
    if(reduced){crestAngle=targetCrest;crestVelocity=0;}else{crestVelocity+=(targetCrest-crestAngle)*80*dt;crestVelocity*=Math.exp(-dt*9);crestAngle+=crestVelocity*dt;}
    const blinkPhase=time%12,blink=reduced?0:Math.max(action.blinkBias,...[1.03,4.40,7.35,11.25].map(t=>smooth(t,t+.085,blinkPhase)*(1-smooth(t+.115,t+.24,blinkPhase))));
    const mouth=clamp(input.mouth??(.05+joy*.62+flight*.15+question*.08));
    layers=[];
    // Feet are independent from the breathing body. Every planted foot solves
    // its real alpha outline to the common design baseline, never bbox-stacks.
    for(const [name,x,srcx,srcy,scale,phase] of [['footRear',535,231,588,.37,Math.PI],['footNear',887,580,589,.43,0]]){
      const lift=flying?action.footLift:(reduced?0:Math.max(0,Math.sin(step+phase))*speed*45);
      const angle=flying?action.footAngle:(reduced?0:Math.sin(step+phase)*speed*.17);
      let m=anchored(x,1158,srcx,srcy,scale*(1+settle*.7),angle,scale*(1-settle*.25)),maxY=-Infinity;
      for(const p of manifest.parts[name].outline)maxY=Math.max(maxY,point(m,...p)[1]);
      m[5]+=DESIGN.footY-maxY-lift;layers.push(layer(name,m));
    }
    layers.push(layer('wingFar',mul(bodyM,anchored(1145,764,658,180,.43*action.farWingScale,farWingAngle))));
    layers.push(layer('body',bodyM));
    // The wing rotates underneath a separately stationary harness, not with it.
    layers.push(layer('wingNear',mul(bodyM,anchored(580,707,432,158,.79*action.nearWingScale,nearWingAngle))));
    layers.push(layer('strap',mul(bodyM,anchored(618,800,1155,1067,.73,action.strapAngle))));
    layers.push(layer('crest',mul(headM,anchored(827,202,1168,397,.82,crestAngle))));
    // Both eyes track one common target; the far projection has smaller travel.
    const eyeDefs=[['near',846+gazeX*13,463+gazeY*11,.35,.38,[810,459,100,75,-.045]],['far',1078+gazeX*7,465+gazeY*10,.203,.324,[1065,459,41,72,-.10]]];
    for(const [side,x,y,sx,sy,clip]of eyeDefs){layers.push(layer('iris',mul(headM,anchored(x,y,1055,664,sx,0,sy)),{clip,clipMatrix:headM,opacity:1}));
      if(blink>.005){const near=side==='near';
        // One opaque painted lid with a curved opening, not a dissolve.
        // The opening shrinks continuously; iris and sclera remain underneath.
        const hole=[clip[0],clip[1],clip[2],clip[3]*(1-blink),clip[4]];
        layers.push(layer(near?'lidNear':'lidFar',mul(headM,anchored(near?808:1067,near?455:457,near?263:661,1030,near?.49:.31)),{clip,hole,clipMatrix:headM,opacity:1}));
      }
    }

    // Real articulated upper/lower bill. Same painted parts at every frame.
    const upper=mul(headM,anchored(983,515,254,586,-.326,0,.326));
    layers.push(layer('cavityInterior',mul(headM,anchored(986,554+mouth*12,1060,700,.98,0,.38+mouth*.22)),{clip:[986,554+mouth*12,59,9+mouth*24,0],clipMatrix:headM,opacity:mouth>.001?1:0}));
    layers.push(layer('beakLower',mul(headM,anchored(983,550+mouth*24,670,663,.32,0,.085+mouth*.18))));
    layers.push(layer('beakUpper',upper));
    lastInput={time,ground,flight,blink,mouth,state,speed,turn,landingAge,action};
    return layers;
  }
  function bounds(){let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    for(const l of layers){if((l.opacity??1)<.01)continue;if(l.clip)continue;for(const p of manifest.parts[l.key].outline){const q=point(l.m,...p);const x=(q[0]-DESIGN.centerX)*turn,y=q[1]-DESIGN.footY;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
    return {left:left/DESIGN.pixelsPerWorld,right:right/DESIGN.pixelsPerWorld,top:-top/DESIGN.pixelsPerWorld,bottom:-bottom/DESIGN.pixelsPerWorld};
  }
  function draw(ctx,x,footY,pixelsPerWorld=200,{facing=turn,opacity=1}={}){
    const scale=pixelsPerWorld/DESIGN.pixelsPerWorld;
    ctx.save();ctx.translate(x,footY);ctx.scale(scale*facing,scale);ctx.translate(-DESIGN.centerX,-DESIGN.footY);ctx.globalAlpha=opacity;
    for(const l of layers){const part=manifest.parts[l.key],image=images[part.asset],r=part.rect;ctx.save();ctx.globalAlpha*=l.opacity??1;
      if(l.clip){const c=l.clip;ctx.transform(...l.clipMatrix);ctx.beginPath();ctx.ellipse(c[0],c[1],c[2],c[3],c[4],0,Math.PI*2);ctx.clip();if(l.hole&&l.hole[3]>.01){const h=l.hole;ctx.beginPath();ctx.rect(h[0]-h[2]-20,h[1]-c[3]-20,h[2]*2+40,c[3]*2+40);ctx.ellipse(h[0],h[1],h[2],h[3],h[4],0,Math.PI*2);ctx.clip('evenodd');}const m=l.clipMatrix;const det=m[0]*m[3]-m[1]*m[2];ctx.transform(m[3]/det,-m[1]/det,-m[2]/det,m[0]/det,(m[2]*m[5]-m[3]*m[4])/det,(m[1]*m[4]-m[0]*m[5])/det);}
      ctx.transform(...l.m);ctx.drawImage(image,r[0],r[1],r[2]-r[0],r[3]-r[1],r[0],r[1],r[2]-r[0],r[3]-r[1]);ctx.restore();}
    ctx.restore();
  }
  return {update,draw,bounds,get pose(){return lastInput},get layers(){return layers},saveState:()=>({time,gazeX,gazeY,crestAngle,crestVelocity,flight,headLag,previousGround,landingAge,turn,layers,lastInput,motionState:motion.saveState()}),restoreState:s=>{({time,gazeX,gazeY,crestAngle,crestVelocity,flight,headLag,previousGround,landingAge,turn,layers,lastInput}=s);motion.restoreState(s.motionState);}};
}

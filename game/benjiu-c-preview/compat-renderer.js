import {PROJECTION_X_RATIO} from './benjiu/alpha-contact.mjs';
import {withCanvasScope} from './benjiu/canvas-scope.mjs';
import {shadowContactBody,UPPER_LANE_BOTTOM} from './shadow-track.mjs';
import {platformSupport} from './platform-collision.mjs';
import {drawVector} from './vector-world.js';
import {drawPermutation} from './permutation-world.js';
/** Canvas presentation adapter. All simulation, colliders, input and level rules remain in game.js/physics.mjs. */
import {Vector3,Color} from './vendor/three.module.js';
import {BIRD_ATLAS} from './art/bird-atlas-meta.js';
import {createCrestCanvasRenderer} from './bird-crest/crest-canvas.js';
import {CREST_ATLAS} from './bird-crest/atlas/crest-atlas-meta.js';
import {brushOutline,INK_COLOR} from './brush-art.mjs';
import {contour,worldPalette,sceneryInlays,sceneryFeatures} from './world-art.mjs';
import {drawAnalysisWorld} from './analysis-worlds.js';
import {drawDerivative} from './derivative-world.js';
import {drawAE} from './ae-world.js';
import {drawExpansionWorld} from './expansion-worlds.js';
import {drawBaseWorld} from './mirror-composition-worlds.js';
import {drawArithmetic} from './arithmetic-worlds.js';
import {drawWrap,wrapPreview} from './wrap-world.js';
import {birdContactPose,wrapBirdDomain} from './bird-contact.mjs';
const css=n=>'#'+new Color(n).getHexString();
export class CompatibilityRenderer {
 constructor({getState,getLanguage}){
  this.getState=getState;this.getLanguage=getLanguage;this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d',{alpha:false});if(!this.ctx)throw new Error('Canvas 2D is unavailable');this.shadowMap={};this.ratio=1;this.width=innerWidth;this.height=innerHeight;this.point=new Vector3();this.platformCache=new Map();this.inkCache=new Map();this.clockCache=new Map();this.textCache=new Map();this.sceneKey=null;this.atlas=new Image();this.atlas.src=new URL('art/bird-atlas.png',document.baseURI).href;this.logo=new Image();this.logo.src=new URL('favicon.svg',document.baseURI).href;this.meta=BIRD_ATLAS;this.crestBody=new Image();this.crestBody.src=new URL('bird-crest/atlas/body-atlas.png',document.baseURI).href;this.crestImage=new Image();this.crestImage.src=new URL('bird-crest/atlas/crest-atlas.png',document.baseURI).href;this.crestDrawing=createCrestCanvasRenderer({bodyImage:this.crestBody,crestImage:this.crestImage,meta:CREST_ATLAS});
  this.badge=document.createElement('div');this.badge.id='compatBadge';this.badge.setAttribute('role','status');document.querySelector('#app').appendChild(this.badge);
 }
 setPixelRatio(v){this.ratio=Math.min(v,1);}
 setSize(w,h){this.width=w;this.height=h;this.domElement.width=Math.round(w*this.ratio);this.domElement.height=Math.round(h*this.ratio);this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';}
 project(x,y,z=0){this.point.set(x,y,z).project(this.camera);return [(this.point.x+1)*this.width/2,(1-this.point.y)*this.height/2];}
 path(points,fill,stroke=null,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 render(scene,camera){
  this.camera=camera;camera.updateMatrixWorld();const g=this.getState();this.cMode=g.cMode;if(!g.L)return;this.occluders=g.collisionPlats||g.plats;this.shadowPlatforms=g.state.shadowSurfaces||[];this.upperLaneBottom=g.L.kind==='shadow'?UPPER_LANE_BOTTOM:null;this.wrapDomain=g.L.kind==='wrap'&&wrapBirdDomain(g.p,g.state.wrap)?g.state.wrap:null;this.reduced=!!g.reduced;this.expression=g.expression;this.night=g.levelIndex===7;const c=this.ctx,w=this.width,h=this.height,night=g.levelIndex===7;c.setTransform(this.ratio,0,0,this.ratio,0,0);c.clearRect(0,0,w,h);this.unit=w/(camera.right-camera.left);const badgeText=this.cMode?.enabled?(this.getLanguage()?'New bird preview · progress lasts only in this page':'新形象试玩 · 进度仅本页'):(this.getLanguage()?'Compatibility view · baked 3D bird':'兼容画面 · 三维小鸟烘焙动画');if(this.badge.textContent!==badgeText)this.badge.textContent=badgeText;
  const sceneKey=g.levelIndex+'_'+w+'_'+h;if(sceneKey!==this.sceneKey){this.sceneKey=sceneKey;this.platformCache.clear();this.inkCache.clear();this.clockCache.clear();this.textCache.clear();this.prepareBackground(g,night);}if(this.lastPlats!==g.plats||this.lastPlatsLength!==g.plats.length){this.lastPlats=g.plats;this.lastPlatsLength=g.plats.length;this.orderedPlats=[...g.plats].sort((a,b)=>a.y-b.y);}
  c.drawImage(this.sky,0,0);
  for(const layer of this.mountains){const offset=g.reduced?0:-((camera.position.x*layer.par*this.unit)%layer.period);c.drawImage(layer.canvas,offset,0);}
  c.save();c.strokeStyle=night?'#b7c9b330':'#668d7040';c.lineWidth=1;for(let i=0;i<(['period','inverse','scale'].includes(g.L.kind)?3:0);i++){const [x,y]=this.project(24+i*25+(g.reduced?camera.position.x-6:0),7,-18);c.beginPath();c.ellipse(x,y,75+i*7,43+i*4,-.45,0,Math.PI*2);c.stroke();}c.restore();
  drawVector(this,g);drawPermutation(this,g);drawWrap(this,g);drawAnalysisWorld(this,g);drawAE(this,g);drawExpansionWorld(this,g);drawBaseWorld(this,g);drawArithmetic(this,g);
  this.platformCut=this.upperLaneBottom;this.orderedPlats.forEach(f=>{if(f.renderInvisible)return;f.compatColor??=css(f.main?.material?.color?.getHex?.()??g.L.ground);this.drawPlatform(f,f.compatColor,night);});this.platformCut=null;
  if(g.L.kind==='shadow')for(const f of this.shadowPlatforms)this.drawPlatform(f,'#aec7c1',night);
  drawAnalysisWorld(this,g,'over');drawDerivative(this,g);drawAE(this,g,'over');drawExpansionWorld(this,g,'over');drawBaseWorld(this,g,'over');drawArithmetic(this,g,'over');
  if(g.L.kind==='inverse'){const a=this.project(20,-1.4),b=this.project(26,5.6);c.fillStyle=g.p.x>20&&g.p.x<26?'#8971b738':'#8971b71b';c.fillRect(a[0],b[1],b[0]-a[0],a[1]-b[1]);c.strokeStyle='#8e79b580';c.setLineDash([5,7]);c.strokeRect(a[0],b[1],b[0]-a[0],a[1]-b[1]);c.setLineDash([]);}
  if(g.L.kind==='cover'){for(const mark of g.state.inkTarget||[]){const [x,y]=this.project(mark,0,-.8);c.strokeStyle='#648e67';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-this.unit*.95);c.stroke();c.fillStyle='#cabb76';c.beginPath();c.arc(x,y-this.unit*.96,this.unit*.09,0,7);c.fill();}}
  if(g.L.kind==='symbols'){for(const g0 of g.state.symbolGates||[]){this.drawArch(g0.x,g0.upperY,'#8da995',.65);this.drawArch(g0.x,g0.lowerY,'#b49c77',.65);}}
  if(g.L.kind==='period'){this.drawClock(g.state.clock1,g.time);this.drawClock(g.state.clock2,g.time);}for(const gate of (g.state.specialGates||(g.gate?[g.gate]:[]))){if(!gate.open&&!gate.returnOpen){const a=this.project(gate.x-.12,gate.bottom??0),b=this.project(gate.x+.12,(gate.bottom??0)+(gate.height??4.8));const grad=c.createLinearGradient(a[0],b[1],a[0],a[1]);grad.addColorStop(0,'#d3bc70aa');grad.addColorStop(1,'#c59a5266');c.fillStyle=grad;c.fillRect(a[0],b[1],Math.max(6,b[0]-a[0]),a[1]-b[1]);}}
  for(const cp of g.cpMeshes){const [x,y]=this.project(cp.x,cp.y,-.7),u=this.unit;c.strokeStyle=night?'#abc7bb':'#507c6b';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-u*1.5);c.stroke();this.path([[x,y-u*1.5],[x+u*.65,y-u*1.37],[x,y-u*1.04]],cp.active?'#cda752':'#9ebb9e');}
  for(const s of g.switches){if(s.type==='scale')this.drawLens(s);const [x,y]=this.project(s.x,s.y);if(x<-this.unit||x>w+this.unit)continue;c.fillStyle='#426b5e';c.beginPath();c.ellipse(x,y,this.unit*.68,this.unit*.17,0,0,Math.PI*2);c.fill();if(!s.taken){const gy=y-this.unit*(.63+(g.reduced?0:Math.sin(g.time*2+s.x)*.08));this.diamond(x,gy,this.unit*.28,'#dfbe69');}}
  for(const coin of g.coins){if(!coin.taken&&!coin.actor){const [x,y]=this.project(coin.x,coin.mesh.position.y);this.diamond(x,y,this.unit*(coin.secret?.27:.2),'#d4ad55');}}
  for(const a of g.hazards)if(a.alive&&(g.L.kind!=='shadow'||!a.lower))this.drawHazard(a);
  for(const actor of g.lemmas||[]){if(!actor.caught)this.drawLemma(actor,g.time,g.reduced);}
  // Use the same world-label bilingual getters as the WebGL sprites.
  for(const l of g.labels){if(!l.visible)continue;const [x,y]=this.project(l.position.x,l.position.y,l.position.z);if(x<-250||x>w+250)continue;const spec=l.userData.canvasSpec||{};const size=Math.max(10,Math.min(25,(spec.font||45)/160*l.scale.y*this.unit));const text=l.userData.getText?.()||'',font=`${spec.bold?600:450} ${size}px system-ui,sans-serif`,color=spec.color||(night?'#d7e4d5':'#315e57'),key=text+'|'+font+'|'+color;let tile=this.textCache.get(key);if(!tile){const canvas=document.createElement('canvas'),tc=canvas.getContext('2d');tc.font=font;canvas.width=Math.ceil(tc.measureText(text).width)+8;canvas.height=Math.ceil(size*1.7)+4;tc.font=font;tc.textAlign='center';tc.textBaseline='middle';tc.fillStyle=color;tc.fillText(text,canvas.width/2,canvas.height/2);tile=canvas;this.textCache.set(key,tile);}c.globalAlpha=spec.opacity??.82;c.drawImage(tile,x-tile.width/2,y-tile.height/2);c.globalAlpha=1;}
  this.drawArch(g.L.width,0,night?'#d2bc80':'#558772');
  if(g.L.kind==='shadow'){this.drawContactShadow(g.p,true);c.save();c.globalAlpha=.60;this.drawBird(g.p,g.worldTime,true);c.restore();for(const a of g.hazards)if(a.alive&&a.lower)this.drawHazard(a);}
  if(g.L.kind==='wrap'){const x=wrapPreview(g.p,g.state.wrap);if(x!==null){this.drawBird({...g.p,x},g.worldTime,false,g.p);}}
  this.drawContactShadow(g.p,false);this.drawBird(g.p,g.worldTime,false);
  if(g.L.kind==='shadow'&&(g.state.shadowHitUntil||0)>g.worldTime){const [x,y]=this.project(g.p.x,g.p.y-4+.68),left=g.state.shadowHitUntil-g.worldTime;c.strokeStyle=`rgba(112,190,197,${.5*Math.min(1,left/.7)})`;c.lineWidth=2;c.beginPath();c.ellipse(x,y,this.unit*.8,this.unit*.9,0,0,7);c.stroke();}
  for(const q of g.particles){const [x,y]=this.project(q.m.position.x,q.m.position.y);c.globalAlpha=Math.max(0,q.life);c.fillStyle='#dcc684';c.fillRect(x-2,y-2,4,4);}c.globalAlpha=1;
  if(g.invul>0){const [x,y]=this.project(g.p.x,g.p.y+.65*g.p.scale);c.strokeStyle=`rgba(223,191,108,${Math.min(.5,g.invul*.4)})`;c.lineWidth=2;c.beginPath();c.ellipse(x,y,this.unit*.81*g.p.scale,this.unit*.86*g.p.scale,0,0,7);c.stroke();}
 }
 prepareBackground(g,night){
  const w=this.width,h=this.height,theme=this.theme=worldPalette(g.L.kind,night);this.sky=document.createElement('canvas');this.sky.width=w;this.sky.height=h;const c=this.sky.getContext('2d'),gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,theme?.skyTop||(night?'#1f3948':'#f3f0e3'));gradient.addColorStop(.62,theme?.skyMid||css(g.L.color));gradient.addColorStop(1,theme?.skyBase||(night?'#385b60':'#bdcfc0'));c.fillStyle=gradient;c.fillRect(0,0,w,h);
  if(theme){const glow=c.createRadialGradient(w*.18,h*.22,0,w*.18,h*.22,h*.34);glow.addColorStop(0,theme.sun+'70');glow.addColorStop(1,theme.sun+'00');c.fillStyle=glow;c.fillRect(0,0,w,h);}
  if(g.L.kind!=='ae'){c.fillStyle=theme?.sun||(night?'#e9ddb9':'#fff6d4');c.beginPath();c.arc(w*.18,h*.22,Math.min(w,h)*.047,0,Math.PI*2);c.fill();}
  const colors=theme?.layers||(night?['#476b6b','#3a5962','#2d4b58']:['#adc5b0','#bfd2c0','#d0ddcf']);
  const paint=(ctx,width,layer)=>{const base=h*(.80-layer*.105),height=h*(.29+layer*.01),points=contour(g.L.kind,w,height,layer);ctx.fillStyle=colors[layer];if(theme){const tint=ctx.createLinearGradient(0,base-height*.65,0,h);tint.addColorStop(0,theme.inlay[layer]);tint.addColorStop(.36,colors[layer]);tint.addColorStop(1,colors[layer]);ctx.fillStyle=tint;}ctx.beginPath();ctx.moveTo(0,h);for(let repeat=0;repeat<Math.ceil(width/w);repeat++)for(const [x,y] of points)ctx.lineTo(x+repeat*w,base-y);ctx.lineTo(width,h);ctx.closePath();ctx.fill();
   if(theme&&layer===2){for(const tone of ['body','lit']){ctx.fillStyle=tone==='body'?theme.layers[2]:theme.inlay[2];ctx.beginPath();for(let repeat=0;repeat<Math.ceil(width/w);repeat++)for(const item of sceneryFeatures(g.L.kind,w,height)){if(item.tone!==tone)continue;item.points.forEach(([x,y],i)=>i?ctx.lineTo(x+repeat*w,base-y):ctx.moveTo(x+repeat*w,base-y));ctx.closePath();}ctx.fill();}}
   if(theme){ctx.save();ctx.globalAlpha=g.L.kind==='ae'?.8:.42;ctx.fillStyle=theme.inlay[layer];for(let repeat=0;repeat<Math.ceil(width/w);repeat++)for(const path of sceneryInlays(g.L.kind,w,height,layer)){ctx.beginPath();path.forEach(([x,y],i)=>i?ctx.lineTo(x+repeat*w,base-y):ctx.moveTo(x+repeat*w,base-y));ctx.closePath();ctx.fill();}ctx.restore();}
  };
  if(g.L.kind!=='shadow')paint(c,w,2);
  this.mountains=[];for(let layer=1;layer>=0;layer--){const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*2);canvas.height=h;paint(canvas.getContext('2d'),canvas.width,layer);this.mountains.push({canvas,period:w,par:layer===1?.18:.33});}
 }

 drawPlatform(f,color,night){
  const support=platformSupport(f);if(support)this.drawPlatform(support,color,night);
  if(f.hiddenWhenInactive&&f.active===false)return;
  if(this.platformCut!==null&&this.platformCut!==undefined){if(f.y<=this.platformCut)return;f={...f,h:Math.min(f.h||.7,f.y-this.platformCut)};}
  const c=this.ctx,left=f.x-f.w/2,right=f.x+f.w/2,top=f.y,bottom=f.y-(f.h||.7),depth=(f.depth||2.1)/2,A=this.project(left,top,depth),B=this.project(right,top,depth),C=this.project(right,bottom,depth),D=this.project(left,bottom,depth);if(B[0]<-100||A[0]>this.width+100)return;
  if(f.active===false){c.save();c.setLineDash([6,7]);c.strokeStyle=night?'#c3d3bf60':'#55745d60';c.lineWidth=1.5;c.beginPath();c.moveTo(...A);c.lineTo(...B);c.stroke();c.restore();return;}
  const E=this.project(right,top,-depth),F=this.project(left,top,-depth),G=this.project(right,bottom,-depth),pts=[A,B,C,D,E,F,G],minX=Math.min(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1])),maxX=Math.max(...pts.map(p=>p[0])),maxY=Math.max(...pts.map(p=>p[1]));
  const key=[f.w,f.h,f.depth||2.1,color,night,this.unit.toFixed(2),f.noteBox!==undefined?'fold':f.stableSeal?'seal':'plain'].join('|');let tile=this.platformCache.get(key);
  if(!tile){const canvas=document.createElement('canvas');canvas.width=Math.ceil(maxX-minX)+4;canvas.height=Math.ceil(maxY-minY)+4;const tc=canvas.getContext('2d');tc.translate(2-minX,2-minY);const polygon=(points,fill,stroke=null)=>{tc.beginPath();points.forEach((p,i)=>i?tc.lineTo(...p):tc.moveTo(...p));tc.closePath();tc.fillStyle=fill;tc.fill();if(stroke){tc.strokeStyle=stroke;tc.lineWidth=.5;tc.stroke();}};const shade=tc.createLinearGradient(A[0],A[1],A[0],Math.max(A[1]+1,D[1]));shade.addColorStop(0,color);shade.addColorStop(1,this.theme?.bottom||(night?'#899b91':'#bac7b1'));polygon([A,B,C,D],shade);polygon([A,B,E,F],this.theme?.cap||(night?'#e1ddc4':'#f6efda'),'#f9f4e3');polygon([B,E,G,C],this.theme?.side||(night?'#899b90':'#bbc8b4'));if(this.theme){tc.strokeStyle=this.theme.edge;tc.lineWidth=1.6;tc.lineJoin='round';tc.beginPath();tc.moveTo(...F);tc.lineTo(...A);tc.lineTo(...B);tc.lineTo(...E);tc.stroke();tc.strokeStyle=this.theme.edge+'65';tc.lineWidth=1;tc.beginPath();tc.moveTo(...B);tc.lineTo(...C);tc.lineTo(...D);tc.stroke();}tc.strokeStyle='#2f514f28';tc.lineWidth=1;tc.beginPath();tc.moveTo(A[0],A[1]+this.unit*.15);tc.lineTo(B[0],B[1]+this.unit*.15);tc.stroke();tc.strokeStyle='#c5aa6777';tc.lineWidth=1.5;tc.beginPath();tc.moveTo(A[0],A[1]+5);tc.lineTo(B[0],B[1]+5);tc.stroke();if(f.stableSeal){const center=this.project(f.x,f.y+.09,0);tc.strokeStyle='#477b63';tc.lineWidth=1.5;tc.beginPath();tc.ellipse(center[0],center[1],this.unit*.34,this.unit*.11,0,0,Math.PI*2);tc.stroke();tc.beginPath();[[-.17,0],[-.035,.12],[.20,-.14]].forEach(([dx,z],i)=>{const point=this.project(f.x+dx,f.y+.095,z);if(i)tc.lineTo(...point);else tc.moveTo(...point);});tc.stroke();}if(f.noteBox!==undefined){tc.strokeStyle='#526f68';tc.lineWidth=2;tc.beginPath();tc.moveTo(A[0]+(B[0]-A[0])*.17,A[1]+this.unit*.30);tc.lineTo(A[0]+(B[0]-A[0])*.72,A[1]+this.unit*.30);tc.moveTo(A[0]+(B[0]-A[0])*.17,A[1]+this.unit*.46);tc.lineTo(A[0]+(B[0]-A[0])*.60,A[1]+this.unit*.46);tc.stroke();polygon([[B[0]-this.unit*.34,A[1]],[B[0],A[1]+this.unit*.30],B],'#f5ebcc','#ad9d74');}tile=canvas;this.platformCache.set(key,tile);}
  c.drawImage(tile,minX-2,minY-2);if(f.ink){const inkKey=f.w+'_'+(f.brushVariant||0)+'_'+this.unit.toFixed(2);let ink=this.inkCache.get(inkKey);if(!ink){ink=document.createElement('canvas');ink.width=tile.width;ink.height=tile.height;const ic=ink.getContext('2d');ic.translate(2-minX,2-minY);ic.fillStyle=css(INK_COLOR);ic.beginPath();brushOutline(f.w,f.brushVariant||0).forEach(([sx,sz],i)=>{const xy=this.project(f.x+sx,f.y+.084,sz);if(i)ic.lineTo(...xy);else ic.moveTo(...xy);});ic.closePath();ic.fill();this.inkCache.set(inkKey,ink);}const progress=this.reduced?1:(f.inkProgress??1),reveal=Math.max(1,ink.width*progress),offset=(ink.width-reveal)/2;c.drawImage(ink,offset,0,reveal,ink.height,minX-2+offset,minY-2,reveal,ink.height);}
 }

 diamond(x,y,r,color){if(x<-r*2||x>this.width+r*2)return;const c=this.ctx;const grad=c.createLinearGradient(x-r,y-r,x+r,y+r);grad.addColorStop(0,'#fff0b7');grad.addColorStop(1,color);this.path([[x,y-r*1.5],[x+r,y],[x,y+r*1.5],[x-r,y]],grad);}
 drawArch(x,y,color,scale=1){const c=this.ctx,[a,b]=this.project(x,y),u=this.unit*scale;c.strokeStyle=color;c.lineWidth=Math.max(3,u*.13);c.beginPath();c.moveTo(a-u*1.2,b);c.lineTo(a-u*1.2,b-u*3.2);c.bezierCurveTo(a-u*1.2,b-u*4.6,a+u*1.2,b-u*4.6,a+u*1.2,b-u*3.2);c.lineTo(a+u*1.2,b);c.stroke();}
 drawClock(clock,time){if(!clock)return;const c=this.ctx,[x,y]=this.project(clock.group.position.x,clock.group.position.y,-.4),r=this.unit*.95,key=r.toFixed(2);let face=this.clockCache.get(key);if(!face){face=document.createElement('canvas');face.width=face.height=Math.ceil(r*2+8);const fc=face.getContext('2d'),cx=face.width/2,cy=face.height/2;fc.strokeStyle='#a58f5d';fc.lineWidth=2;fc.beginPath();fc.arc(cx,cy,r,0,7);fc.stroke();fc.strokeStyle='#6f8868';fc.lineWidth=1.25;fc.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,inner=r*(i%3===0?.78:.86);fc.moveTo(cx+Math.sin(a)*inner,cy-Math.cos(a)*inner);fc.lineTo(cx+Math.sin(a)*r*.96,cy-Math.cos(a)*r*.96);}fc.stroke();this.clockCache.set(key,face);}c.drawImage(face,x-face.width/2,y-face.height/2);const angle=time*Math.PI*2/clock.period;c.strokeStyle='#45695b';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(angle)*r*.72,y-Math.cos(angle)*r*.72);c.stroke();}

 drawHazard(a){const c=this.ctx;const [x,y]=this.project(a.x,a.y);const u=this.unit;if(x<-u||x>this.width+u)return;c.fillStyle='#94725b';c.beginPath();c.ellipse(x,y-u*.3,u*.37,u*.3,0,0,Math.PI*2);c.fill();const shade=c.createLinearGradient(x-u*.4,y-u*.65,x+u*.4,y-u*.3);shade.addColorStop(0,'#f6e5c2');shade.addColorStop(1,'#b99775');c.fillStyle=shade;c.fillRect(x-u*.39,y-u*.65,u*.78,u*.2);for(const dx of [-.16,.16]){c.fillStyle='#293f40';c.beginPath();c.arc(x+u*dx,y-u*.31,u*.04,0,7);c.fill();}}
 drawContactShadow(p,ghost){if(!p.grounded||!p.on||p.on.active===false)return;const c=this.ctx,[x,y]=this.project(p.x,p.on.y-(ghost?4:0)+.01,.06);c.fillStyle=ghost?'#1e626914':(this.theme?.contact||'#173e4324');c.beginPath();c.ellipse(x,y,this.unit*.37*p.scale,this.unit*.105*p.scale,0,0,7);c.fill();}
 drawLens(s){const c=this.ctx,[x,y]=this.project(s.x,s.y+.8,-.12),u=this.unit;if(x<-u||x>this.width+u)return;c.strokeStyle='#b4b883b0';c.lineWidth=1.5;for(const r of [.60,.81]){c.beginPath();c.ellipse(x,y,u*r,u*r*.975,0,0,7);c.stroke();}const [sx,sy]=this.project(s.x,s.y+1.69);c.strokeStyle='#cfb574';c.lineWidth=2;c.beginPath();c.moveTo(sx-u*.16,sy);c.lineTo(sx+u*.16,sy);if(s.scale>1){c.moveTo(sx,sy-u*.16);c.lineTo(sx,sy+u*.16);}else if(s.scale===1){c.moveTo(sx-u*.16,sy-u*.12);c.lineTo(sx+u*.16,sy-u*.12);}c.stroke();}

 drawLemma(actor,time,reduced){const c=this.ctx,b=actor.body,[x,y]=this.project(b.x,b.y),u=this.unit;if(x<-u||x>this.width+u)return;c.save();c.translate(x,y);if(!reduced)c.rotate(-Math.sin(time*12)*.035);c.fillStyle='#254c4526';c.beginPath();c.ellipse(0,0,u*.43,u*.1,0,0,7);c.fill();const paper=c.createLinearGradient(-u*.3,-u*.73,u*.3,-u*.1);paper.addColorStop(0,'#fff7db');paper.addColorStop(1,'#dacc9e');c.fillStyle=paper;c.fillRect(-u*.31,-u*.7,u*.62,u*.6);c.fillStyle='#bda064';c.fillRect(-u*.34,-u*.74,u*.68,u*.09);c.fillRect(-u*.34,-u*.13,u*.68,u*.09);for(const dx of [-.18,.18]){c.fillStyle='#304b48';c.beginPath();c.arc(u*dx,-u*.42,u*.045,0,7);c.fill();const step=reduced?0:Math.sin(time*12+(dx>0?Math.PI:0))*.045;c.fillStyle='#87683c';c.fillRect(u*(dx-.05),-u*(.06+step),u*.11,u*.1);}c.restore();}
 drawBird(p,time,ghost,contactBody=p){
  if(this.cMode?.enabled){
   if(this.cMode.failed)return;
   try{withCanvasScope(this.ctx,c=>{
    if(this.wrapDomain){const left=this.project(this.wrapDomain.left,0)[0],right=this.project(this.wrapDomain.right,0)[0];c.beginPath();c.rect(left,0,right-left,this.height);c.clip();}
    this.clipBirdBehindPlatforms(p,ghost);
    const body={...p,y:p.y-(ghost?4:0)},[x,y]=this.project(body.x,body.y);
    const spriteUnit=this.unit*PROJECTION_X_RATIO;
    this.cMode.draw(c,{body,x,y,unit:spriteUnit,platforms:ghost?this.shadowPlatforms:this.occluders||[],clipX:this.wrapDomain});
   });}catch(error){this.cMode.fail('draw-exception',error);}
   return; // Active C never falls through to a stale baked bird.
  }
  const c=this.ctx;c.save();
  if(this.wrapDomain){const left=this.project(this.wrapDomain.left,0)[0],right=this.project(this.wrapDomain.right,0)[0];c.beginPath();c.rect(left,0,right-left,this.height);c.clip();}
  this.clipBirdBehindPlatforms(p,ghost);
  const body=ghost?shadowContactBody(contactBody,this.shadowPlatforms):contactBody,pose=birdContactPose(body,ghost?this.shadowPlatforms:this.occluders||[]),[x,y]=this.project(p.x,p.y-(ghost?4:0));
  const projectedY=Math.abs(this.project(p.x,p.y+1)[1]-this.project(p.x,p.y)[1])/this.unit;
  c.translate(x,y);c.transform(1,0,-pose.lean/Math.max(.1,projectedY),pose.squash,0,0);c.translate(-x,-y);
  this.drawBirdImage(p,time,ghost);c.restore();
 }
 clipBirdBehindPlatforms(p,ghost){
  const c=this.ctx,feet=p.y-(ghost?4:0),radius=1.4*p.scale,head=feet+1.65*p.scale;
  for(const f of (ghost?this.shadowPlatforms:this.occluders)||[]){
   if(f.active===false||f.renderInvisible||(p.grounded&&(p.on===f||(ghost&&p.on===f.source))))continue;
   const left=f.x-f.w/2,right=f.x+f.w/2,bottom=!ghost&&this.upperLaneBottom!==null?Math.max(f.y-(f.h||.7),this.upperLaneBottom):f.y-(f.h||.7);
   if(right<p.x-radius||left>p.x+radius||f.y<feet-.22*p.scale||bottom>head+.25)continue;
   // The baked actor is at z=0. A platform's front face and front half of its
   // top surface lie in front of that plane, using the same camera projection.
   const polygon=[this.project(left,f.y,0),this.project(right,f.y,0),this.project(right,bottom,(f.depth||2.1)/2),this.project(left,bottom,(f.depth||2.1)/2)];
   // Intersect separate complements: overlapping platforms must not reopen a
   // hole, which a single even-odd path containing every platform would do.
   c.beginPath();c.rect(0,0,this.width,this.height);polygon.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();c.clip('evenodd');
  }
 }
 drawBirdImage(p,time,ghost){const c=this.ctx,[x,y]=this.project(p.x,p.y-(ghost?4:0));const scale=p.scale;if(this.crestDrawing.draw(c,{x,y,unit:this.unit,scale,facing:p.facing,time,reducedMotion:this.reduced,dark:this.night,flying:!p.grounded,speed:Math.abs(p.vx),...this.expression}))return;const anim=p.grounded?(Math.abs(p.vx)>1?'run':'idle'):'flap';c.save();c.translate(x,y);if(p.facing<0)c.scale(-1,1);const meta=this.meta;if(meta&&this.atlas.complete&&this.atlas.naturalWidth){const animation=meta.animations?.[anim]||meta.animations?.idle;const ids=animation?.frames||[0];const index=ids[this.reduced?0:Math.floor(time*(animation?.fps||8))%ids.length];const frame=meta.frames?.[index];const f=Array.isArray(frame)?{x:frame[0],y:frame[1],w:frame[2],h:frame[3]}:frame;if(f){const fw=f.w||f.width||192,fh=f.h||f.height||192;const pivot=meta.pivotPx||[fw*.5,fh*.86];const pixelsPerWorld=meta.pixelsPerWorldUnit||meta.render?.pixelsPerWorldUnit||112;const size=this.unit*scale/pixelsPerWorld;c.drawImage(this.atlas,f.x,f.y,fw,fh,-pivot[0]*size,-pivot[1]*size,fw*size,fh*size);c.restore();return;}}
 // A brand silhouette appears only while the exact-model baked atlas loads.
 if(this.logo.complete&&this.logo.naturalWidth)c.drawImage(this.logo,-this.unit*.75*scale,-this.unit*1.35*scale,this.unit*1.6*scale,this.unit*1.6*scale);c.restore();}
}

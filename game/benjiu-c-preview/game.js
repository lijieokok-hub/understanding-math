import {createCMode} from './benjiu/c-mode.mjs';
import {snapshotBody,captureLanding} from './benjiu/state-adapter.mjs';
import {currentGuidance} from './playing-guidance.mjs';
import {shadowSurface,shadowContactBody,styleShadowLayer,clipUpperLane,addShadowDepthBoundary} from './shadow-track.mjs';
import {buildVector,vectorForces,onVectorHead,onVectorLanding,updateVector} from './vector-world.js';
import {buildPermutation,onPermutationHead,updatePermutation} from './permutation-world.js';
import * as THREE from './vendor/three.module.js';
import {createMathematicalBird} from './art/mathematical-bird.js';
import {createBirdCrest} from './bird-crest/integral-crest.js';
import {createBirdExpression} from './bird-expression.js';
import {buildWrap,wrapCrossing,wrapPreview} from './wrap-world.js';
import {birdContactPose,applyNativeBirdPose} from './bird-contact.mjs';
import {createBirdPresentation} from './bird-presentation.mjs';
import {frameCameraX} from './camera-framing.mjs';
import {LEVELS} from './levels.js';
import {collisionPlatforms} from './platform-collision.mjs';
import {PHYSICS,bodyAt,stepBody,setScale,approach,resolveBodyOverlaps} from './physics.mjs';
import {CompatibilityRenderer} from './compat-renderer.js';
import {analyzeInkCover} from './intervals.mjs';
import {brushOutline,INK_COLOR} from './brush-art.mjs';
import {contour,worldPalette,sceneryInlays,sceneryFeatures,isCollegeWorld,addCollegePlatformArt} from './world-art.mjs';
import {buildAnalysisWorld,updateAnalysisWorld,takeSeriesTerm,analysisStatus} from './analysis-worlds.js';
import {CAMPAIGN,LEGACY_IDS,chapterForRuntime,idForRuntime,availableChapters,nextAvailable,continueAvailable} from './campaign.js';
import {loadProgress,completeProgress,saveProgress,exportProgress,importProgress} from './progress.mjs';
import {chapterChooser} from './adventure-ui.js';
import {buildDerivative,prepareDerivativeInput,actualDerivativeJump,ignoreDerivativeLanding,derivativeLanded} from './derivative-world.js';
import {buildAE,updateAE,onAEHeadHit,formatAEValue} from './ae-world.js';
import {buildExpansion,updateExpansion} from './expansion-worlds.js';
import {buildBaseWorld,updateBaseWorld,onBaseHeadHit,onBaseLanding} from './mirror-composition-worlds.js';
import {buildArithmetic,onArithmeticHead,onArithmeticLanding,updateArithmetic} from './arithmetic-worlds.js';
const $=s=>document.querySelector(s), app=$('#app'), world=$('#world');
let currentPlayInstructions='';
const params=new URLSearchParams(location.search),qa=params.get('qa')==='1';
let cMode;try{cMode=await createCMode(params);}catch(error){$('#loading').hidden=true;$('#webglError').hidden=false;const en=initialLanguage()===1;$('#webglError h1').textContent=en?'Preview could not load':'试玩未能加载';$('#webglError p').textContent=en?'Please reload this page. You can still play the original game from the preview options.':'请重新打开页面。也可以返回试玩选项，继续玩原版游戏。';$('#webglError a').textContent=en?'Back to preview options':'返回试玩选项';$('#webglError a').href=en?'en.html':'./';throw error;}
function playerBodyAt(...args){return cMode.resizeBody(bodyAt(...args));}
function scalePlayer(body,scale){setScale(body,scale);cMode.resizeBody(body);}
function haltCMode(){
 if(!cMode.failed)return;mode='dialog';currentDialog='c-error';clearKeys();accumulator=0;
 const failure=cMode.failed,code=failure.code==='draw-exception'?(failure.message==='Severe pose/body disagreement'?'C-DRAW-BOUNDS':failure.message==='Severe visible solid overlap'?'C-DRAW-SOLID':'C-DRAW'):(new Map([['physics-exception','C-PHYS'],['pose-exception','C-POSE'],['render-exception','C-RENDER']]).get(failure.code)||'C-OTHER');
 const key=code+':'+lang,previous=$('#dialogHost [data-c-error]');if(previous?.dataset.cError===key)return;
 let level=null;try{if(Number.isInteger(levelIndex)&&levelIndex>=0)level=levelIndex+1;}catch{}
 const snapshot={code,level},finite=value=>Number.isFinite(value)?value:null;
 try{const status=cMode.status;Object.assign(snapshot,{epoch:finite(status.epoch),tick:finite(status.tick)});}catch{}
 try{Object.assign(snapshot,{x:finite(p.x),y:finite(p.y),vx:finite(p.vx),vy:finite(p.vy),scale:finite(p.scale),facing:finite(p.facing)});}catch{}
 try{app.dataset.cPreviewFailure=JSON.stringify(snapshot);}catch{}
 $('#dialogHost').innerHTML=`<section class="dialog" data-c-error="${key}" role="alertdialog" aria-modal="true" tabindex="-1"><h2>${tx('试玩已暂停','Preview stopped')}</h2><p>${tx('角色显示遇到了问题。刷新页面可以重新开始。试玩进度只在当前页面里，刷新或关闭就会清除。','The bird could not be displayed safely. Reload to start again. Preview progress lasts only in this page and clears when you reload or close it.')}</p><p>${tx('错误码','Error code')}：${code} · ${tx('关卡','Level')} ${level??'?'}</p><button type="button" data-c-reload>${tx('刷新并重新开始','Reload and start again')}</button> <a href="${lang?'en.html':'./'}">${tx('返回试玩选项','Back to preview options')}</a></section>`;
 $('#dialogHost [data-c-reload]').onclick=()=>location.reload();if(!previous)$('#dialogHost .dialog')?.focus();
}
function refreshCPreviewCopy(){if(cMode.enabled&&renderer?.badge)renderer.badge.textContent=tx('新形象试玩 · 进度仅本页','New bird preview · progress lasts only in this page');}

function sampleCMode(facts){if(cMode.enabled&&!cMode.sample({...facts,platforms:physicalPlatforms()}))haltCMode();}

function initialLanguage(){
 const explicit=params.get('lang');if(explicit==='zh'||explicit==='en')return explicit==='en'?1:0;
 // Keep the existing numeric preference format used by updateLanguage.
 try{return localStorage.getItem('missingLemmaLang')==='1'?1:0;}catch{return 0;}
}
function syncLanguageUrl(){
 try{
  // Preserve unrelated query bytes, including existing QA flags, and the hash.
  const parts=location.search?location.search.slice(1).split('&'):[],next=[];let replaced=false;
  for(const part of parts){if(new URLSearchParams(part).has('lang')){if(!replaced)next.push('lang='+(lang?'en':'zh'));replaced=true;}else next.push(part);}
  if(!replaced)next.push('lang='+(lang?'en':'zh'));
  history.replaceState(history.state,'',location.pathname+'?'+next.join('&')+location.hash);
 }catch{}
}
let lang=initialLanguage(),muted=true,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{muted=localStorage.getItem('missingLemmaSound')!=='on';}catch{}
lang=lang===1?1:0;
const tx=(zh,en)=>lang?en:zh;const local=a=>a[lang];
const progressStorage=cMode.enabled?cMode.storage:(()=>{try{return localStorage;}catch{return {getItem:()=>null,setItem(){throw new Error('Storage unavailable');}};}})();
let progress=loadProgress(progressStorage),progressStatus=null;const collection='campaign';const birdExpression=createBirdExpression();
function expressionInput(){const locomotion=p.grounded?(Math.abs(p.vx)>1?'moving':'idle'):'flutter';return birdExpression.sample(locomotion);}
const worldChapter=()=>chapterForRuntime(levelIndex);
const worldName=()=>worldChapter()?local(worldChapter().title):local(L.name);
function nextWorld(){return nextAvailable(levelIndex,LEVELS.length);}
function continueWorld(){return continueAvailable(progress,LEVELS.length);}
function translateShell(){$('#bar nav').setAttribute('aria-label',tx('游戏控制','Game controls'));const loading=$('#loading span');if(loading)loading.textContent=tx('正在寻找被省略的引理…','Looking for the missing lemma…');$('#webglError h1').textContent=tx('暂时无法创建游戏画面','We could not create the game view');$('#webglError p').textContent=tx('可以重新打开页面，或换一个浏览器再试。','Try reopening this page, or using another browser.');$('#webglError a').textContent=tx('返回阅读','Back to reading');$('#webglError a').href=lang?'../../en/':'../../';}
translateShell();
let renderer,compat=false;try{if(params.get('render')==='compat')throw new Error('Compatibility view requested');renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){compat=true;try{renderer=new CompatibilityRenderer({getLanguage:()=>lang,getState:()=>({cMode,L,p,levelIndex,plats,collisionPlats:physicalPlatforms(),coins,switches,hazards,labels,cpMeshes,state,gate,goal,time,worldTime,particles,invul,reduced,lemmas,expression:expressionInput()})});}catch(fallbackError){$('#loading').hidden=true;$('#webglError').hidden=false;throw fallbackError;}}
renderer.localClippingEnabled=true;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;world.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-15,15,8,-8,.1,150);
const hemi=new THREE.HemisphereLight(0xffffec,0x60756c,2.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d1,3.2);sun.position.set(-8,17,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,1024);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-10;sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
const rim=new THREE.DirectionalLight(0xa6dfe1,1.1);rim.position.set(0,5,-10);scene.add(rim);
const bird=createMathematicalBird(THREE);scene.add(bird.group);const ghost=createMathematicalBird(THREE);scene.add(ghost.group);ghost.group.visible=false;
const crest=createBirdCrest(THREE,bird),ghostCrest=createBirdCrest(THREE,ghost);
const birdPresentation=createBirdPresentation(THREE,bird,ghost);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.65,24),new THREE.MeshBasicMaterial({color:0x174e48,transparent:true,opacity:.12,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const halo=new THREE.Mesh(new THREE.TorusGeometry(.85,.035,8,36),new THREE.MeshBasicMaterial({color:0xe5c773,transparent:true,opacity:.3,depthWrite:false}));halo.visible=false;scene.add(halo);const ghostHalo=halo.clone();ghostHalo.material=halo.material.clone();ghostHalo.material.color.setHex(0x82c9cf);ghostHalo.visible=false;scene.add(ghostHalo);
let root=new THREE.Group();scene.add(root);
let levelIndex=0,L=LEVELS[0],p=playerBodyAt(),plats=[],coins=[],switches=[],hazards=[],decor=[],labels=[],checkpoint={x:2,y:0},state={},time=0,worldTime=0,mode='menu',currentDialog='intro',cameraX=7,toastLeft=0,hintLeft=9,failCount=0,invul=0,transitioning=false;
let perfSamples=[],perfStats=null,lastPerfCalc=0,wasPlaying=false,lastHudAt=-Infinity;
const keys={left:false,right:false,jump:false,pressed:false,released:false};
let collected=0,gate,goal,cpMeshes=[],floating=[],particles=[],lemmas=[];
const matCache=new Map();const mat=(color,roughness=.8)=>{const key=color+'_'+roughness;if(!matCache.has(key))matCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness:.02}));return matCache.get(key);};
const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,12,8),coinGeo=new THREE.OctahedronGeometry(.21,0);
function box(x,y,z,w,h,d,color,parent=root){const m=new THREE.Mesh(boxGeo,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function ball(x,y,z,r,color,parent=root){const m=new THREE.Mesh(sphereGeo,mat(color));m.position.set(x,y,z);m.scale.setScalar(r);m.castShadow=true;parent.add(m);return m;}
function label(text,x,y,opts={}){const getText=typeof text==='function'?text:()=>text;const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');canvas.width=1024;canvas.height=160;ctx.clearRect(0,0,1024,160);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${opts.bold?'600':'450'} ${opts.font||45}px system-ui, sans-serif`;ctx.fillStyle=opts.color||'#315e57';ctx.fillText(getText(),512,80);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:opts.opacity??1});const sprite=new THREE.Sprite(m);sprite.position.set(x,y,opts.z??1.3);sprite.scale.set(opts.w||11,(opts.w||11)/6.4,1);root.add(sprite);sprite.userData.getText=getText;sprite.userData.canvasSpec=opts;sprite.userData.refresh=()=>{ctx.clearRect(0,0,1024,160);ctx.fillText(getText(),512,80);tex.needsUpdate=true;};labels.push(sprite);return sprite;}
function platform(x,y,w=4,opts={}){const oneWay=opts.oneWay===true;const h=oneWay?Math.min(opts.h||.18,.18):(opts.h||.7);const group=new THREE.Group();root.add(group);group.position.set(x,y,0);const col=opts.color??L.ground;const main=box(0,-h/2,0,w,h,2.1,col,group);const top=box(0,.015,0,w+.025,.09,2.16,opts.top||0xf9f3df,group);box(0,-.11,1.065,w-.12,.06,.045,L.accent,group);const lip=box(0,-.18,1.09,w-.1,.027,.014,0x355c56,group);lip.material=new THREE.MeshBasicMaterial({color:0x355c56,transparent:true,opacity:isCollegeWorld(L.kind)?.42:.15});addCollegePlatformArt(THREE,group,w,h,L.kind);if(opts.pillar){box(0,-h/2-3,0,w*.85,6,1.75,col,group);}const f={x,y,w,active:opts.active!==false,group,main,top,dx:0,dy:0,...opts,h,solid:!oneWay,oneWay,groundVolume:!!opts.pillar||(y<=0&&w>=8&&h>=.5),collision:oneWay?'one-way':'solid'};group.visible=f.active;if(opts.stableSeal){const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.022,5,24),mat(0x497b64));ring.rotation.x=-Math.PI/2;ring.position.y=.087;group.add(ring);const points=[new THREE.Vector3(-.17,.09,0),new THREE.Vector3(-.035,.09,.12),new THREE.Vector3(.20,.09,-.14)];const check=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.026,5,false),mat(0x497b64));group.add(check);}if(opts.ink){const shape=new THREE.Shape();brushOutline(w,opts.brushVariant||0).forEach(([sx,sz],i)=>i?shape.lineTo(sx,-sz):shape.moveTo(sx,-sz));shape.closePath();const ink=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat(INK_COLOR,.95));ink.rotation.x=-Math.PI/2;ink.position.y=.084;ink.receiveShadow=true;group.add(ink);f.inkArt=ink;f.inkProgress=reduced?1:.03;ink.scale.x=f.inkProgress;f.inkBorn=time;}plats.push(f);return f;}
function setActive(f,v){f.active=v;f.group.visible=v;}
function movePlatform(f,x,y){f.dx=x-f.x;f.dy=y-f.y;f.x=x;f.y=y;f.group.position.set(x,y,0);}
function outline(x,y,w){const geo=new THREE.EdgesGeometry(new THREE.BoxGeometry(w,.24,2));const lines=new THREE.LineSegments(geo,new THREE.LineDashedMaterial({color:L.ink,dashSize:.18,gapSize:.12,transparent:true,opacity:.26}));lines.computeLineDistances();lines.position.set(x,y-.1,0);root.add(lines);return lines;}
function feather(x,y,secret=false){const m=new THREE.Mesh(coinGeo,mat(secret?0xdfbc63:0xcba763,.3));m.position.set(x,y,0);m.scale.set(secret?1.4:1,secret?2.3:1.6,.55);m.castShadow=true;root.add(m);coins.push({x,y,mesh:m,taken:false,secret});}
function pad(x,y,type,data={}){const group=new THREE.Group();root.add(group);group.position.set(x,y,0);const base=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,.15,24),mat(0x365b50));base.position.y=.08;group.add(base);const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.34),mat(data.color||L.accent,.3));gem.position.y=.63;group.add(gem);const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.025,8,32),mat(0xe7cd87,.3));ring.rotation.x=Math.PI/2;ring.position.y=.23;group.add(ring);if(type==='scale'){for(const r of [.60,.81]){const lens=new THREE.Mesh(new THREE.TorusGeometry(r,.018,5,36),mat(0xb3b886,.55));lens.position.set(0,.8,-.12);group.add(lens);}const sign=box(0,1.69,0,.32,.045,.045,0xd1b56d,group);if(data.scale>1)box(0,1.69,0,.045,.32,.045,0xd1b56d,group);else if(data.scale===1)box(0,1.81,0,.32,.045,.045,0xd1b56d,group);}const s={x,y,type,group,gem,ring,taken:false,...data};switches.push(s);if(data.caption)label(()=>local(data.caption),x,y+1.7,{w:6,font:41});return s;}
function arch(x,y,color=0x739981,small=false){const g=new THREE.Group();g.position.set(x,y,0);root.add(g);const w=small?1.6:2.4,h=small?2.2:3.4;box(-w/2,h/2,0,.18,h,.4,color,g);box(w/2,h/2,0,.18,h,.4,color,g);const curve=new THREE.EllipseCurve(0,h-.2,w/2,w/2,0,Math.PI,false,0);const pts=curve.getPoints(30).map(v=>new THREE.Vector3(v.x,v.y,0));const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),30,.095,6,false),mat(color));g.add(tube);return g;}
function checkpointAt(x,y){const g=new THREE.Group();g.position.set(x,y,0);root.add(g);box(0,.75,-.7,.09,1.5,.09,L.ink,g);const flag=box(.36,1.27,-.7,.67,.42,.035,0xa9c4a0,g);cpMeshes.push({x,y,group:g,flag,active:false});}
function hazard(x,y,min=x-2,max=x+2,speed=1.2,lower=false){const g=new THREE.Group();g.position.set(x,y,0);root.add(g);ball(0,.32,0,.36,0x976858,g);box(0,.55,0,.65,.19,.44,0xebd7b4,g);for(const dx of [-.17,.17])ball(dx,.4,.29,.052,0x312e35,g);const h={x,y,min,max,speed,dir:1,group:g,alive:true,lower};hazards.push(h);return h;}
function createLemma(x,y){
 const group=new THREE.Group();group.position.set(x,y,0);root.add(group);box(0,.39,0,.62,.62,.24,0xf8edcf,group);box(0,.69,.025,.67,.08,.29,0xd1b165,group);box(0,.1,.025,.67,.08,.29,0xd1b165,group);
 const feet=[];for(const dx of [-.18,.18]){ball(dx,.41,.17,.048,0x344e4d,group);const f=box(dx,.025,.04,.1,.09,.21,0x896f45,group);feet.push(f);}
 const ribbon=box(.31,.34,-.03,.16,.36,.08,0xcda15b,group);ribbon.rotation.z=-.35;
 const body=bodyAt(x,y);setScale(body,.5);body.coyote=PHYSICS.coyote;const actor={body,group,feet,caught:false,fleeing:false,hasJoked:false,idleDir:1,jumpHeld:false,home:x,rescues:0};
 actor.caption=label(()=>actor.fleeing?tx('证明留作练习！','Proof left as an exercise!'):tx('归纳步 · 正在溜达','The induction step · on a break'),x,y+1.5,{w:8,font:28,opacity:.9});
 feather(x,y+.4,true);actor.coin=coins[coins.length-1];actor.coin.actor=actor;actor.coin.mesh.visible=false;lemmas.push(actor);return actor;
}
function updateLemmas(dt){for(const a of lemmas){if(a.caught)continue;const b=a.body;if(!a.fleeing&&Math.hypot(p.x-b.x,p.y-b.y)<4.5&&Math.abs(p.y-b.y)<2){a.fleeing=true;a.caption.userData.refresh?.();if(!a.hasJoked){a.hasJoked=true;showToast(tx('不是比喻。练习真的长腿了。','Not a metaphor. The exercise has legs.'),2.8);}}
 let axis=0;if(a.fleeing){axis=b.x<42.2?.63:0;}else{if(b.x>a.home+.65)a.idleDir=-1;if(b.x<a.home-.65)a.idleDir=1;axis=a.idleDir*.16;}
 const jump=!!(a.fleeing&&axis&&b.grounded&&b.on&&b.on.x+b.on.w/2-b.x<.58);stepBody(b,{axis,jumpPressed:jump&&!a.jumpHeld},physicalPlatforms(b),dt,{previousPlatform:b.on});a.jumpHeld=jump;
 if(b.y<-5){a.rescues++;b.x=31;b.y=-1.6;b.vx=0;b.vy=0;}a.group.position.set(b.x,b.y,0);a.group.rotation.z=reduced?0:Math.sin(time*12)*.035;a.feet.forEach((f,i)=>{f.rotation.z=reduced?0:Math.sin(time*12+i*Math.PI)*.3;});a.caption.position.set(b.x,b.y+1.5,1.3);
 }}
function burst(x,y,color=0xc9a958,count=9){if(reduced)return;for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.TetrahedronGeometry(.06),mat(color));m.position.set(x,y,0);root.add(m);particles.push({m,vx:(Math.random()-.5)*4,vy:2+Math.random()*3,life:.7});}}
function scenery(){
 const night=levelIndex===7,theme=worldPalette(L.kind,night);scene.background=new THREE.Color(theme?.skyMid||L.color);scene.fog=new THREE.Fog(theme?.skyMid||L.color,35,95);shadow.material.opacity=theme?.21:.12;hemi.intensity=night?1.65:2.6;sun.intensity=night?2.2:3.2;
 // Three quiet theme-specific paper silhouettes, with real depth and no collisions.
 root.userData.sceneryLayers=[];for(let layer=L.kind==='shadow'?1:2;layer>=0;layer--){const width=L.width+38,shape=new THREE.Shape();shape.moveTo(-16,-15);for(const [x,y] of contour(L.kind,width,8+layer*2,layer))shape.lineTo(x-16,y-3);shape.lineTo(width-16,-15);shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false,steps:1}),mat(theme?.layers[layer]||(night?[0x466870,0x365763,0x2b4857][layer]:[0xadc5b0,0xbfD2c0,0xd0ddcf][layer])));mesh.position.z=-15-layer*10;mesh.position.y=-layer*2.6;root.add(mesh);root.userData.sceneryLayers.push({mesh,parallax:.12+layer*.12});
  if(theme&&layer===2)for(const tone of ['body','lit']){const shapes=sceneryFeatures(L.kind,width,8+layer*2).filter(item=>item.tone===tone).map(item=>{const feature=new THREE.Shape();item.points.forEach(([x,y],i)=>i?feature.lineTo(x-16,y-3):feature.moveTo(x-16,y-3));feature.closePath();return feature;});if(shapes.length){const art=new THREE.Mesh(new THREE.ShapeGeometry(shapes),mat(tone==='body'?theme.layers[2]:theme.inlay[2]));art.position.z=1.225;art.userData.visualOnly=true;mesh.add(art);}}
  if(theme){const details=sceneryInlays(L.kind,width,8+layer*2,layer).map(path=>{const detail=new THREE.Shape();path.forEach(([x,y],i)=>i?detail.lineTo(x-16,y-3):detail.moveTo(x-16,y-3));detail.closePath();return detail;});if(details.length){const inlay=new THREE.Mesh(new THREE.ShapeGeometry(details),new THREE.MeshBasicMaterial({color:theme.inlay[layer],transparent:true,opacity:L.kind==='ae'?.55:.30,depthWrite:false}));inlay.position.z=1.215;inlay.userData.visualOnly=true;mesh.add(inlay);}}
 }
 const rings=new THREE.Group();root.add(rings);root.userData.sceneryLayers.push({mesh:rings,parallax:0});for(let i=0;i<(['period','inverse','scale'].includes(L.kind)?3:0);i++){const m=new THREE.Mesh(new THREE.TorusGeometry(3.2+i*.65,.017,5,100),mat(night?0x627f84:0xacc4b5));m.position.set(25+i*24,7,-18);m.rotation.set(.1,.2,.5+i);rings.add(m);}
 const orb=ball(-2,L.kind==='shadow'?1.6:3,-22,2.1,theme?.sun||(night?0xe0d6ad:0xfff2cc));orb.material=new THREE.MeshBasicMaterial({color:theme?.sun||(night?0xe0d6ad:0xfff2cc)});orb.visible=L.kind!=='ae';root.userData.sceneryLayers.push({mesh:orb,parallax:1,baseX:-2});
}
function physicalPlatforms(body=p){return collisionPlatforms(plats,L?.kind==='wrap'?state.wrap:null,body);}
function baseEnd(start=46,end=L.width+3,y=0){platform((start+end)/2,y,end-start,{h:3,pillar:true});checkpointAt(start+3,y);for(let i=0;i<4;i++)feather(start+7+i*3,y+1.1+(i%2)*.7);platform(start+13,y+2.1,3);feather(start+13,y+3.15,true);hazard(start+21,y,start+18,start+24,1.4);}
function buildLevel(i,opening=false){if(cMode.failed){haltCMode();return;}cMode.reset();cVisualAccumulator=0;birdExpression.reset();
 perfSamples=[];perfStats=null;wasPlaying=false;const sharedMaterials=new Set(matCache.values()),releasedMaterials=new Set();root.traverse(o=>{for(const m of (o.material?(Array.isArray(o.material)?o.material:[o.material]):[])){if(!sharedMaterials.has(m)&&!releasedMaterials.has(m)){if(m.map?.isTexture)m.map.dispose();m.dispose();releasedMaterials.add(m);}}if(o.geometry&&!([boxGeo,sphereGeo,coinGeo].includes(o.geometry)))o.geometry.dispose();});scene.remove(root);root=new THREE.Group();scene.add(root);levelIndex=i;app.dataset.sceneTone=i===7?'night':'day';L=LEVELS[i];gate=null;plats=[];coins=[];switches=[];hazards=[];labels=[];cpMeshes=[];particles=[];lemmas=[];floating=[];decor=[];time=0;collected=0;failCount=0;invul=0;state={steps:0,word:'',crossed:0,cover:0,trigger:null,reverseTime:0,phase:0,scaleStage:0,waited:0,met:false};checkpoint={x:2,y:0};p=playerBodyAt(2,0);p.coyote=PHYSICS.coyote;cameraX=6;transitioning=false;hintLeft=10;ghost.group.visible=L.kind==='shadow';scenery();
 if(L.kind!=='wrap'){platform(5,0,14,{h:3,pillar:true});checkpointAt(L.kind==='paired'?6.5:10,0);for(let j=0;j<4;j++)feather(4+j*2,1.2+(j%2)*.6);}
 label(()=>worldName(),6,5.1,{w:11,bold:true,font:36,opacity:.8});label(()=>local(L.tag),6,4.3,{w:10,font:27,opacity:.65});
 if(L.kind==='induction'){
  state.bridge=[];for(let j=0;j<6;j++){const f=platform(15+j*3.6,.2+j*.24,2.7,{active:j===0,step:j});state.bridge.push(f);const o=outline(f.x,f.y,f.w);o.visible=j!==0;f.outline=o;}
  label(()=>tx('显然，此处有桥。','Clearly, a bridge goes here.'),17.4,3.6,{w:9,font:32,opacity:.65});
  // Two visible side routes. The induction bridge itself never collapses.
  platform(26.4,3.8,3.5,{color:0xe1dbc0});state.shuttle=platform(32.1,4.25,4,{color:0xd1d9b9});platform(39,3.9,4,{color:0xe1dbc0});
  platform(24.5,-2.1,6,{h:.55,color:0xc8d4bc});platform(31,-1.65,5.2,{h:.55,color:0xc8d4bc});platform(37,-1,5.2,{h:.55,color:0xc8d4bc});platform(42,-.35,4,{h:.55,color:0xc8d4bc});
  label(()=>tx('脚注在上面。','A footnote with a view.'),27,6.2,{w:8,font:29,opacity:.62});
  platform(39,1.4,6,{h:.6});platform(53.5,0,19,{h:3,pillar:true});checkpointAt(46,0);hazard(54,0,51.5,55.5,1.6);
  label(()=>tx('小心，这个“略”会动。','This omission is on the move.'),50,3.2,{w:10,font:29,opacity:.7});
  feather(15,1.35);feather(18.6,1.6);feather(26.4,5.05,true);feather(32.1,5.55,true);feather(35.5,.35);feather(51,1.8);feather(55,2.2);
  checkpointAt(24,-2.1);createLemma(30.5,-1.65);L.width=60;
 }else if(L.kind==='period'){
  state.a=platform(18,.8,5.5,{color:0xcbd3b5});state.b=platform(27,1.6,5.5,{color:0xdfceb0});state.c=platform(36,.8,5.8,{color:0xcbd3b5});platform(13.5,-2,3.6,{h:.6,color:0xc7d2be});platform(23,-2,3.6,{h:.6,color:0xc7d2be});platform(32,-1.8,3.8,{h:.6,color:0xc7d2be});checkpointAt(32,-1.8);platform(42,0,6,{h:2});label(()=>tx('下面也接得住。','The lower route has your back.'),14,2.2,{w:9,font:29,opacity:.65});state.clock1=makeClock(20,6.4,4);state.clock2=makeClock(28,6.4,6);gate=makeGate(45,0);gate.bottom=-8;gate.height=15;gate.f.y=7;gate.f.h=15;gate.f.group.position.y=7;gate.curtain.position.y=-.5;gate.curtain.scale.y=15;gate.group.scale.y=7/4.8;state.periodCrossed=false;baseEnd(47);label(()=>tx('4 秒','4 s'),20,8.5,{w:4});label(()=>tx('6 秒','6 s'),28,8.5,{w:4});
 }else if(L.kind==='inverse'){
  platform(15,0,4);state.lift=platform(23,-.2,5,{color:0xccbfd8});platform(31,2,5);platform(39,.5,6);const zone=box(23,2.1,-.25,6,7,1.7,0xb3a0c9);zone.material=new THREE.MeshStandardMaterial({color:0xae97c7,transparent:true,opacity:.13,depthWrite:false});state.zone=zone;label(()=>tx('逆向区','Inverse field'),23,6,{w:7,bold:true,font:45});pad(31,2,'inverse',{caption:['方向对了。','A valid inverse.']});baseEnd(44);
 }else if(L.kind==='symbols'){
  platform(22,-1.8,20,{h:2});platform(18,1.7,4.5);platform(29,1.7,4.5);platform(56,0,6,{h:2});platform(56,2.3,3.8);checkpointAt(55,0);
  state.symbolGates=[{x:18,upperY:1.7,lowerY:-1.8,threshold:.4},{x:29,upperY:1.7,lowerY:-1.8,threshold:.4},{x:56,upperY:2.3,lowerY:0,threshold:1.1}];state.previousGateX=2;
  for(const g of state.symbolGates){arch(g.x,g.upperY,0x99b7a5,true);arch(g.x,g.lowerY,0xc2a080,true);label('○',g.x,g.upperY+2.2,{w:2,font:90});label('△',g.x,g.lowerY+2.2,{w:2,font:74});}
  const makeRoute=specs=>specs.map(([x,y,w,solid=false,h=.55])=>platform(x,y,w,{active:false,hiddenWhenInactive:true,solid,h,color:solid?0xd2c6c9:0xe3d8ce}));
  // Index order: triangle-triangle, triangle-circle, circle-triangle, circle-circle.
  state.firstRoutes=[makeRoute([[42,-1.6,18],[42,1.1,15,true,.8]]),makeRoute([[36,-1.2,4.2],[41,-.4,4.2],[46,.8,4.2],[51,.5,4.2]]),makeRoute([[36,-.1,4.2],[41,1.4,4.2],[46,.1,4.2],[51,1.2,4.2]]),makeRoute([[36,.7,4.2],[41,1.5,4.2],[46,2.3,4.2],[51,1.2,4.2]])];
  const endings=[[-1.2,-.4,0],[-.8,.2,-.4],[.2,1.2,.4],[1.2,2.2,1.3]];
  state.secondRoutes=endings.map(ys=>makeRoute(ys.map((y,j)=>[62+j*5,y,4.4])));state.firstWord='';state.secondWord='';state.wordSigns=[label(()=>state.firstWord||'··',42,5.5,{w:4,font:66,opacity:.6}),label(()=>state.secondWord||'··',67,5,{w:4,font:66,opacity:.6})];
  label(()=>tx('路只记两步。','Two steps. That is all it remembers.'),24,5.6,{w:11,font:31,opacity:.64});
  platform(79,0,10,{h:3,pillar:true});checkpointAt(76,0);hazard(79,0,77.4,80.4,1.25);
  for(const [x,y] of [[18,3.1],[29,-.55],[41,2.7],[45,-.25],[56,3.7],[67,3.35],[72,.7],[79,1.25]])feather(x,y,y>3||y<0);L.width=82;
 }else if(L.kind==='cover'){
  state.inkCenters=[];state.inkPlatforms=[];state.coverage=0;state.coverComplete=false;state.cover=0;state.inkTarget=[12,48];state.warnedGap=false;for(const x of state.inkTarget){box(x,.45,-.8,.07,.9,.07,0x668b67);ball(x,.96,-.8,.1,0xc6b76b);}
  platform(30,0,36,{oneWay:true,active:false,h:.3});platform(20,-1.4,3.8,{h:.6,color:0xbccfbb});platform(32,-1.4,3.8,{h:.6,color:0xbccfbb});platform(44,-1.4,3.8,{h:.6,color:0xbccfbb});checkpointAt(32,-1.4);
  label(()=>tx('这一翅，也是一笔。','One flap. One stroke.'),15,3.8,{w:9,font:33,opacity:.8});label(()=>tx('补到没有缺口，门就开。','Close the gaps. Open the gate.'),45,4.1,{w:11,font:31,opacity:.75});
  gate=makeGate(50,0);baseEnd(48,75);feather(19,2);feather(31,2.2);feather(43,2,true);L.width=72;
 }else if(L.kind==='threshold'){
  platform(14,0,4);state.thresholds=[];for(let j=0;j<3;j++){const f=platform(21+j*9,0,6,{active:false,color:0xbdd3be,stableSeal:true});f.threshold=[2,5,8][j];state.thresholds.push(f);outline(f.x,0,6);platform(17.5+j*9,-1.5,2.8);label(()=>[2,5,8][j]+tx(' 秒',' s'),f.x,2.1,{w:3,font:53});}baseEnd(45);label(()=>tx('等最慢的一段。','Wait for the last one.'),30,5.2,{w:13});
 }else if(L.kind==='shadow'){
  platform(31,0,40,{h:1});for(const x of [18,32,45])hazard(x,0,x-1.5,x+1.5,1.1);for(const x of [24,38])hazard(x,-4,x-1,x+1,1.2,true);label(()=>tx('本体','Bird'),14,1.8,{w:4});label(()=>tx('影子 · 同一输入','Shadow · same input'),15,-2.1,{w:8,font:37});baseEnd(49);
  // Independent presentation lane: translated top surfaces, never colliders.
  const upperSurfaces=[...plats];for(const f of upperSurfaces)clipUpperLane(THREE,f.group);state.shadowDepthBoundary=addShadowDepthBoundary(THREE,root);state.shadowSurfaces=upperSurfaces.map(source=>{const v=shadowSurface(source),f=platform(v.x,v.y,v.w,{oneWay:true,h:.18,color:0x96b9b9});f.source=source;styleShadowLayer(f.group,20);return f;});plats=upperSurfaces;
  for(const h of hazards)if(h.lower)styleShadowLayer(h.group,21);
 }else if(L.kind==='scale'){
  platform(27,0,31,{h:3});pad(16,0,'scale',{scale:.55,caption:['缩小透镜','Shrink lens']});platform(27,6,16,{h:5,solid:true,color:0xc8c9b8});label(()=>tx('小一点，也有出路。','Small has its advantages.'),27,4,{w:12,font:36,color:'#d9e4d4'});pad(39,0,'scale',{scale:1.25,caption:['放大透镜','Grow lens']});platform(46,2.2,5);platform(54,3,5);feather(54,4.2,true);platform(61,1.3,4);pad(61,1.3,'scale',{scale:1,caption:['回到自己','Back to yourself']});
  platform(67,0,8,{h:2});checkpointAt(68,0);platform(77.5,-1.6,27,{h:1.2,color:0xb8c5b4});platform(88,0,8,{h:2});
  state.appendixOpened=0;state.appendixComplete=false;state.appendixReminder=false;state.appendixSheets=[platform(74,1.1,5.5,{oneWay:true,h:.24,active:false,hiddenWhenInactive:true,color:0xe6ddbd}),platform(80.5,2,5,{oneWay:true,h:.24,active:false,hiddenWhenInactive:true,color:0xe6ddbd})];
  state.appendixBoxes=[platform(72,2.6,2.2,{h:.7,solid:true,color:0xe3d2a1,noteBox:0}),platform(80,3.4,2.2,{h:.7,solid:true,color:0xe3d2a1,noteBox:1})];
  for(const [j,f] of state.appendixBoxes.entries()){box(0,-.32,1.08,1.65,.055,.035,0x6e8581,f.group);box(0,-.46,1.08,1.2,.045,.035,0x6e8581,f.group);f.caption=label(()=>j===0?tx('还有一个小问题。','One tiny question.'):tx('请见附件的附件。','See the attached attachment.'),f.x,f.y+1.15,{w:10,font:30,color:'#e0dec3'});}
  label(()=>tx('碰一下，纸还会展开。','A little nudge. Another page.'),68,3.1,{w:11,font:30,color:'#d4dfca'});
  for(const [x,y] of [[66,1.3],[71,3.6],[74,2.4],[79,4.5],[81,3.3],[86,1.3],[77,-.25]])feather(x,y,y>3||y<0);L.width=88;
 }
 if(L.kind==='vector')buildVector({cMode:cMode.enabled,THREE,state,platform,feather,label,checkpointAt,box,root,mat,tx,makeGate});
 if(L.kind==='permutation')buildPermutation({THREE,state,platform,feather,label,checkpointAt,box,root,mat,tx,makeGate});
 if(L.kind==='wrap'){buildWrap({THREE,state,platform,feather,label,checkpointAt,box,root,mat,tx});p=playerBodyAt(20,0);p.coyote=PHYSICS.coyote;checkpoint={x:20,y:0};cameraX=24;}
 if(L.kind==='series'||L.kind==='integral')buildAnalysisWorld(L.kind,{THREE,state,platform,feather,label,checkpointAt,box,root,tx,makeGate});
 if(L.kind==='derivative')buildDerivative({THREE,state,platform,feather,label,checkpointAt,box,root,mat,tx,makeGate});
 if(L.kind==='ae')buildAE({THREE,state,platform,feather,label,checkpointAt,box,root,tx,makeGate});
 if(L.kind==='paired')buildExpansion(L.kind,{THREE,state,platform,feather,label,checkpointAt,box,ball,root,mat,tx,makeGate,outline});
 if(L.kind==='reflection'||L.kind==='composition')buildBaseWorld(L.kind,{THREE,state,platform,feather,label,checkpointAt,box,root,tx,makeGate,tone,showToast});
 if(L.kind==='array'||L.kind==='addition')buildArithmetic(L.kind,{THREE,state,platform,feather,label,checkpointAt,box,root,mat,tx,makeGate,outline});
 if(state.expansionGates)state.specialGates=state.expansionGates;for(const g of state.specialGates||[])label(()=>tx('← 回程一直通','← Return route'),g.x+.15,1.2,{w:6,font:24,opacity:.65});
 (cMode.enabled?cMode.resolve(p,physicalPlatforms(),{reason:'level-build'}):resolveBodyOverlaps(p,physicalPlatforms()));const mainCoins=coins.length;for(let j=mainCoins;j<12;j++)feather(15+(j-mainCoins)*7,3.2+((j-mainCoins)%2)*.3,j===11);for(const extra of coins.slice(12))extra.mesh.visible=false;coins=coins.slice(0,12);
 goal=arch(L.width,0,levelIndex===7?0xd0b975:0x4d8973);state.goalCaption=label(()=>levelIndex===7?(state.appendixComplete?tx('证毕','Q.E.D.'):tx('附件还没拆完','Pages still folded')):tx('下一页','Next page'),L.width,4.8,{w:7,font:39,color:levelIndex===7?'#e6d6a5':undefined});if(L.kind!=='paired')checkpointAt(L.width-8,0);$('#levelIndex').textContent=String(worldChapter()?.chapter??i+1).padStart(2,'0')+' / '+CAMPAIGN.length;$('#levelName').textContent=worldName();updateHUD(true);if(!opening){mode='playing';closeDialog();world.focus();showToast(local(L.tag));}resize();sampleCMode({body:p,dt:0,reducedMotion:reduced});
}
function makeGate(x,y){const g=arch(x,y,0xb79b62);const f=platform(x,y+4.8,.38,{h:4.8,solid:true,color:0xbea471});f.group.visible=false;f.renderInvisible=true;const curtain=box(x,y+2.4,0,.12,4.8,1.7,0xbeb267);curtain.material=new THREE.MeshStandardMaterial({color:0xbba456,transparent:true,opacity:.48});return {x,y,group:g,f,curtain,open:false};}
function makeClock(x,y,period){const g=new THREE.Group();g.position.set(x,y,-.4);root.add(g);const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.055,8,48),mat(L.accent));g.add(ring);const hand=box(0,.43,0,.045,.86,.04,L.ink,g);hand.geometry=boxGeo;const pivot=new THREE.Group();g.remove(hand);hand.position.y=.43;pivot.add(hand);g.add(pivot);for(let j=0;j<12;j++)ball(Math.sin(j*Math.PI/6)*.95,Math.cos(j*Math.PI/6)*.95,0,.044,L.ink,g);return {group:g,pivot,period};}
let audioCtx;function tone(freq,duration=.07,type='sine',gain=.025){if(muted)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch{}}
const compactMessageViewport=matchMedia('(max-height:360px)');
function positionToast(){const bottom=Math.ceil($('#hud').getBoundingClientRect().bottom);$('#toast').style.setProperty('--hud-bottom',`${bottom}px`);}
if(typeof ResizeObserver==='function')new ResizeObserver(positionToast).observe($('#hud'));
addEventListener('resize',positionToast);
function showToast(text,seconds=3.4){$('#toast').textContent=text;$('#toast').classList.add('visible');positionToast();toastLeft=seconds;}
function save(){const saved=saveProgress(progressStorage,progress);if(saved)progressStatus=null;return saved;}
function progressStatusText(key){return key==='save-error'?tx('进度暂时无法保存，原存档未改动。可先导出本次记录备份。','Progress could not be saved. The existing save is unchanged. Export this session as a backup.'):key==='import-error'?tx('这份进度文件暂时读不了。原记录还在。','That save file could not be read. Your current progress is safe.'):tx('进度合上了，较高记录都保留。','Progress merged. Your better records are safe.');}
function showProgressStatus(key,failed=false){progressStatus=failed?{key,failed}:null;const status=$('#progressStatus');if(!status)return;status.setAttribute('role',failed?'alert':'status');status.textContent=progressStatusText(key);status.hidden=false;const dialog=status.closest('.dialog');if(dialog){dialog.setAttribute('tabindex','-1');dialog.focus?.({preventScroll:true});dialog.scrollTop=0;}}
function showSaveWarning(){showProgressStatus('save-error',true);}
function respawn(reason='fall'){if(L.kind==='derivative'){state.tangentFlight=null;state.tangentIgnoreSource=null;state.tangentSupport=null;}if(reason==='shadow')state.shadowHitUntil=worldTime+.7;failCount++;p=playerBodyAt(checkpoint.x,checkpoint.y+.04);p.coyote=PHYSICS.coyote;if(L.kind==='symbols')state.previousGateX=p.x;if(L.kind==='scale'&&checkpoint.x>40)scalePlayer(p,checkpoint.x>63?1:1.25);(cMode.enabled?cMode.resolve(p,physicalPlatforms(),{reason:'respawn'}):resolveBodyOverlaps(p,physicalPlatforms()));invul=1;cameraX=Math.max(6,p.x+3);tone(140,.13,'triangle');const quips=reason==='shadow'?[['你躲开了，影子没躲开。','You cleared it. Your shadow did not.']]:[['这一步，先不算。','That step needs another pass.'],['引理已保留，体面也还在。','Your lemmas are safe. So is your dignity.'],['刚才那步，重来一遍。','Let’s try that landing again.']];showToast(local(quips[(failCount-1)%quips.length]));burst(p.x,p.y+.6,0xb0c8ab,7);cMode.reset();sampleCMode({body:p,dt:0,reducedMotion:reduced,respawn:true});}
function finish(){if(transitioning)return;birdExpression.request('solved','world-finish');sampleCMode({body:p,dt:0,reducedMotion:reduced,solved:true});if(cMode.failed)return;completeProgress(progress,idForRuntime(levelIndex),collected);transitioning=true;mode='dialog';const saved=save();tone(659,.11);setTimeout(()=>tone(880,.15),95);setTimeout(()=>tone(1046,.22),190);showDialog('complete');if(!saved)showSaveWarning();}
function openAppendix(f,cause='touch'){
 if(L.kind!=='scale'||f.noteBox===undefined||f.opened)return;
 f.opened=true;state.appendixCauses??=[];state.appendixCauses.push(cause);setActive(f,false);if(f.caption)f.caption.visible=false;setActive(state.appendixSheets[f.noteBox],true);state.appendixOpened++;state.appendixComplete=state.appendixOpened===2;
 p.vy=Math.max(p.vy,7.4*Math.sqrt(p.scale));p.grounded=false;p.on=null;p.coyote=0;p.flaps=1;burst(f.x,f.y,0xe2d39f,14);tone(state.appendixComplete?880:620,.13,'sine',.02);state.goalCaption?.userData.refresh?.();
 showToast(state.appendixComplete?tx('附件齐了。小鸟申请下班。','Attachments complete. The bird requests lunch.'):tx('展开了。里面还有一页。','Unfolded. There is another page inside.'),2.6);
}
function castInk(){
 if(p.x<10||p.x>50||state.inkCenters.some(x=>Math.abs(x-p.x)<1.5))return;
 const center=p.x;state.inkCenters.push(center);state.inkCenters.sort((a,b)=>a-b);const stroke=platform(center,0,8,{oneWay:true,h:.32,color:0xc6d9b4,top:0xe5efcc,ink:true,brushVariant:state.inkCenters.length%3});state.inkPlatforms.push(stroke);plats=[...plats];state.cover=state.inkCenters.length;
 const coverage=analyzeInkCover(state.inkCenters);state.inkCoverage=coverage;state.coverage=coverage.percent;state.coverComplete=coverage.complete;
 burst(center,.2,0xb9d592,12);tone(720,.09,'sine',.016);
 if(state.coverComplete&&!state.coverCelebrated){state.coverCelebrated=true;showToast(tx('这回连上了。“几乎”可以下班了。','Connected. “Almost” can clock out now.'),3);}
}
function updateMechanics(dt){
 for(const f of plats){f.dx=0;f.dy=0;}
 if(L.kind==='vector')updateVector({state,p},dt);
 if(L.kind==='permutation')updatePermutation({state,movePlatform},dt);
 if(L.kind==='reflection'||L.kind==='composition')updateBaseWorld(L.kind,{state,movePlatform,tx,tone,showToast},dt);
 if(L.kind==='ae')updateAE({state,p,input:{axis:(keys.right?1:0)-(keys.left?1:0)},movePlatform,tx,showToast,tone},dt);
 if(L.kind==='series'||L.kind==='integral')updateAnalysisWorld(L.kind,{state,p,movePlatform,showToast,tx},dt);
 if(L.kind==='induction'&&state.shuttle){movePlatform(state.shuttle,32.1+Math.sin(time*1.05)*1.1,4.25);}
 if(L.kind==='period'){
  movePlatform(state.a,18+Math.sin(time*Math.PI/2)*1.7,.35+Math.cos(time*Math.PI/2)*.45);movePlatform(state.b,27+Math.sin(time*Math.PI/3)*1.6,1.1+Math.cos(time*Math.PI/3)*.5);movePlatform(state.c,36+Math.sin(time*Math.PI/2)*1.6,.35+Math.cos(time*Math.PI/2)*.45);state.clock1.pivot.rotation.z=-time*Math.PI/2;state.clock2.pivot.rotation.z=-time*Math.PI/3;
  gate.open=time%12<2.2;gate.f.active=!gate.open;gate.curtain.visible=!gate.open;if(gate.open&&p.x>39&&!state.met){state.met=true;showToast(local(L.jokes[1]));}
 }else if(L.kind==='inverse'){
  const reverse=p.x>20&&p.x<26;state.phase+=dt*(reverse?-1:1);if(reverse)state.reverseTime+=dt;movePlatform(state.lift,23,.7+Math.sin(state.phase*1.2)*1.7);state.zone.material.opacity=reverse?.23:.11;
 }else if(L.kind==='symbols'){
  const before=state.previousGateX??p.x;state.symbolGates.forEach((g,j)=>{if(before<=g.x&&p.x>g.x){const symbol=p.y>g.threshold?'○':'△';state.word=(state.word+symbol).slice(-2);state.crossed++;tone(symbol==='○'?640:480,.10);burst(g.x,p.y+.6,0xc7a375,5);
   const code=['△△','△○','○△','○○'].indexOf(state.word);if(code>=0&&(j===1||j===2)){const routes=j===1?state.firstRoutes:state.secondRoutes;routes.forEach((route,i)=>route.forEach(f=>setActive(f,i===code)));if(j===1)state.firstWord=state.word;else state.secondWord=state.word;state.wordSigns.forEach(sign=>sign.userData.refresh?.());}
  }});state.previousGateX=p.x;
 }else if(L.kind==='cover'){
  for(const f of state.inkPlatforms){if(f.inkProgress<1){const t=reduced?1:Math.min(1,(time-f.inkBorn)/.24);f.inkProgress=Math.max(.03,1-(1-t)**3);f.inkArt.scale.x=f.inkProgress;}}
  gate.open=state.coverComplete;gate.f.active=!gate.open;gate.curtain.visible=!gate.open;if(p.x>47&&!gate.open&&!state.warnedGap){state.warnedGap=true;showToast(tx('还有缝。回头补一笔就好。','Still a gap. One more stroke can fix it.'),3);}
 }else if(L.kind==='threshold'){
  if(p.x>12&&state.trigger===null){state.trigger=time;showToast(tx('现在开始，各自的“快了”。','Their different versions of “soon” start now.'));}
  if(state.trigger!==null){const elapsed=time-state.trigger;state.thresholds.forEach(f=>{if(elapsed>=f.threshold&&!f.active){setActive(f,true);burst(f.x,.15,0xaec49c,14);tone(390+f.threshold*45,.15);}});}
 }
}
function updateExpressionEvents(dt){
 const insight=(fact,key)=>{if(fact)birdExpression.request('insight',key);};
 insight(state.analysisReady,'mechanism-ready');insight(state.coverComplete,'cover-complete');insight(state.steps>0,'first-real-step');insight(state.lemmaFound,'lemma-caught');insight(state.met,'common-return');
 state.reservoirs?.forEach((r,i)=>insight(r.everReady,'water-'+i));state.array?.deliveries.forEach((done,i)=>insight(done,'delivery-'+i));state.derivativeSolved?.forEach((done,i)=>insight(done,'tangent-'+i));
 insight(state.ae?.atStop,'exact-zero');insight(state.ae?.erased,'point-erased');insight(state.firstWord,'first-symbol-route');insight(state.secondWord,'second-symbol-route');insight(state.scaleStage>0,'scale-used');
 if(state.series?.rejected)birdExpression.request('question','rail-rejection-'+state.series.rejected);
 if(state.composition?.order.length===2&&state.composition.value===5&&!state.composition.solved)birdExpression.request('question','wrong-order-'+state.composition.round);
 const gates=state.specialGates||(gate?[gate]:[]);for(const g of gates){const blocked=!g.open&&!g.returnOpen&&keys.right&&!keys.left&&p.x<g.x&&g.x-p.x<.9&&Math.abs(p.vx)<.2;g.expressionWait=blocked?(g.expressionWait||0)+dt:0;if(g.expressionWait>.45)birdExpression.request('question','closed-gate-'+g.x);}
}
function updateReturnGates(){
 for(const g of state.specialGates||[]){
  if(g.open)g.returnOpen=false;
  else if(g.returnOpen){if(p.x<g.x-.8||(p.x>g.x+2&&!keys.left))g.returnOpen=false;}
  else if(p.x>g.x+.6&&keys.left&&!keys.right&&p.vx<=.1)g.returnOpen=true;
  const pass=!!(g.open||g.returnOpen);g.f.active=!pass;g.curtain.visible=!pass;
 }
}
function tick(dt){
 if(cMode.failed){haltCMode();return;}const cIdentity=p,cWasSolved=!!state.analysisReady;let cBefore=null,cJump=null,cHead=false,cLanding=null;try{if(cMode.enabled)cBefore=snapshotBody(p);}catch(error){cMode.fail('pose-exception',error);haltCMode();return;}
 worldTime+=dt;time+=dt;birdExpression.advance(dt);invul=Math.max(0,invul-dt);if(toastLeft>0){toastLeft-=dt;if(toastLeft<=0)$('#toast').classList.remove('visible');}if(hintLeft>0){if(!(compactMessageViewport.matches&&toastLeft>0))hintLeft-=dt;if(hintLeft<=0)$('#hint').textContent='';}updateMechanics(dt);updateReturnGates();
 const previous=p.on;const input={axis:(keys.right?1:0)-(keys.left?1:0),jumpPressed:keys.pressed,jumpReleased:keys.released};keys.pressed=false;keys.released=false;
 const tangent=L.kind==='derivative'?prepareDerivativeInput(state,p,input,dt):null;
 const xBeforeStep=p.x;const physicsExtra={airForces:L.kind==='vector'?vectorForces(state,p):null,onAcceleration:L.kind==='vector'?a=>{state.vector.acceleration=a}:undefined,previousPlatform:previous,wind:tangent?.wind||0,ignoreLanding:L.kind==='derivative'?(f,body)=>ignoreDerivativeLanding(state,f,body):undefined,onJump:type=>{cJump=type;if(tangent){const launch=actualDerivativeJump(state,p,input,type,previous,tangent.axis);if(launch)physicsExtra.wind=launch.wind;}tone(type==='jump'?330:490,.065,'sine',.018);burst(p.x,p.y+.15,0xe4d7a3,4);if(type==='flap'&&L.kind==='cover')castInk();},onHeadHit:f=>{cHead=true;if(!onVectorHead(f,{state,p,showToast,tx,tone})&&!onPermutationHead(f,{state,p,showToast,tx,tone})&&!takeSeriesTerm(f,{state,showToast,tx,tone})&&!onAEHeadHit(f,{state,p,showToast,tx,tone})&&!onBaseHeadHit(f,{state,p,showToast,tx,tone})&&!onArithmeticHead(f,{state,p,showToast,tx,tone}))openAppendix(f,'head');}};(cMode.enabled?cMode.step(p,input,physicalPlatforms(),dt,physicsExtra):stepBody(p,input,physicalPlatforms(),dt,physicsExtra));if(cMode.enabled)cLanding=captureLanding(cBefore,p);if(L.kind==='wrap'){const crossed=wrapCrossing(p,xBeforeStep,state.wrap);if(crossed){state.wrap.lastAt=time;if(state.wrap.crossings===1)showToast(local(L.jokes[0]),2.6);}if(xBeforeStep>=state.wrap.left&&xBeforeStep<=state.wrap.right&&p.x>state.wrap.right&&p.y>state.wrap.rim)state.wrap.exited=true;}p.x=Math.max(-1,Math.min(L.width+1,p.x));if(L.kind==='period'&&gate.open&&xBeforeStep<=gate.x&&p.x>gate.x)state.periodCrossed=true;
 onVectorLanding(p.landed,{state,p,showToast,tx,tone});onBaseLanding(p.landed,{state,p,showToast,tx,tone});onArithmeticLanding(p.landed,{state,p,showToast,tx,tone});if(L.kind==='addition')updateArithmetic({state,p});
 if(L.kind==='paired'){updateExpansion(L.kind,{state,p,input,movePlatform,setActive,mat,showToast,tx},dt);state.specialGates=state.expansionGates;state.analysisReady=state.expansionReady;}
 if(L.kind==='derivative')derivativeLanded({state,p,showToast,tx,tone});
 if(p.landed?.noteBox!==undefined)openAppendix(p.landed,'landing');
 if(p.landed?.step!==undefined){const n=p.landed.step;if(n>=state.steps&&state.bridge?.[n+1]){state.steps=n+1;setActive(state.bridge[n+1],true);state.bridge[n+1].outline.visible=false;burst(state.bridge[n+1].x,state.bridge[n+1].y+.1,L.accent,10);tone(370+n*60,.1);if(n===0)showToast(local(L.jokes[0]));}}
 for(const s of switches){if(!reduced)s.gem.rotation.y+=dt*1.8;s.gem.position.y=.63+(reduced?0:Math.sin(time*2+s.x)*.08);const touching=Math.abs(p.x-s.x)<.9&&p.y<s.y+1.5&&p.y+p.h>s.y+.25;const activate=s.type==='scale'?touching&&!s.touching:touching&&!s.taken;s.touching=touching;if(activate){s.taken=s.type!=='scale';s.gem.visible=s.type==='scale';s.ring.material=mat(0x7ea879);burst(s.x,s.y+.7,0xddc17b,16);tone(740,.16);
  if(s.type==='scale'){scalePlayer(p,s.scale);state.scaleStage++;showToast(s.scale<1?local(L.jokes[1]):local(L.jokes[0]));}
  if(s.type==='lemma'||s.type==='inverse')showToast(local(L.jokes[2]));
 }}
 for(const c of coins){if(c.taken)continue;if(c.actor){c.x=c.actor.body.x;c.y=c.actor.body.y+.4;} if(!reduced)c.mesh.rotation.y+=dt*1.4;c.mesh.position.y=c.y+(reduced?0:Math.sin(time*2.8+c.x)*.1);if(Math.abs(p.x-c.x)<.6+p.w/2&&p.y<c.y+.3&&p.y+p.h>c.y-.3){c.taken=true;c.mesh.visible=false;collected++;tone(c.secret?960:660,.075);burst(c.x,c.y,0xdab962,6);if(c.actor){c.actor.caught=true;c.actor.group.visible=false;c.actor.caption.visible=false;state.lemmaFound=true;showToast(tx('抓到了。原来“略”字把它藏这儿了。','Found it. “Obvious” had hidden the paperwork.'),3.4);}else if(c.secret)showToast(tx('找到一条没被“显然”省略的小路。','A footnote worth taking the scenic route for.'),3);}}
 for(const cp of cpMeshes){const touching=Math.abs(p.x-cp.x)<1&&p.y>=cp.y-.2&&p.y<cp.y+1.8;const entered=touching&&!cp.touching;cp.touching=touching;if(entered){checkpoint={x:cp.x,y:cp.y};if(!cp.active){cp.active=true;cp.flag.material=mat(0xd4af5e);}if(cp.x>10)showToast(tx('这页夹好了。摔了从这里接着读。','Bookmark placed. Any fall resumes here.'),2.4);}}
 for(const h of hazards){if(!h.alive)continue;h.x+=h.speed*h.dir*dt;if(h.x>h.max||h.x<h.min){h.dir*=-1;h.x=Math.max(h.min,Math.min(h.max,h.x));}h.group.position.x=h.x;h.group.rotation.z=reduced?0:Math.sin(time*8+h.x)*.06;const py=p.y-(h.lower?4:0);if(Math.abs(p.x-h.x)<p.w/2+.32&&py<h.y+.64&&py+p.h>h.y+.08){if(p.vy<0&&py>h.y+.34){h.alive=false;h.group.visible=false;p.vy=7*Math.sqrt(p.scale);burst(h.x,h.y+.5,0xd3b987,10);tone(240,.06,'triangle');showToast(tx('把“证明略”踩成了“证明见上”。','“Proof omitted” is now “proof above.”'),2);}else if(invul<=0){respawn(h.lower?'shadow':'hazard');break;}}}
 updateLemmas(dt);updateReturnGates();updateExpressionEvents(dt);
 (cMode.enabled?cMode.resolve(p,physicalPlatforms(),{reason:'post-mechanism'}):resolveBodyOverlaps(p,physicalPlatforms()));if(p.trapped){respawn('geometry');}
 if(p.y<-8)respawn();
 if(p.x>L.width-.7&&p.y<1.7){if((L.kind==='wrap'&&!state.wrap.exited)||(L.kind==='period'&&!state.periodCrossed)||(L.kind==='cover'&&!state.coverComplete)){if(!state.exitReminder){state.exitReminder=true;showToast(tx('这一段机关还没完成，回头可以继续。','This mechanism is unfinished. The return route is available.'),3);}}else if(['series','integral','derivative','ae','paired','reflection','composition','array','addition','permutation','vector'].includes(L.kind)&&!state.analysisReady){if(!state.exitReminder){state.exitReminder=true;showToast(tx('机关还没对齐，回头就能接着调。','The mechanism is not aligned yet. The return path is open.'),3);}}else if(L.kind==='scale'&&!state.appendixComplete){if(!state.appendixReminder){state.appendixReminder=true;showToast(tx('还有折页没展开，回头碰一下。','A page is still folded. Go back and give it a nudge.'),3);}}else finish();}
 sampleCMode({body:p,dt,endOfTick:true,reducedMotion:reduced,landing:p===cIdentity?cLanding:null,headHit:p===cIdentity&&cHead,solved:!cWasSolved&&!!state.analysisReady,animationVX:p===cIdentity?p.vx+(physicsExtra.wind||0):p.vx});
 updateHUD();
}
function updateHUD(force=false){const at=performance.now();if(!force&&at-lastHudAt<200)return;lastHudAt=at;const textIfChanged=(el,text)=>{if(el.textContent!==text)el.textContent=text;};
 textIfChanged($('#feathers span'),collected+' / '+coins.length);const energy=$$('#energy>span');energy[0].classList.toggle('full',p.grounded||p.coyote>0);energy[1].classList.toggle('full',p.flaps>0);let s='';
 if(L.kind==='vector')s=state.vector.settled?tx('两边都到了 · 去出口','Both reached · head to the exit'):state.vector.arrivals[0]?(state.vector.ix===2&&state.vector.iy===1?tx('2. 飞回左上纸台','2. Return to the upper-left ledge'):tx('2. 横风向左，回上层','2. Wind left · return above')):tx('1. 先飞到右边','1. First, fly right');
 if(L.kind==='permutation')s=tx('从左到右 ','Left to right ')+state.permutation.order.map(x=>x+1).join(' · ');
 if(L.kind==='wrap')s=state.wrap.exited?tx('纸筒已经绕过','Beyond the rolled page'):tx('接缝相连 · 振翅照常','Edges joined · same flap');
 if(L.kind==='induction')s=tx('已成立：','Established: ')+(Math.min(state.steps+1,6))+' / 6'+(state.lemmaFound?tx(' · 引理找回来了',' · lemma recovered'):'');
 if(L.kind==='period')s=gate.open?tx('合拍了 · 门开着','In sync · gate open'):tx('下次碰头 ','Next meeting ')+Math.ceil(12-time%12)+' s';
 if(L.kind==='inverse')s=p.x>20&&p.x<26?tx('反向 ←','Reverse ←'):tx('正向 →','Forward →');
 if(L.kind==='symbols')s=tx('最近两个 ','Last two ')+(state.word||'··');
 if(L.kind==='cover')s=tx('墨桥 ','Ink bridge ')+Math.round(state.coverage||0)+'% · '+state.cover+tx(' 笔',' strokes');
 if(L.kind==='threshold')s=state.trigger===null?tx('阈值 2 · 5 · 8','Thresholds 2 · 5 · 8'):time-state.trigger>=8?tx('全部稳定 · 此后一直','All stable · permanently'):tx('共同稳定还需 ','All stable in ')+Math.ceil(8-(time-state.trigger))+' s';
 if(L.kind==='shadow')s=tx('两轨同时安全','Both tracks safe');if(L.kind==='scale')s=tx('大小：','Size: ')+Math.round(p.scale*100)+'%'+(p.x>63?' · '+state.appendixOpened+tx('/2 份附件','/2 attachments'):'');if(L.kind==='series'||L.kind==='integral')s=analysisStatus(L.kind,state,tx);if(L.kind==='derivative')s=tx('已抵达 ','Delivered ')+state.derivativeSolved.filter(Boolean).length+' / 2';if(L.kind==='ae')s=tx('面积 ','Area ')+formatAEValue(state.ae.area)+' · '+tx('点值 ','Point value ')+state.ae.point;if(L.kind==='paired')s=tx('亮着的桥板 ','Planks on ')+state.pairGroups.flatMap(g=>g.bits).filter(Boolean).length+' / 6';if(L.kind==='reflection')s=state.reflection.solved?tx('光桥已固定','Light bridge secured'):tx('把光送到金环','Send the light to the gold ring');if(L.kind==='composition')s=tx('当前数字 ','Current number ')+state.composition.value;if(L.kind==='array')s=state.array.columns+tx(' 列 · ',' columns · ')+(12/state.array.columns)+tx(' 行',' rows')+' · '+state.array.deliveries.filter(Boolean).length+' / 2';if(L.kind==='addition')s=state.addition.carry===null?tx('空手：可收回一段','Empty wings: retrieve a piece'):tx('带着 ','Carrying ')+state.addition.units[state.addition.carry]+tx(' 格纸',' units');const guidance=currentGuidance(L.kind,state,{lang,vectorGoal:L.kind==='vector'?s:'',complete:transitioning,size:p.scale,openingHint:local(L.hint)}),goal=guidance.goal;currentPlayInstructions=guidance.controls;if(hintLeft>0)textIfChanged($('#hint'),guidance.hint);textIfChanged($('#currentGoal'),goal);const detail=L.kind==='vector'?'':s;textIfChanged($('#mechanicDetail'),detail);$('#mechanicDetail').hidden=!detail;
 const data={c_preview:cMode.status,level:worldChapter()?.chapter??levelIndex+1,runtime_world:levelIndex+1,chapter:worldChapter()?.chapter??null,world_id:idForRuntime(levelIndex),collection,expression:expressionInput(),x:+p.x.toFixed(2),y:+p.y.toFixed(2),vx:+p.vx.toFixed(2),vy:+p.vy.toFixed(2),grounded:p.grounded,flaps:p.flaps,checkpoint:checkpoint.x,feathers:collected,mode,renderer:compat?'canvas-compat':'webgl-3d',fps_avg:perfStats?.fps??'warming',frame_ms_p95:perfStats?.p95??'warming',below_30fps_pct:perfStats?.slowPct??'warming',frame_sample_seconds:perfStats?.seconds??0,frame_sample_count:perfStats?.count??perfSamples.length,frame_sampling:mode==='playing'?'live':'paused',tick_ms_avg:perfStats?.tickMs??'warming',render_ms_avg:perfStats?.renderMs??'warming',js_frame_ms_avg:perfStats?.jsMs??'warming',canvas_dpr:renderer.ratio??renderer.getPixelRatio?.()??1,mechanism:s,current_goal:goal,analysis:state.vector?{wind:state.vector.forces,acceleration:state.vector.acceleration,inField:state.vector.inField,arrivals:state.vector.arrivals,settled:state.vector.settled}:state.permutation?{order:state.permutation.order.map(x=>x+1),moving:!!state.permutation.motion,ready:state.analysisReady}:state.wrap?{crossings:state.wrap.crossings,lastDirection:state.wrap.lastDirection,exited:state.wrap.exited}:state.ae?{r:state.ae.r,area:state.ae.area,point:state.ae.point,atStop:state.ae.atStop,erased:state.ae.erased,ready:state.ae.ready}:state.derivativeSolved?{receivers:state.derivativeSolved,launch:state.tangentFlight}:state.series?{positive:state.series.positive,negative:state.series.negative,sum:state.series.sum,low:state.series.low,high:state.series.high,ready:!!state.analysisReady}:state.reservoirs?.map(r=>({volume:r.volume,height:r.height,flow:r.flow,ready:r.ready}))};app.dataset.state=JSON.stringify(data);if($('#debug').open)textIfChanged($('#debugOutput'),Object.entries(data).map(([k,v])=>k+': '+(v&&typeof v==='object'?JSON.stringify(v):v)).join('\n'));
}
function $$(s){return [...document.querySelectorAll(s)];}
function clearKeys(){keys.left=keys.right=keys.jump=keys.pressed=keys.released=false;$$('#touch button').forEach(b=>b.classList.remove('pressed'));}
function press(key,down){if(key==='ArrowLeft'||key==='a'||key==='A')keys.left=down;if(key==='ArrowRight'||key==='d'||key==='D')keys.right=down;if(key==='ArrowUp'||key==='w'||key==='W'||key===' '){if(down&&!keys.jump)keys.pressed=true;if(!down&&keys.jump)keys.released=true;keys.jump=down;}}
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(mode==='playing')showDialog('pause');else if(currentDialog!=='intro'&&currentDialog!=='complete')resume();return;}if(mode!=='playing'||document.activeElement!==world)return;if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','A','d','D','w','W'].includes(e.key)){e.preventDefault();if(!e.repeat)press(e.key,true);}if(e.key==='r'||e.key==='R'){e.preventDefault();respawn();}});
window.addEventListener('keyup',e=>{press(e.key,false);});world.addEventListener('pointerdown',()=>{if(mode==='playing')world.focus();});window.addEventListener('blur',()=>{clearKeys();if(mode==='playing')showDialog('pause');});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();if(mode==='playing')showDialog('pause');}});
for(const b of $$('#touch button')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='playing')return;b.setPointerCapture(e.pointerId);world.focus();press(b.dataset.key,true);b.classList.add('pressed');});const release=e=>{e.preventDefault();press(b.dataset.key,false);b.classList.remove('pressed');};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);}
function closeDialog(){$('#dialogHost').innerHTML='';currentDialog=null;clearKeys();}
function resume(){if(cMode.failed){haltCMode();return;}if(transitioning){showDialog('complete');return;}perfSamples=[];perfStats=null;wasPlaying=false;closeDialog();mode='playing';world.focus();}
function settings(){return `<div class="settings"><label><input type="checkbox" id="reduceMotion" ${reduced?'checked':''}>${tx('减少动态','Reduced motion')}</label><label><input type="checkbox" id="enableAudio" ${muted?'':'checked'}>${tx('开启轻音效','Gentle sound effects')}</label></div>`;}
function buttons(html){return `<div class="actions">${html}</div>`;}
function action(id,text,primary=false){return `<button id="${id}"${primary?' class="primary"':''}>${text}</button>`;}
function showDialog(kind){if(cMode.failed){haltCMode();return;}mode=kind==='intro'?'menu':'dialog';currentDialog=kind;clearKeys();let html='';
 if(kind==='intro')html=`<h1>${tx('笨鸟先飞','A Bird’s<br>Mathematical Adventure')}</h1><div class="keys"><span><kbd>←</kbd><kbd>→</kbd> ${tx('前进 / 后退','move')}</span><span><kbd>↑</kbd> ${tx('起跳，再按振翅','jump, then flap')}</span><span><kbd>Esc</kbd> ${tx('暂停','pause')}</span></div>${buttons(action('start',tx('开始','Start'),true)+action('levels',tx('选一关','Choose a chapter')))}${settings()}`;
 if(kind==='pause')html=`<div class="eyebrow">${tx('证明先放一放','PROOF PAUSED')}</div><h2>${tx('歇一下，不影响收敛。','A pause does not ruin the proof.')}</h2><p>${worldName()} · ${tx('本次游玩的书签在最近的旗子旁。','Your bookmark for this play session is at the latest flag.')}</p><div class="play-reminder"><p><strong>${tx('现在做什么','Current goal')}</strong><span id="pauseGoal"></span></p><p><strong>${tx('本关怎么操作','How to play this chapter')}</strong><span id="pauseControls"></span></p></div>${buttons(action('resume',tx('继续飞','Keep flying'),true)+action('retry',tx('回到书签','Return to bookmark'))+action('levels',tx('选关','Worlds'))+action('proof',tx('这是什么数学？','Where is the mathematics?')))}${settings()}<p class="fine">${tx('↑ 起跳，松开可以跳低一点；空中再按一次 ↑ 有一次振翅。R 快速回到书签。','↑ jumps; release early for a smaller hop. Press ↑ once more in the air to flap. R returns to your bookmark.')}</p>`;
 if(kind==='math')html=`<div class="eyebrow">${tx('飞过去以后，再慢慢理解','PLAY FIRST. UNDERSTAND AT YOUR OWN PACE.')}</div><h2>${worldName()}</h2><div class="proof"><span class="proof-label">${tx('本关真正成立的命题','THE PRECISE LOCAL CLAIM')}</span>${local(L.proof)}</div><p class="math-note">${local(L.boundary)}</p>${buttons(action('resume',tx('回到小鸟','Back to the bird'),true)+action('levels',tx('选一关','Choose a chapter')))}`;
 if(kind==='levels')html=chapterChooser({lang,levels:LEVELS,records:progress.records,sessionOnly:cMode.enabled});
 if(kind==='complete'){const next=nextWorld();html=`<div class="eyebrow">${tx('这一步，成立了','THIS STEP IS ESTABLISHED')}</div><h2>${worldName()}</h2><div class="collect">◇ ${collected} / ${coins.length}</div><p>${local(L.completion||L.jokes[1])}</p>${buttons(next?action('next',tx('翻到下一页 →','Turn the page →'),true)+action('proof',tx('看看这一步的数学','See the mathematics')):action('levels',tx('再飞一页','Another flight'),true)+action('proof',tx('看看这一步的数学','See the mathematics')))}${buttons(action('replay',tx('再玩这一关','Replay this world'))+action('site',tx('回去慢慢理解','Back to reading')))}`;}
 if(cMode.enabled)html=`<p class="fine">${tx('C 可选实验：宽体碰撞已调整。进度仅本页临时保留，刷新或关闭即清除，不读取或保存原游戏成绩。','Optional C experiment: wider collisions. Progress stays only in this page and clears on reload or close. Original game scores are neither loaded nor saved.')}</p>`+html;
 $('#dialogHost').innerHTML=`<section class="dialog ${kind==='intro'?'hero':''}" role="dialog" aria-modal="true"${kind==='pause'?' tabindex="-1"':''} aria-label="${tx('游戏菜单','Game menu')}"><p id="progressStatus" class="progress-status" role="status" hidden></p>${html}</section>`;
 const on=(id,fn)=>{const el=$('#'+id);if(el)el.onclick=fn;};on('start',()=>buildLevel(continueWorld()));on('resume',()=>{if(transitioning)showDialog('complete');else resume();});on('retry',()=>{resume();respawn();});on('levels',()=>showDialog('levels'));on('proof',()=>showDialog('math'));on('next',()=>{const next=nextWorld();if(next)buildLevel(next.runtime);});on('replay',()=>buildLevel(levelIndex));on('site',()=>location.href=lang?'../../en/':'../../');$$('[data-level]').forEach(b=>b.onclick=()=>{buildLevel(+b.dataset.level);});on('exportProgress',()=>{const blob=new Blob([exportProgress(progress)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='bird-math-adventure-progress.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});on('importProgress',()=>$('#progressFile').click());if($('#progressFile'))$('#progressFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>100000)throw new Error('Save file is too large');const imported=importProgress(await file.text(),progress);if(!saveProgress(progressStorage,imported)){showSaveWarning();return;}progress=imported;showDialog(kind);showProgressStatus('imported');}catch{showProgressStatus('import-error',true);}};
 if($('#reduceMotion'))$('#reduceMotion').onchange=e=>{reduced=e.target.checked;};if($('#enableAudio'))$('#enableAudio').onchange=e=>{muted=!e.target.checked;updateSound();tone(600,.08);};window.MathNotes?.render($('#dialogHost'));updateHUD(true);if(kind==='pause'){$('#pauseGoal').textContent=$('#currentGoal').textContent;$('#pauseControls').textContent=currentPlayInstructions;const dialog=$('#dialogHost .dialog');dialog.focus({preventScroll:true});dialog.scrollTop=0;}else $('#dialogHost button')?.focus();
 if(progressStatus)showProgressStatus(progressStatus.key,progressStatus.failed);
}
function updateSound(){$('#sound').innerHTML=muted?'♪<span class="slash">╱</span>':'♪';$('#sound').setAttribute('aria-label',tx(muted?'开启音效':'静音',muted?'Enable sound':'Mute'));try{localStorage.setItem('missingLemmaSound',muted?'off':'on');}catch{}}
function updateLanguage(){translateShell();refreshCPreviewCopy();document.title=tx('笨鸟先飞 · 小鸟的数学大冒险','A Bird’s Mathematical Adventure');$('#home').href=lang?'../../en/':'../../';$('#webglError a').href=lang?'../../en/':'../../';$('#debug summary').textContent=tx('验收','QA');document.documentElement.lang=lang?'en':'zh-CN';$('#brandLabel').textContent=tx('笨鸟先飞','A Bird’s Math Adventure');$('#lang').textContent=lang?'中文':'EN';$('#energyText').textContent=tx('振翅','flap');$('#flyLabel').textContent=tx('飞一下','flap');$('#world').setAttribute('aria-label',tx('数学小鸟平台游戏','Mathematical bird platform adventure'));$('#pause').setAttribute('aria-label',tx('暂停游戏','Pause game'));$('#math').setAttribute('aria-label',tx('数学说明','Mathematical explanation'));$('#lang').title=tx('切换语言','Switch language');$('#sound').title=tx('音效','Sound');$('#math').title=tx('这是什么数学？','Where is the mathematics?');$('#pause').title=tx('暂停','Pause');$('#home').setAttribute('aria-label',tx('返回数学网站','Return to the mathematics site'));const touchLabels=[tx('向左','Move left'),tx('向右','Move right'),tx('跳跃或振翅','Jump or flap')];$$('#touch button').forEach((b,i)=>b.setAttribute('aria-label',touchLabels[i]));try{localStorage.setItem('missingLemmaLang',lang);}catch{}updateSound();}
$('#lang').onclick=()=>{lang=1-lang;syncLanguageUrl();const oldDialog=currentDialog;updateLanguage();showToast(tx('已切换至中文。','Language changed to English.'),2);if(mode==='playing'){labels.forEach(s=>s.userData.refresh?.());$('#levelName').textContent=worldName();hintLeft=5;updateHUD(true);world.focus();}else{labels.forEach(s=>s.userData.refresh?.());$('#levelName').textContent=worldName();updateHUD(true);showDialog(oldDialog||'pause');}};$('#debug').addEventListener('toggle',()=>updateHUD(true));$('#sound').onclick=()=>{muted=!muted;updateSound();tone(600,.08);if(mode==='playing')world.focus();};$('#pause').onclick=()=>mode==='playing'?showDialog('pause'):resume();$('#math').onclick=()=>showDialog('math');
function resize(){const w=innerWidth,h=innerHeight,aspect=w/h;const viewH=L.kind==='wrap'?Math.max(19,16/aspect):['permutation','vector'].includes(L.kind)?(aspect<.8?21:20):(aspect<.8?21:16);camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();renderer.setSize(w,h);}addEventListener('resize',resize);
let accumulator=0,cVisualAccumulator=0,last=performance.now();
function frame(now){
 requestAnimationFrame(frame);
 const jsStart=performance.now(),rawMs=Math.max(.01,now-last),dt=Math.min(.05,rawMs/1000);last=now;
 const playingNow=mode==='playing',tickStart=performance.now();
 if(playingNow&&!cMode.failed){accumulator+=dt;while(accumulator>=PHYSICS.step&&mode==='playing'&&!cMode.failed){tick(PHYSICS.step);if(cMode.failed){accumulator=0;break;}accumulator-=PHYSICS.step;}}else{accumulator=0;if(!cMode.failed&&(mode==='menu'||currentDialog==='complete')){worldTime+=dt;birdExpression.advance(dt);if(cMode.enabled){cVisualAccumulator+=dt;while(cVisualAccumulator>=PHYSICS.step&&!cMode.failed){sampleCMode({body:p,dt:PHYSICS.step,reducedMotion:reduced});cVisualAccumulator-=PHYSICS.step;}}}else cVisualAccumulator=0;}
 const tickMs=performance.now()-tickStart;
 const wrapRoom=L.kind==='wrap'&&p.x>=state.wrap.left-.6&&p.x<=state.wrap.right+.3&&p.y<=state.wrap.rim+1;
 cameraX=wrapRoom?24:frameCameraX({current:cameraX,x:p.x,width:camera.right-camera.left,levelWidth:L.width,facing:p.facing,scale:p.scale,dt,reduced,maxPanSpeed:L.kind==='wrap'?10.5:Infinity});
 const targetY=L.kind==='shadow'?1.7:['permutation','vector'].includes(L.kind)?Math.max(3.8,p.y+3.5-camera.top):L.kind==='wrap'?5.1:3.1;camera.position.set(cameraX,targetY+5,22);camera.lookAt(cameraX,targetY,0);
 if(!compat){
  for(const layer of root.userData.sceneryLayers||[])layer.mesh.position.x=(layer.baseX||0)+(cameraX-6)*(reduced?1:layer.parallax);
  sun.position.set(cameraX-9,17,12);sun.target.position.set(cameraX,0,0);bird.group.position.set(p.x,p.y,0);bird.group.scale.setScalar(p.scale);bird.group.visible=true;
  halo.visible=invul>0;halo.position.set(p.x,p.y+.68*p.scale,.22);halo.scale.setScalar(p.scale);halo.material.opacity=.1+Math.min(1,invul)*.22;
  const birdInput={time:worldTime,delta:dt,speed:Math.abs(p.vx)/PHYSICS.maxSpeed,flying:!p.grounded,facing:p.facing,dark:levelIndex===7,reducedMotion:reduced,...expressionInput()};bird.update(birdInput);crest.update(birdInput);applyNativeBirdPose(bird.group,p,birdContactPose(p,physicalPlatforms()));
  const wrapGhost=L.kind==='wrap'?wrapPreview(p,state.wrap):null;ghost.group.visible=L.kind==='shadow'||wrapGhost!==null;
  ghostHalo.visible=L.kind==='shadow'&&ghost.group.visible&&(state.shadowHitUntil||0)>worldTime;if(ghostHalo.visible){ghostHalo.position.set(p.x,p.y-4+.64,.22);ghostHalo.material.opacity=.45*Math.min(1,(state.shadowHitUntil-worldTime)/.7);}
  birdPresentation.beforeGhostUpdate();ghost.update(birdInput);ghostCrest.update(birdInput);
  if(ghost.group.visible){const ghostBody={...p,x:L.kind==='wrap'?wrapGhost:p.x,y:L.kind==='wrap'?p.y:p.y-4,on:L.kind==='wrap'?p.on:null};const contact=L.kind==='shadow'?shadowContactBody(p,state.shadowSurfaces||[]):p;applyNativeBirdPose(ghost.group,ghostBody,birdContactPose(contact,L.kind==='shadow'?state.shadowSurfaces||[]:physicalPlatforms()));}
  birdPresentation.update(L.kind,p,state.wrap);
  shadow.position.set(p.x,p.on?p.on.y+.085:-.01,.15);shadow.visible=!!p.on;shadow.scale.setScalar(p.scale);
 }
 for(const q of particles){q.life-=dt;q.vy-=9*dt;q.m.position.x+=q.vx*dt;q.m.position.y+=q.vy*dt;q.m.rotation.x+=dt*4;q.m.scale.setScalar(Math.max(.05,q.life/.7));if(q.life<=0){root.remove(q.m);q.m.geometry.dispose();}}
 particles=particles.filter(q=>q.life>0);
 const renderStart=performance.now();if(!cMode.failed){try{renderer.render(scene,camera);}catch(error){if(!cMode.enabled)throw error;cMode.fail('render-exception',error);}}if(cMode.failed)haltCMode();const renderMs=performance.now()-renderStart,jsMs=performance.now()-jsStart;
 if(playingNow&&wasPlaying){
  perfSamples.push({at:now,ms:rawMs,tickMs,renderMs,jsMs});while(perfSamples.length&&perfSamples[0].at<now-5000)perfSamples.shift();
  if(now-lastPerfCalc>250&&perfSamples.length>=2){
   const times=perfSamples.map(s=>s.ms),sum=times.reduce((a,b)=>a+b,0),sorted=[...times].sort((a,b)=>a-b),mean=key=>+(perfSamples.reduce((a,b)=>a+b[key],0)/perfSamples.length).toFixed(2);
   perfStats={fps:+(1000*times.length/sum).toFixed(1),p95:+sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))].toFixed(2),slowPct:+(100*times.filter(ms=>ms>33.34).length/times.length).toFixed(1),seconds:+(sum/1000).toFixed(2),count:times.length,tickMs:mean('tickMs'),renderMs:mean('renderMs'),jsMs:mean('jsMs')};lastPerfCalc=now;
  }
 }
 wasPlaying=playingNow;
}

updateLanguage();buildLevel(CAMPAIGN[0].runtime,true);$('#loading').remove();showDialog('intro');requestAnimationFrame(frame);
// Read-only public QA contract. No teleport or hidden completion functions.
Object.defineProperty(window,'missingLemmaState',{get:()=>JSON.parse(app.dataset.state||'{}')});

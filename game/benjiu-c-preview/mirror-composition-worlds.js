/**
 * Chapters 6 and 7. Call updateBaseWorld before the shared 120 Hz stepBody,
 * onBaseHeadHit from its head callback, and onBaseLanding with p.landed.
 * The ray segments and rail coordinates below are the model for both renderers.
 */
export const REFLECTION_GEOMETRY=Object.freeze({
  source:{x:14,y:4.7},bounds:{left:13,right:37,bottom:2,top:8.7},
  mirrors:[{x:22,y:4.7,length:1.7},{x:22,y:7.1,length:1.7}],
  receiver:{x:35,y:7.1,r:.4},floor:-3.6,gateX:49,
});
export const COMPOSITION_GEOMETRY=Object.freeze({
  origin:32,scale:2.5,bridgeY:.85,bridgeWidth:5.5,motorSpeed:6,
  floor:-3.6,gateX:60,translateX:22,doubleX:29,resetX:15.5,
});

export const LEVELS_BASE=[
  {id:6,kind:'reflection',width:76,color:0xe2e9e6,ink:0x4a7272,accent:0xc8ad70,ground:0xd4dfd8,
    name:['借一束光','Borrow a Little Light'],
    tag:['光会拐弯。先问问镜子。','Light takes corners. Ask the mirrors.'],
    hint:['跳起来顶一下镜子下的按钮。第一面管上下，第二面管左右。','Jump and bump the buttons below the mirrors. The first sends light up or down; the second sends it left or right.'],
    task:['把光送进金色接收器，固定桥面。下面有回路，高处还藏着一根羽毛。','Send the beam into the gold receiver to lock the bridge. There is a safe return below and a feather above.'],
    jokes:[['墙收到了。桥还没收到。','The wall got the message. The bridge did not.'],['光拐对了，路就直了。','The light took the right turns. Your path is straight.'],['镜子没有猜答案。它只管反射。','The mirrors did not guess. They reflected.']],
    proof:[String.raw`在画面平面内，入射光的单位方向为 \(v\)，镜面的单位法向量为 \(n\)。反射方向按
\[v_{\mathrm{out}}=v-2(v\cdot n)n\]
计算。法向分量反号，切向分量保持不变，故入射角等于反射角。两面镜子都只有与水平线成 \(45^\circ\) 或 \(-45^\circ\) 的两种姿态。向右的光遇到第一面上倾的镜子后向上，向上的光再遇到第二面上倾的镜子后向右，因而到达接收器。镜面坐标、有限镜长、墙和接收器的交点共同决定每一段光路。`,String.raw`For an incoming unit direction \(v\) and a mirror's unit normal \(n\), the reflected direction is
\[v_{\mathrm{out}}=v-2(v\cdot n)n.\]
The normal component changes sign and the tangential component stays unchanged, so the angles of incidence and reflection agree. Each mirror has exactly two orientations, \(45^\circ\) and \(-45^\circ\) from the horizontal. An upward-tilting first mirror reflects the rightward beam upward; an upward-tilting second mirror reflects that upward beam rightward into the receiver. The finite mirror segments, their coordinates, the walls and the receiver determine every ray intersection.`],
    boundary:['这是二维几何光学模型；光束线宽只为看清，碰撞计算使用中心射线。接收器有真实的有限半径。首次命中会扣住桥的机械锁，之后转动镜子仍会改变光路，但不会收回已固定的桥或出口权限。','This is a two-dimensional geometric-optics model. The visible beam has thickness for readability; intersections use its center ray. The receiver has a finite radius. Its first hit latches a mechanical bridge lock. Later mirror turns still change the ray, while the secured bridge and exit remain available.'],
  },
  {id:7,kind:'composition',width:80,color:0xece4da,ink:0x776350,accent:0xc5a369,ground:0xdfd3bd,
    name:['先去哪一站','Which Stop Comes First?'],
    tag:['同样两站，先后很有意见。','The same two stops disagree about the order.'],
    hint:['初值是 1。顶“加三”，或先绕过去落上“翻倍”。每站每轮只算一次。顶左边“重来”可重新出发。','Start at 1. Bump Add three, or walk past it and land on Double first. Each stop works once per round. Bump Restart on the left to try again.'],
    task:['让两次操作把滑桥送到 8，再亲自落上停稳的桥。到 5 也能从下方返回重来。','Send the bridge to 8 with both operations, then land on it after it stops. If it reaches 5, the lower path brings you back to Restart.'],
    jokes:[['还是这两站，桥却去了隔壁。','The same two stops sent the bridge next door.'],['先加，再翻。桥记住了。','Add first, double next. The bridge remembers.'],['重来不收费。小鸟松了一口气。','Restart is free. The bird is relieved.']],
    proof:[String.raw`滑桥使用局部坐标，初值为 \(x_0=1\)。顶碰站执行 \(T(x)=x+3\)，落脚站执行 \(D(x)=2x\)。每一轮每站仅在第一次对应的真实碰撞事件时执行，事件先后就是复合次序：
\[D(T(1))=2(1+3)=8,\qquad T(D(1))=2\cdot1+3=5.\]
因此 \(D\circ T\ne T\circ D\)。局部坐标与画面横坐标的对应是 \(X=32+2.5x\)，没有把不同结果截断到同一个位置。电机把实际承重桥送到这个目标位置；鸟落到已完成两步且停稳的八号桥后打开出口。`,String.raw`The bridge uses a local coordinate with initial value \(x_0=1\). A head bump executes \(T(x)=x+3\); landing at the other stop executes \(D(x)=2x\). Each stop operates only on its first matching physical collision in a round. Their event order is their composition order:
\[D(T(1))=2(1+3)=8,\qquad T(D(1))=2\cdot1+3=5.\]
Thus \(D\circ T\ne T\circ D\). Local coordinates map to screen-world positions by \(X=32+2.5x\), without clamping different results to the same position. A motor moves the load-bearing bridge to that target. Landing on its stopped eight-position after both operations unlocks the exit.`],
    boundary:['数字记录两次离散操作的真实结果；滑桥途中的位置只是电机运动，不是额外的函数运算。顶碰重置台开始新一轮，所有站点恢复可用。成功落到八号桥后保存出口权限，因此返回实验或从检查点重生不会把小鸟锁在门后。','The number records the exact result of the discrete operations. Intermediate bridge positions are motor travel, not extra function applications. Bumping Restart begins a new round and re-enables both stops. A successful landing at eight saves the exit unlock, so later experiments or checkpoint respawns cannot trap the bird behind a closed gate.'],
  },
];

const cross=(a,b)=>a.x*b.y-a.y*b.x;
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const unit=v=>{const d=Math.hypot(v.x,v.y);if(!Number.isFinite(d)||d===0)throw new RangeError('Direction must be finite and nonzero');return {x:v.x/d,y:v.y/d};};
export function reflectedDirection(direction,normal){
  const v=unit(direction),n=unit(normal),d=dot(v,n);
  return unit({x:v.x-2*d*n.x,y:v.y-2*d*n.y});
}
export function mirrorSegment(mirror,orientation){
  if(orientation!==0&&orientation!==1)throw new RangeError('A mirror has exactly two orientations');
  const q=Math.SQRT1_2,dy=orientation===1?q:-q,h=mirror.length/2;
  return {a:{x:mirror.x-q*h,y:mirror.y-dy*h},b:{x:mirror.x+q*h,y:mirror.y+dy*h},normal:{x:-dy,y:q}};
}
function raySegment(origin,direction,a,b){
  const edge={x:b.x-a.x,y:b.y-a.y},delta={x:a.x-origin.x,y:a.y-origin.y},det=cross(direction,edge);
  if(Math.abs(det)<1e-12)return null;
  const t=cross(delta,edge)/det,u=cross(delta,direction)/det;
  return t>1e-8&&u>=-1e-10&&u<=1+1e-10?t:null;
}
function rayCircle(origin,direction,circle){
  const d={x:origin.x-circle.x,y:origin.y-circle.y},b=dot(d,direction),disc=b*b-dot(d,d)+circle.r*circle.r;
  if(disc<0)return null;
  const near=-b-Math.sqrt(disc),far=-b+Math.sqrt(disc);
  return near>1e-8?near:far>1e-8?far:null;
}
/** A finite, nearest-intersection ray tracer, shared by Three, Canvas and unlocks. */
export function traceMirrorBeam(orientations,geometry=REFLECTION_GEOMETRY){
  if(orientations.length!==geometry.mirrors.length)throw new RangeError('One orientation is required per mirror');
  const mirrors=geometry.mirrors.map((m,i)=>mirrorSegment(m,orientations[i])),b=geometry.bounds;
  const walls=[[{x:b.left,y:b.bottom},{x:b.right,y:b.bottom}],[{x:b.right,y:b.bottom},{x:b.right,y:b.top}],[{x:b.right,y:b.top},{x:b.left,y:b.top}],[{x:b.left,y:b.top},{x:b.left,y:b.bottom}]];
  let origin={...geometry.source},direction={x:1,y:0},previousMirror=-1;
  const segments=[];
  for(let bounce=0;bounce<8;bounce++){
    let nearest=null;
    const offer=(distance,hit,index=-1)=>{if(distance!==null&&(!nearest||distance<nearest.distance))nearest={distance,hit,index};};
    walls.forEach(([a,z],i)=>offer(raySegment(origin,direction,a,z),'wall',i));
    mirrors.forEach((m,i)=>{if(i!==previousMirror)offer(raySegment(origin,direction,m.a,m.b),'mirror',i);});
    offer(rayCircle(origin,direction,geometry.receiver),'receiver');
    if(!nearest)break;
    const to={x:origin.x+direction.x*nearest.distance,y:origin.y+direction.y*nearest.distance};
    segments.push({from:{...origin},to,direction:{...direction},hit:nearest.hit,index:nearest.index});
    if(nearest.hit!=='mirror')return {segments,lit:nearest.hit==='receiver'};
    direction=reflectedDirection(direction,mirrors[nearest.index].normal);origin=to;previousMirror=nearest.index;
  }
  return {segments,lit:false};
}

export function compositionRound(){return {value:1,order:[],used:{T:false,D:false},round:0};}
export function applyComposition(s,operation){
  if(operation!=='T'&&operation!=='D')throw new RangeError('Unknown operation');
  if(s.used[operation])return false;
  s.value=operation==='T'?s.value+3:2*s.value;s.used[operation]=true;s.order.push(operation);return true;
}
export function restartComposition(s){s.value=1;s.order=[];s.used={T:false,D:false};s.round++;}
export const compositionPosition=value=>COMPOSITION_GEOMETRY.origin+COMPOSITION_GEOMETRY.scale*value;

function gateAt(a,x){
  const g=a.makeGate(x,0);g.bottom=-3.6;g.height=16;
  g.f.y=g.bottom+g.height;g.f.h=g.height;g.f.group.position.y=g.f.y;
  g.curtain.position.y=g.bottom+g.height/2;g.curtain.scale.set(.12,g.height,1.7);
  a.state.specialGates.push(g);return g;
}
function openGate(g,open){g.open=open;g.f.active=!open;g.curtain.visible=!open;}
function active(f,value){f.active=value;f.group.visible=value;}
function refresh(s){for(const l of s.readouts)l.userData?.refresh?.();}
function rod(a,x1,y1,x2,y2,color,z=-.6,parent=a.root,width=.055){
  const mesh=a.box((x1+x2)/2,(y1+y2)/2,z,Math.hypot(x2-x1,y2-y1),width,.07,color,parent);
  mesh.rotation.z=Math.atan2(y2-y1,x2-x1);return mesh;
}
function addReturnLoop(a,width,steps){
  a.platform((width+8)/2,-3.6,width-4,{h:.8,color:0xbacbc3,baseRole:'safety'});
  for(const x of steps)if(x<width)a.platform(x,-1.75,3.2,{h:.5,color:0xc6d3ca,baseRole:'return'});
  a.label(()=>a.tx('落下去，绕回来。','Drop down. Loop back.'),39,-2.65,{w:10,font:25,opacity:.7});
}

export function buildBaseWorld(kind,a){
  if(kind!=='reflection'&&kind!=='composition')return null;
  a.state.specialGates=[];a.state.analysisReady=false;
  return kind==='reflection'?buildReflection(a):buildComposition(a);
}

function buildReflection(a){
  const {THREE,state,root,platform,box,label,feather,checkpointAt,tx}=a,G=REFLECTION_GEOMETRY;
  const s=state.reflection={orientations:[0,0],beam:traceMirrorBeam([0,0]),solved:false,readouts:[],mirrorMeshes:[],beamMeshes:[],buttons:[],elapsed:0};
  addReturnLoop(a,76,[38,43]);
  platform(23,0,26,{h:1.6,color:0xd4dfd8,baseRole:'workbench'});
  platform(61,0,32,{h:1.8,color:0xd4dfd8,baseRole:'exit'});
  s.bridge=platform(40.5,1.0,8.5,{oneWay:true,h:.45,active:false,color:0xbacfae,baseRole:'lightBridge'});
  s.gate=gateAt(a,G.gateX);checkpointAt(15,0);checkpointAt(33,0);checkpointAt(54,0);
  // A paper optical bench, behind the bird. Its actual edges terminate rays.
  const B=G.bounds;
  box((B.left+B.right)/2,(B.bottom+B.top)/2,-1.4,B.right-B.left,B.top-B.bottom,.08,0xe9eee6);
  for(const [x1,y1,x2,y2] of [[B.left,B.bottom,B.right,B.bottom],[B.right,B.bottom,B.right,B.top],[B.right,B.top,B.left,B.top],[B.left,B.top,B.left,B.bottom]])rod(a,x1,y1,x2,y2,0x9daea3,-1.25);
  for(const x of [16,19,22,25,28,31,34])rod(a,x,B.bottom,x,B.top,0xd6dfd3,-1.3,a.root,.025);
  box(G.source.x-.34,G.source.y,-.8,.68,.8,.32,0xc9af70);
  box(G.source.x+.05,G.source.y,-.57,.1,.42,.12,0xf4df9b);
  for(let i=0;i<2;i++){
    const m=G.mirrors[i],group=new THREE.Group();group.position.set(m.x,m.y,-.35);root.add(group);
    box(0,0,0,m.length,.13,.16,0x668b91,group);box(0,.045,.1,m.length-.08,.045,.08,0xe0f0e8,group);
    rod(a,0,0,0,.66,0xa5b7aa,.1,group,.035);s.mirrorMeshes.push(group);
    const x=i===0?18.5:30.8,f=platform(x,3.15,2.5,{h:.75,solid:true,color:i===0?0xb8cbd0:0xd5c5ac,baseHead:'mirror',mirrorIndex:i});s.buttons.push(f);
    box(0,-.38,1.12,.68,.23,.12,0xf0e9d1,f.group);
    label(String(i+1),x,2.79,{w:1.4,font:37,bold:true,z:1.3});
    s.readouts.push(label(()=>i===0?tx('第一镜：','Mirror one: ')+tx(s.orientations[0]?'向上':'向下',s.orientations[0]?'up':'down'):tx('第二镜：','Mirror two: ')+tx(s.orientations[1]?'向右':'向左',s.orientations[1]?'right':'left'),x,1.55,{w:8,font:27}));
    // Linkages connect each broad head-bump control to its visible mirror.
    rod(a,x,3.2,x,3.75,0x93a7a2,-1.1);rod(a,x,3.75,m.x,m.y,0x93a7a2,-1.1);
  }
  label(()=>tx('顶一下，换个方向','Bump to switch direction'),25,9.35,{w:13,font:29});
  const receiver=new THREE.Group();receiver.position.set(G.receiver.x,G.receiver.y,-.45);root.add(receiver);
  s.receiverRing=new THREE.Mesh(new THREE.TorusGeometry(G.receiver.r,.075,8,24),new THREE.MeshStandardMaterial({color:0xc4a566,roughness:.7}));receiver.add(s.receiverRing);
  s.receiverCore=box(0,0,.03,.37,.37,.12,0xaebfac,receiver);s.receiverCore.material=s.receiverCore.material.clone();
  rod(a,G.receiver.x,G.receiver.y-.5,40.5,1.5,0xadba9e,-1.1);
  s.ghost=[];for(const y of [.56,1.0])s.ghost.push(rod(a,36.25,y,44.75,y,0xa4b99b,-.4));
  for(let i=0;i<9;i++){const m=box(0,0,-.2,1,.065,.075,0xe1b856);m.visible=false;s.beamMeshes.push(m);}
  s.readouts.push(label(()=>s.solved?tx('桥已锁定。光的功劳。','Bridge locked. Thank the light.'):tx('把光送进金色圆环','Send the beam into the gold ring'),41,5.6,{w:13,font:29}));
  platform(32.1,5.15,2.4,{oneWay:true,h:.34,color:0xc8d5b8,baseRole:'secret'});
  for(const [x,y,secret] of [[14,1.4],[18.5,4.4],[25.5,1.4],[30.8,4.4],[32.1,6.4,true],[39,2.2],[43,2.2],[55,1.4],[64,1.8],[71,1.3],[39,-2.3,true]])feather(x,y,!!secret);
  syncReflection(a);return s;
}

function syncReflection(a){
  const s=a.state.reflection;s.beam=traceMirrorBeam(s.orientations);
  const newlySolved=s.beam.lit&&!s.solved;if(s.beam.lit)s.solved=true;
  s.mirrorMeshes.forEach((m,i)=>{m.rotation.z=s.orientations[i]?Math.PI/4:-Math.PI/4;});
  s.beamMeshes.forEach((mesh,i)=>{
    const seg=s.beam.segments[i];mesh.visible=!!seg;if(!seg)return;
    mesh.position.set((seg.from.x+seg.to.x)/2,(seg.from.y+seg.to.y)/2,-.2);
    mesh.scale.set(Math.hypot(seg.to.x-seg.from.x,seg.to.y-seg.from.y),.065,.075);
    mesh.rotation.z=Math.atan2(seg.to.y-seg.from.y,seg.to.x-seg.from.x);
  });
  s.receiverCore.material.color.setHex(s.beam.lit?0xe9cf71:s.solved?0x8ba77d:0xaebfac);
  active(s.bridge,s.solved);s.ghost.forEach(m=>{m.visible=!s.solved;});openGate(s.gate,s.solved);a.state.analysisReady=s.solved;
  if(newlySolved){a.tone?.(830,.14);a.showToast?.(a.tx(...LEVELS_BASE[0].jokes[1]),3);}
  refresh(s);
}

function buildComposition(a){
  const {state,platform,box,label,feather,checkpointAt,tx}=a,G=COMPOSITION_GEOMETRY;
  const s=state.composition={...compositionRound(),solved:false,readouts:[],elapsed:0,lastDisplay:'',lastLanding:null};
  addReturnLoop(a,80,[47,53]);
  platform(27.5,0,35,{h:1.7,color:0xe0d4bf,baseRole:'workbench'});
  platform(68.5,0,27,{h:1.8,color:0xe0d4bf,baseRole:'exit'});
  checkpointAt(18,0);checkpointAt(41,0);checkpointAt(66,0);
  s.translate=platform(G.translateX,3.25,2.6,{h:.75,solid:true,color:0xc6cba3,baseHead:'translate'});
  s.double=platform(G.doubleX,1.65,4.1,{h:.5,color:0xb9cdd4,baseLanding:'double'});
  s.reset=platform(G.resetX,3.25,2.5,{h:.75,solid:true,color:0xd4b3a1,baseHead:'reset'});
  for(const f of [s.translate,s.reset])box(0,-.38,1.12,.75,.23,.1,0xf7edd3,f.group);
  s.translateStamp=box(.79,-.38,1.16,.22,.22,.08,0x83965a,s.translate.group);
  s.doubleStamp=box(1.55,.10,1.16,.22,.22,.08,0x6d91a2,s.double.group);
  label(()=>tx('顶：加三','Bump: add three'),G.translateX,4.3,{w:8,font:30});
  label(()=>tx('落：翻倍','Land: double'),G.doubleX,2.8,{w:8,font:30});
  label(()=>tx('顶：重来','Bump: restart'),G.resetX,4.3,{w:7.5,font:29});
  label(()=>tx('每轮每站一次','Each stop, once per round'),25,7.8,{w:13,font:28,opacity:.75});
  s.readouts.push(label(()=>tx('当前数字 ','Current number ')+s.value,37.5,5.4,{w:10,font:38,bold:true}));
  const orderText=()=>s.order.map(op=>op==='T'?tx('加三','add three'):tx('翻倍','double')).join(tx('，再',' then '));
  s.readouts.push(label(()=>s.order.length?orderText():tx('先去哪一站？','Which stop first?'),37.5,4.2,{w:13,font:28}));
  s.readouts.push(label(()=>s.solved?tx('八号站已到。门开着。','Eight reached. The gate stays open.'):s.order.length===2?(s.value===8?tx('等桥停稳，再落上去','Wait for the bridge, then land on it'):tx('到了 5。左边可以重来。','At 5. Restart is back on the left.')):tx('桥照着你的次序走','The bridge follows your order'),52,6.2,{w:14,font:29}));
  // The exact affine map sets the target. Motor movement is visible and physical.
  s.bridge=platform(compositionPosition(1),G.bridgeY,G.bridgeWidth,{oneWay:true,h:.48,color:0xccb684,baseLanding:'output',baseRole:'output'});
  box(0,-.64,-.70,.48,.48,.55,0x9b875f,s.bridge.group);
  for(const y of [.02,.29])rod(a,33.5,y,54,y,0xb9a47c,-.9);
  for(const value of [1,2,4,5,8]){
    const x=compositionPosition(value);rod(a,x,-.02,x,-.48,0xa58d66,-.6);
    label(String(value),x,-.91,{w:1.8,font:30,bold:value===8});
    if(value===5||value===8){rod(a,x,-1.32,x,2.4,value===8?0x8ea977:0xbfae95,-1.05);rod(a,x-.45,2.4,x+.45,2.4,value===8?0x8ea977:0xbfae95,-1.05);}
  }
  s.gate=gateAt(a,G.gateX);
  platform(23.6,5.45,2.4,{oneWay:true,h:.32,color:0xc6d0af,baseRole:'secret'});
  for(const [x,y,secret] of [[13,1.3],[22,4.45],[29,2.9],[23.6,6.7,true],[35,1.95],[41,1.3],[52,2.15],[58,1.4],[66,1.5],[73,1.4],[48,-2.3,true]])feather(x,y,!!secret);
  syncComposition(a);return s;
}

function syncComposition(a){
  const s=a.state.composition;
  s.translateStamp.visible=s.used.T;s.doubleStamp.visible=s.used.D;
  openGate(s.gate,s.solved);a.state.analysisReady=s.solved;
  const display=[s.value,s.order.join(''),s.solved,s.round].join('|');
  if(display!==s.lastDisplay){s.lastDisplay=display;refresh(s);}
}

export function updateBaseWorld(kind,a,dt){
  if(kind!=='reflection'&&kind!=='composition')return;
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('dt must be finite and nonnegative');
  if(kind==='reflection'){const s=a.state.reflection;if(s)s.elapsed+=dt;return;}
  const s=a.state.composition;if(!s)return;s.elapsed+=dt;
  const target=compositionPosition(s.value),delta=target-s.bridge.x,travel=COMPOSITION_GEOMETRY.motorSpeed*dt;
  const next=Math.abs(delta)<=travel?target:s.bridge.x+Math.sign(delta)*travel;
  a.movePlatform(s.bridge,next,COMPOSITION_GEOMETRY.bridgeY);
  syncComposition(a);
}

export function onBaseHeadHit(f,a){
  if(!f?.baseHead)return false;
  if(f.baseHead==='mirror'){
    const s=a.state.reflection;if(!s)return false;
    s.orientations[f.mirrorIndex]=1-s.orientations[f.mirrorIndex];syncReflection(a);
    a.tone?.(s.beam.lit?830:440+f.mirrorIndex*110,.09);
    if(!s.beam.lit&&!s.solved)a.showToast?.(a.tx(...LEVELS_BASE[0].jokes[0]),2.3);
    return true;
  }
  const s=a.state.composition;if(!s)return false;
  if(f.baseHead==='reset'){
    restartComposition(s);s.lastLanding=null;syncComposition(a);
    a.showToast?.(a.tx(...LEVELS_BASE[1].jokes[2]),2.6);a.tone?.(430,.11);return true;
  }
  if(f.baseHead==='translate'){
    if(applyComposition(s,'T')){a.tone?.(590,.1);compositionFeedback(a);}return true;
  }
  return false;
}
function compositionFeedback(a){
  const s=a.state.composition;syncComposition(a);
  if(s.order.length===2)a.showToast?.(a.tx(...LEVELS_BASE[1].jokes[s.value===8?1:0]),2.8);
  else a.showToast?.(a.tx('记下了。去另一站。','Recorded. Try the other stop.'),2.2);
}
export function onBaseLanding(f,a){
  if(!f?.baseLanding||!a.state.composition)return false;
  const s=a.state.composition;
  if(f.baseLanding==='double'){
    if(applyComposition(s,'D')){a.tone?.(700,.1);compositionFeedback(a);}return true;
  }
  if(f.baseLanding==='output'){
    s.lastLanding=s.value;
    if(s.order.length===2&&s.value===8&&s.bridge.x===compositionPosition(8)&&!s.solved){
      s.solved=true;syncComposition(a);a.tone?.(880,.15);
      a.showToast?.(a.tx('八号站，落稳了。','Eight. A proper landing.'),2.8);
    }else if(s.order.length===2&&s.value===8&&!s.solved&&s.movingLandingRound!==s.round){
      s.movingLandingRound=s.round;
      a.showToast?.(a.tx('桥还在走。停稳后轻跳一下。','Still moving. Take a little hop after it stops.'),3);
    }
    return true;
  }
  return false;
}

/** Decorations only. The shared renderer draws actual platforms and gate solids. */
export function drawBaseWorld(renderer,g,phase='under'){
  if(g.L.kind!=='reflection'&&g.L.kind!=='composition')return;
  const {ctx:c,unit:u}=renderer;
  const line=(x1,y1,x2,y2,color,width=1.5,z=-.6)=>{const A=renderer.project(x1,y1,z),B=renderer.project(x2,y2,z);c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...A);c.lineTo(...B);c.stroke();};
  c.save();
  if(g.L.kind==='reflection'){
    const s=g.state.reflection;if(!s){c.restore();return;}const G=REFLECTION_GEOMETRY,B=G.bounds;
    if(phase==='under'){
      const A=renderer.project(B.left,B.top,-1.4),Z=renderer.project(B.right,B.bottom,-1.4);c.fillStyle='#e9eee6';c.fillRect(A[0],A[1],Z[0]-A[0],Z[1]-A[1]);
      for(const x of [16,19,22,25,28,31,34])line(x,B.bottom,x,B.top,'#d6dfd3',.8,-1.3);
      for(const [x1,y1,x2,y2] of [[B.left,B.bottom,B.right,B.bottom],[B.right,B.bottom,B.right,B.top],[B.right,B.top,B.left,B.top],[B.left,B.top,B.left,B.bottom]])line(x1,y1,x2,y2,'#9daea3',1.4,-1.25);
      const [sx,sy]=renderer.project(G.source.x-.34,G.source.y,-.8);c.fillStyle='#c9af70';c.fillRect(sx-u*.34,sy-u*.4,u*.68,u*.8);
      s.buttons.forEach((f,i)=>{line(f.x,3.2,f.x,3.75,'#93a7a2',1,-1.1);line(f.x,3.75,G.mirrors[i].x,G.mirrors[i].y,'#93a7a2',1,-1.1);});
      line(G.receiver.x,G.receiver.y-.5,40.5,1.5,'#adba9e',1,-1.1);
      for(const seg of s.beam.segments)line(seg.from.x,seg.from.y,seg.to.x,seg.to.y,'#e1b856',Math.max(2,u*.065),-.2);
      G.mirrors.forEach((m,i)=>{const seg=mirrorSegment(m,s.orientations[i]);line(seg.a.x,seg.a.y,seg.b.x,seg.b.y,'#668b91',Math.max(3,u*.13),-.35);line(m.x,m.y,m.x+seg.normal.x*.66,m.y+seg.normal.y*.66,'#a5b7aa',1,-.25);});
      const [x,y]=renderer.project(G.receiver.x,G.receiver.y,-.45);c.strokeStyle='#c4a566';c.lineWidth=Math.max(2,u*.12);c.beginPath();c.arc(x,y,u*G.receiver.r,0,Math.PI*2);c.stroke();c.fillStyle=s.beam.lit?'#e9cf71':s.solved?'#8ba77d':'#aebfac';c.fillRect(x-u*.185,y-u*.185,u*.37,u*.37);
      if(!s.solved){c.setLineDash([5,5]);for(const y of [.56,1])line(36.25,y,44.75,y,'#a4b99b',1.5,-.4);c.setLineDash([]);}
    }else for(const f of s.buttons){const [x,y]=renderer.project(f.x,f.y-.38,1.12);c.fillStyle='#f0e9d1';c.fillRect(x-u*.34,y-u*.115,u*.68,u*.23);}
  }else{
    const s=g.state.composition;if(!s){c.restore();return;}
    if(phase==='under'){
      for(const y of [.02,.29])line(33.5,y,54,y,'#b9a47c',2,-.9);
      for(const value of [1,2,4,5,8]){const x=compositionPosition(value);line(x,-.02,x,-.48,'#a58d66',1.5);if(value===5||value===8){line(x,-1.32,x,2.4,value===8?'#8ea977':'#bfae95',1.5,-1.05);line(x-.45,2.4,x+.45,2.4,value===8?'#8ea977':'#bfae95',1.5,-1.05);}}
      const [x,y]=renderer.project(s.bridge.x,s.bridge.y-.64,-.7);c.fillStyle='#9b875f';c.fillRect(x-u*.24,y-u*.24,u*.48,u*.48);
    }else{
      for(const f of [s.translate,s.reset]){const [x,y]=renderer.project(f.x,f.y-.38,1.12);c.fillStyle='#f7edd3';c.fillRect(x-u*.375,y-u*.115,u*.75,u*.23);}
      for(const [f,used,dx,dy,color] of [[s.translate,s.used.T,.79,-.38,'#83965a'],[s.double,s.used.D,1.55,.1,'#6d91a2']])if(used){const [x,y]=renderer.project(f.x+dx,f.y+dy,1.16);c.fillStyle=color;c.fillRect(x-u*.11,y-u*.11,u*.22,u*.22);}
    }
  }
  c.restore();
}

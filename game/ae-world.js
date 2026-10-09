/**
 * World 12: one visible point, two genuinely different measurements.
 * Update before stepBody(), passing the current input.axis. Readiness is also
 * exposed as state.analysisReady so the shared exit can enforce the mechanism.
 * All graphics, including the Canvas adapter, read this one world state.
 */
export const AE_GEOMETRY=Object.freeze({
  clampStart:20,clampStop:28,clampWidth:1.3,clampHeight:1.6,pushSpeed:1.75,
  floor:-3.6,areaX:37,areaWidth:7.6,pointX:45,pointWidth:8.4,
  areaScale:1.2,pointScale:3.2,pointMotorSpeed:1.6,
  graphX:24,graphY:4.05,graphScale:1.25,firstGateX:32,lastGateX:51,
});

// These pure rules deliberately do not use an epsilon or a pixel threshold.
export function aeValues(r,erased=false){
  if(!Number.isFinite(r)||r<0||r>2)throw new RangeError('r must be in [0, 2]');
  return {area:2*r,point:erased?0:1,atStop:r===0};
}
export function advanceAEClamp(r,distance){
  aeValues(r);
  if(!Number.isFinite(distance)||distance<0)throw new RangeError('Push distance must be nonnegative');
  // A physical travel stop, rather than rounding a small positive r to zero.
  const travelPerR=(AE_GEOMETRY.clampStop-AE_GEOMETRY.clampStart)/2;
  return distance>=r*travelPerR?0:r-distance/travelPerR;
}
export function eraseAEPoint(s){
  if(s.r!==0||s.erased)return false;
  s.erased=true;
  return true;
}
export function aeReady(s,pointHeight){return s.r===0&&s.erased===true&&pointHeight===0;}
export function formatAEValue(n){
  if(n===0)return '0';
  return n>=.005?n.toFixed(2):n.toExponential(1);
}

export const AE_LEVEL={
  id:12,kind:'ae',width:72,color:0xdfe8e5,ink:0x355f61,accent:0xc8a55f,ground:0xe6e8db,
  name:['几乎处处','Almost Everywhere'],
  tag:['面积没意见。那个点有。','The area agrees. The point has a comment.'],
  hint:['向右推夹具，直到真正碰上 0 止点。再去高台，↑ 顶一下擦点按钮。','Push the clamp right to the actual zero stop. Then climb to the high lift and bump the eraser with ↑.'],
  task:['看 A 台随面积下降，B 台却留在高处。擦去那个点，让两台在零线会合。','Lower A with the area. B stays high. Erase the one point to bring both lifts to the zero line.'],
  jokes:[
    ['这么窄了，还要占面积？要。','A very small interval still sends an invoice.'],
    ['面积下班了。那个点还在加班。','The area clocked out. The point is still at its desk.'],
    ['擦掉一点。面积：我刚才就没算它。','One point erased. The area did not notice.'],
  ],
  completion:['那个点也下班了。两台在零线碰头。','The point has clocked out too. Both lifts are at zero.'],
  proof:[
    '在实线上取勒贝格测度，令 \\(f_r=\\mathbf 1_{[-r,r]}\\)，其中 \\(0\\le r\\le2\\)。于是\\[A(r)=\\int_{\\mathbb R}f_r(x)\\,dx=2r,\\qquad B(r)=f_r(0)=1.\\]只要 \\(r>0\\)，就有 \\(A(r)>0\\)；再窄也没有变成零。夹具真的到达止点 \\(r=0\\) 后，\\(f_0=\\mathbf 1_{\\{0\\}}\\)，故 \\(A(0)=0\\)，但 \\(B(0)=1\\)。\n擦去 \\(x=0\\) 处的值，得到零函数 \\(g\\equiv0\\)。两函数只在零测集 \\(\\{0\\}\\) 上不同，因此 \\(f_0=g\\) 几乎处处，且 \\(\\int f_0=\\int g=0\\)，尽管 \\(f_0(0)\\ne g(0)\\)。',
    'Use Lebesgue measure on the real line and set \\(f_r=\\mathbf 1_{[-r,r]}\\), with \\(0\\le r\\le2\\). Then\\[A(r)=\\int_{\\mathbb R}f_r(x)\\,dx=2r,\\qquad B(r)=f_r(0)=1.\\]Every \\(r>0\\) gives \\(A(r)>0\\), however narrow the interval. At the actual stop \\(r=0\\), we have \\(f_0=\\mathbf 1_{\\{0\\}}\\), so \\(A(0)=0\\) while \\(B(0)=1\\).\nErase the value at \\(x=0\\) to obtain \\(g\\equiv0\\). The functions differ only on the null set \\(\\{0\\}\\), hence \\(f_0=g\\) almost everywhere and \\(\\int f_0=\\int g=0\\), although \\(f_0(0)\\ne g(0)\\).',
  ],
  boundary:[
    '“几乎处处”指除一个勒贝格零测集外处处成立。针头只是抽象单点的可见标记，它的像素宽度并不是零测度；小鸟也不需要撞中浮点单点。有限次推夹具是直接设置参数到机械止点，不是做完无穷次缩小。A、B 用不同刻度驱动升降台；擦点后的电机移动只是执行新点值的动画。',
    '“Almost everywhere” means outside a set of Lebesgue measure zero. The visible pin marks an abstract singleton; its pixel width is not zero measure, and no collision with a floating-point singleton is required. Pushing to a mechanical stop sets the parameter directly; it does not complete infinitely many shrinkings. A and B drive lifts on different scales. The motor travel after erasing only animates the new point value.',
  ],
};

function gateAt(a,x){
  const g=a.makeGate(x,0);g.bottom=AE_GEOMETRY.floor;g.height=15.6;
  g.f.y=g.bottom+g.height;g.f.h=g.height;
  g.f.group.position.y=g.f.y;
  g.curtain.position.y=g.bottom+g.height/2;g.curtain.scale.set(.12,g.height,1.7);
  a.state.specialGates.push(g);return g;
}
function openGate(g,open){g.open=open;g.f.active=!open;g.curtain.visible=!open;}
function refresh(s){for(const l of s.readouts)l.userData?.refresh?.();}
const getAxis=input=>input?.axis??((input?.right?1:0)-(input?.left?1:0));

export function buildAE(a){
  const {THREE,state,platform,feather,label,checkpointAt,box,root,tx}=a,G=AE_GEOMETRY;
  state.specialGates=[];
  const s=state.ae={r:2,erased:false,area:4,point:1,atStop:false,elapsed:0,pushed:false,
    pointVisited:false,areaVisited:false,ready:false,readouts:[],labelsAt:-1,lastDisplay:''};
  state.aeReady=state.analysisReady=false;

  // Fixed safety loop lies under every moving surface and reaches both sides.
  platform(22,0,24,{h:1.5,color:0xdce3cf,aeRole:'workbench'});
  platform(40,G.floor,64,{h:.8,color:0xbdcfc8,aeRole:'safety'});
  for(const x of [35.8,47.2])platform(x,-1.8,3.2,{h:.55,color:0xc8d6cc,aeRole:'return'});
  platform(63,0,28,{h:1.5,color:0xdce3cf,aeRole:'exit'});
  checkpointAt(16,0);checkpointAt(33,0);checkpointAt(55,0);
  label(()=>tx('掉下去也接得住。夹具不白推。','Fall safely. The clamp keeps your work.'),24,-2.45,{w:12,font:26,opacity:.7});

  // A solid physical slider: ordinary horizontal input pushes its left face.
  s.clamp=platform(G.clampStart,G.clampHeight,G.clampWidth,{h:G.clampHeight,solid:true,color:0xb9c9c1,aeRole:'clamp'});
  box(0,-.75,1.13,.16,1.1,.12,0x6a8c80,s.clamp.group);
  box(0,-.18,1.15,.53,.1,.14,0xd0ad66,s.clamp.group);
  box(24,.08,.88,8.8,.12,.18,0x829c8b);
  for(let i=0;i<=8;i++)box(20+i,.19,1.10,.05,i%4===0?.34:.15,.06,0x6b8a7b);
  s.stop=box(G.clampStop+G.clampWidth/2+.16,.5,.85,.22,1,.5,0xc49e51);
  label(()=>tx('推到金色止点 →','Push to the gold stop →'),23,2.35,{w:10,font:29});
  label('0',29.05,1.4,{w:2,font:38,bold:true});

  s.areaLift=platform(G.areaX,4*G.areaScale,G.areaWidth,{oneWay:true,h:.42,color:0xa7c8bf,aeRole:'areaLift'});
  s.pointLift=platform(G.pointX,G.pointScale,G.pointWidth,{oneWay:true,h:.42,color:0xd4b77d,aeRole:'pointLift'});
  s.middle=platform(41,1.55,2.1,{oneWay:true,h:.35,color:0xc2d2c2,aeRole:'middle'});
  s.firstGate=gateAt(a,G.firstGateX);s.lastGate=gateAt(a,G.lastGateX);
  // Real rails, axles and counterweights make the two output machines legible.
  s.carriages=[];
  for(const [f,tint] of [[s.areaLift,0x588a81],[s.pointLift,0xa78950]]){
    for(const dx of [-f.w/2+.28,f.w/2-.28]){
      box(f.x+dx,1.0,-1.35,.11,9.4,.12,0x88a495);
      box(dx,-.15,-1.22,.36,.6,.38,tint,f.group);
    }
    box(f.x,-.04,-.95,f.w+.55,.10,.09,0xb99d62);
    const cable=box(f.x,4.9,-1.38,.035,1,.06,tint);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.22,12),new THREE.MeshStandardMaterial({color:tint,roughness:.65}));
    hub.rotation.x=Math.PI/2;hub.position.set(f.x,5.7,-1.35);root.add(hub);
    s.carriages.push({f,cable,hub});
  }
  s.meeting=box(41,-.06,1.14,15.0,.08,.08,0xd4b76c);s.meeting.visible=false;
  s.eraser=platform(45.8,6.2,2.35,{h:.65,solid:true,color:0xe1c6ab,aeRole:'eraser',aeEraser:true});
  // A visible eraser, deliberately a broad ordinary collider, not the singleton.
  box(0,-.29,1.13,.73,.32,.10,0xf6eee0,s.eraser.group);
  box(.27,-.29,1.20,.2,.34,.04,0xcc9a85,s.eraser.group);
  s.eraseLabel=label(()=>s.erased?tx('点已擦去','Point erased'):tx('↑ 顶一下，擦掉这个点','↑ Bump to erase this point'),45.8,7.45,{w:10.5,font:28});
  s.readouts.push(s.eraseLabel);

  // The interval's fill vanishes at exact r=0. The remaining pin is only a mark.
  box(G.graphX,G.graphY,-.70,6.3,.065,.09,0x5e8177);
  box(G.graphX-3.15,G.graphY+.55,-.70,.055,1.25,.09,0x5e8177);
  s.band=box(G.graphX,G.graphY+.5,-.6,5,1,.15,0xa2c5b4);
  s.band.material=new THREE.MeshStandardMaterial({color:0xa2c5b4,transparent:true,opacity:.58,roughness:.8});
  s.leftEdge=box(G.graphX-2*G.graphScale,G.graphY+.5,-.45,.055,1,.09,0x719b85);
  s.rightEdge=box(G.graphX+2*G.graphScale,G.graphY+.5,-.45,.055,1,.09,0x719b85);
  s.pin=box(G.graphX,G.graphY+.5,-.30,.045,1,.09,0xbf9450);
  s.pinHead=new THREE.Mesh(new THREE.SphereGeometry(.10,12,8),new THREE.MeshStandardMaterial({color:0xd0a552,roughness:.6}));
  s.pinHead.position.set(G.graphX,G.graphY+1,-.30);root.add(s.pinHead);
  label(()=>tx('函数的图像','Function graph'),24,6.2,{w:8,font:27,opacity:.75});
  label('0',24,3.55,{w:2,font:26});
  s.readouts.push(label(()=>tx('半宽 ','Half-width ')+formatAEValue(s.r),24,7.0,{w:8,font:34,bold:true}));
  s.areaLabel=label(()=>tx('面积 ','Area ')+formatAEValue(s.area),37,7.1,{w:8,font:32,bold:true,z:-1.35});
  s.pointLabel=label(()=>tx('点值 ','Point value ')+s.point,45,8.35,{w:8,font:32,bold:true});
  s.readouts.push(s.areaLabel,s.pointLabel);
  label(()=>tx('面积台','Area lift'),37,-1.25,{w:6,font:28,opacity:.8});
  label(()=>tx('点值台','Point-value lift'),45,-1.25,{w:7,font:28,opacity:.8});
  s.returnLabel=label(()=>s.ready?tx('在零线会合。走吧。','Together at zero. On we go.'):tx('A 看面积；B 只看那个点。','A reads area. B reads that one point.'),57,3.8,{w:13,font:29,opacity:.8});
  s.readouts.push(s.returnLabel);
  for(const [x,y,secret] of [[13,1.4],[17,1.4],[29.7,1.4],[37,1.15],[41,2.7],[45,4.45],[45,1.05,true],[56,1.25],[63,1.7],[68,1.25],[38,-2.35,true]])feather(x,y,!!secret);
  syncAEVisuals(s);return s;
}

function syncAEVisuals(s){
  const G=AE_GEOMETRY;
  s.band.visible=s.r>0;s.band.scale.x=2*s.r*G.graphScale;
  s.leftEdge.visible=s.rightEdge.visible=s.r>0;
  s.leftEdge.position.x=G.graphX-s.r*G.graphScale;s.rightEdge.position.x=G.graphX+s.r*G.graphScale;
  s.pin.visible=s.pinHead.visible=!s.erased;
  s.meeting.visible=s.ready;
  for(const {f,cable,hub} of s.carriages){const h=5.7-f.y;cable.scale.y=h;cable.position.y=(5.7+f.y)/2;hub.rotation.z=f.y*.65;}
}

export function updateAE(a,dt){
  const {state,p,input,movePlatform,tx,showToast,tone}=a,s=state.ae,G=AE_GEOMETRY;
  if(!s)return;
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('dt must be nonnegative');
  s.elapsed+=dt;
  // Only a bird on the workbench, in contact with the slider's left face, can push.
  const face=s.clamp.x-s.clamp.w/2;
  const inContact=p.grounded&&Math.abs(p.y)<.06&&p.x+p.w/2>=face-.075&&p.x<face;
  if(!s.atStop&&getAxis(input)>0&&inContact){
    s.r=advanceAEClamp(s.r,G.pushSpeed*dt);
    if(!s.pushed){s.pushed=true;showToast?.(tx(...AE_LEVEL.jokes[0]),2.5);}
  }
  Object.assign(s,aeValues(s.r,s.erased));
  movePlatform(s.clamp,G.clampStop-s.r*(G.clampStop-G.clampStart)/2,G.clampHeight);
  movePlatform(s.areaLift,G.areaX,G.areaScale*s.area);
  const target=G.pointScale*s.point,pointY=Math.max(target,s.pointLift.y-G.pointMotorSpeed*dt);
  movePlatform(s.pointLift,G.pointX,pointY);
  if(s.atStop&&!s.stopCelebrated){s.stopCelebrated=true;refresh(s);tone?.(620,.12);showToast?.(tx(...AE_LEVEL.jokes[1]),3.0);}
  if(s.atStop&&(p.on===s.areaLift||p.landed===s.areaLift))s.areaVisited=true;
  if(s.atStop&&!s.erased&&(p.on===s.pointLift||p.landed===s.pointLift))s.pointVisited=true;
  s.ready=aeReady(s,s.pointLift.y);state.aeReady=state.analysisReady=s.ready;
  openGate(s.firstGate,s.atStop);openGate(s.lastGate,s.ready);
  if(s.ready&&!s.readyCelebrated){s.readyCelebrated=true;tone?.(880,.15);showToast?.(tx('两台都到零了。刚才的区别，是真的。','Both at zero. Their earlier difference was real.'),3);refresh(s);}
  syncAEVisuals(s);
  const display=[formatAEValue(s.r),formatAEValue(s.area),s.point,s.ready].join('|');
  if(display!==s.lastDisplay&&s.elapsed-s.labelsAt>=.2){s.lastDisplay=display;s.labelsAt=s.elapsed;refresh(s);}
}

export function onAEHeadHit(f,a){
  if(!f?.aeEraser||!a.state.ae)return false;
  const s=a.state.ae;
  if(!eraseAEPoint(s)){
    if(s.r>0&&!s.earlyEraseWarned){s.earlyEraseWarned=true;a.showToast?.(a.tx('先把夹具推到真正的 0 止点。','First push the clamp to the actual zero stop.'),2.5);}
    return true;
  }
  Object.assign(s,aeValues(s.r,s.erased));
  a.tone?.(740,.12);a.showToast?.(a.tx(...AE_LEVEL.jokes[2]),3);
  syncAEVisuals(s);refresh(s);return true;
}

/** Draw only decoration here. The shared renderer draws the actual colliders. */
export function drawAE(renderer,g,phase='under'){
  const s=g.state?.ae;if(!s||g.L.kind!=='ae')return;
  const {ctx:c,unit:u}=renderer,G=AE_GEOMETRY;
  const line=(x1,y1,x2,y2,color,width=1.5,z=-1.35)=>{const A=renderer.project(x1,y1,z),B=renderer.project(x2,y2,z);c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...A);c.lineTo(...B);c.stroke();};
  c.save();
  if(phase==='over'){
    const [ex,ey]=renderer.project(s.eraser.x,s.eraser.y-.29,1.17);
    c.fillStyle='#f6eee0';c.fillRect(ex-u*.36,ey-u*.16,u*.73,u*.32);c.fillStyle='#cc9a85';c.fillRect(ex+u*.17,ey-u*.16,u*.2,u*.32);
    line(s.clamp.x,s.clamp.y-1.3,s.clamp.x,s.clamp.y-.2,'#618779',3,1.16);
    const [sx,sy]=renderer.project(G.clampStop+G.clampWidth/2+.16,.5,1.0);c.fillStyle='#c49e51';c.fillRect(sx-u*.11,sy-u*.5,u*.22,u);
    if(s.ready)line(33.5,-.06,48.5,-.06,'#d4b76c',3,1.14);
    c.restore();return;
  }
  line(19.6,.08,28.9,.08,'#829c8b',3,.88);
  for(let i=0;i<=8;i++)line(20+i,.08,20+i,i%4===0?.36:.23,'#6b8a7b',1,1.1);
  for(const f of [s.areaLift,s.pointLift]){
    for(const dx of [-f.w/2+.28,f.w/2-.28])line(f.x+dx,-3.7,f.x+dx,5.7,'#88a495',1.4);
    line(f.x,f.y,f.x,5.7,f===s.areaLift?'#588a81':'#a78950',1.5);
    line(f.x-f.w/2-.25,0,f.x+f.w/2+.25,0,'#b99d62',2,-.95);
    const [x,y]=renderer.project(f.x,5.7,-1.35);c.strokeStyle=f===s.areaLift?'#588a81':'#a78950';c.lineWidth=2;c.beginPath();c.arc(x,y,u*.35,0,Math.PI*2);c.stroke();
    const angle=f.y*.65;line(f.x-Math.cos(angle)*.28,5.7-Math.sin(angle)*.28,f.x+Math.cos(angle)*.28,5.7+Math.sin(angle)*.28,c.strokeStyle,2);
  }
  line(G.graphX-3.15,G.graphY,G.graphX+3.15,G.graphY,'#5e8177',1.5,-.7);
  line(G.graphX-3.15,G.graphY-.075,G.graphX-3.15,G.graphY+1.175,'#5e8177',1.5,-.7);
  if(s.r>0){
    const A=renderer.project(G.graphX-s.r*G.graphScale,G.graphY,-.6),B=renderer.project(G.graphX+s.r*G.graphScale,G.graphY+1,-.6);
    c.fillStyle='#a2c5b494';c.fillRect(A[0],B[1],B[0]-A[0],A[1]-B[1]);
    for(const side of [-1,1])line(G.graphX+side*s.r*G.graphScale,G.graphY,G.graphX+side*s.r*G.graphScale,G.graphY+1,'#719b85',1.5,-.45);
  }
  if(!s.erased){
    line(G.graphX,G.graphY,G.graphX,G.graphY+1,'#bf9450',1.7,-.3);
    const [x,y]=renderer.project(G.graphX,G.graphY+1,-.3);c.fillStyle='#d0a552';c.beginPath();c.arc(x,y,u*.10,0,Math.PI*2);c.fill();
  }
  c.restore();
}

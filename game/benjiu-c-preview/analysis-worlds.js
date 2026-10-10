// Finite, testable controls for the series and signed-integral worlds.
export function seriesBounds(positive,negative){
 const P=(4/3)*4**(-positive),N=(2/3)*4**(-negative);
 const sum=(4/3-P)-(2/3-N);
 return {sum,positiveTail:P,negativeTail:N,low:sum-N,high:sum+P,ready:sum-N>=.64&&sum+P<=.69};
}
export function advanceReservoir(r,requested,dt){
 const before=r.volume;let duration=dt;
 if(requested>0)duration=Math.min(dt,Math.max(0,(r.capacity-before)/requested));
 else if(requested<0)duration=Math.min(dt,Math.max(0,before/-requested));
 const record=(rate,seconds)=>{if(seconds<=0)return;const last=r.segments.at(-1);if(last&&last.rate===rate)last.seconds+=seconds;else r.segments.push({rate,seconds});};
 if(requested===0){record(0,dt);r.flow=0;}
 else{const delta=requested*duration;r.volume=before+delta;r.positive+=Math.max(0,delta);r.negative+=Math.min(0,delta);record(requested,duration);if(duration<dt)record(0,dt-duration);r.flow=duration===dt?requested:0;}
 r.elapsed+=dt;r.height=r.floor+r.volume/r.area;return r;
}
export function buildAnalysisWorld(kind,a){
 const {THREE,state,platform,feather,label,checkpointAt,box,root,tx,makeGate}=a;state.specialGates=[];
 const tallGate=(x,height=9)=>{const g=makeGate(x,0);g.bottom=-3.6;g.height=height;g.f.y=g.bottom+g.height;g.f.h=g.height;g.curtain.position.y=g.bottom+g.height/2;g.curtain.scale.set(.12,g.height,1.7);state.specialGates.push(g);return g;};
 if(kind==='series'){
  state.series={positive:0,negative:0,...seriesBounds(0,0),offers:0};
  platform(20,0,20,{h:2});platform(38,-3.6,63,{h:1,color:0xc4d5c1});platform(31,-1.7,3);platform(38,-1.3,4);platform(40.5,-1.7,2.4);platform(55,0,26,{h:2});checkpointAt(25,0);
  state.termBoxes=[platform(22,3.15,2.4,{h:.8,solid:true,color:0xc9d8a9,termSign:1}),platform(27,3.15,2.4,{h:.8,solid:true,color:0xdcbba3,termSign:-1})];
  label(()=>tx('顶一下，添一包','Bump for a positive term'),22,4.8,{w:9,font:28});label(()=>tx('顶一下，收一包','Bump for a negative term'),27,4.8,{w:9,font:28});
  for(const f of state.termBoxes){const plus=f.termSign>0;box(0,-.38,1.1,.68,.07,.04,0x45695c,f.group);if(plus)box(0,-.38,1.1,.07,.68,.04,0x45695c,f.group);}
  state.sumBridge=platform(30,.65,5.5,{h:.5,color:0xc9d7b2});
  state.tailBand=box(33,4.0,-.6,18,.11,.10,0xd9b876);state.tailLeft=box(24,4.0,-.6,.05,.55,.12,0x527c72);state.tailRight=box(42,4.0,-.6,.05,.55,.12,0x527c72);
  state.dock=box(35.985,3.99,-.8,.45,.65,.12,0x85ad8a);state.dock.material=new THREE.MeshStandardMaterial({color:0x85ad8a,transparent:true,opacity:.3});
  state.seriesCaption=label(()=>state.series.ready?tx('剩下那点，也都在槽里了。','Even the remaining tail fits now.'):tx('桥够长，尾巴还没收好。','Long enough is not the whole story.'),36,5.6,{w:13,font:28,opacity:.7});state.seriesGate=tallGate(46);
  for(const [x,y] of [[14,1.4],[20,1.4],[29,1.4],[33,1.9],[36,1.9],[41,2.2],[51,1.3],[59,1.3],[36,-2.1]])feather(x,y,x===41||y<0);
 }else if(kind==='integral'){
  state.reservoirs=[];platform(20,0,18,{h:2});platform(55,0,23,{h:2});platform(87,0,15,{h:2});platform(50,-3.6,81,{h:.8,color:0xc0d5ce});for(const x of [30,43,67,78])platform(x,-1.65,3);checkpointAt(50,0);
  const specs=[{positiveX:17,negativeX:24,x:36,initial:4,target:2.2,gate:43,rate:1.4},{positiveX:55,negativeX:62,x:74,initial:10,target:1.5,gate:81,rate:1.8}];
  for(const [index,s] of specs.entries()){
   const r={...s,area:2,capacity:12,floor:-1,volume:s.initial,positive:0,negative:0,elapsed:0,flow:0,segments:[],everReady:false};r.height=r.floor+r.volume/r.area;
   r.pads=[platform(s.positiveX,.2,3,{flowPad:1,reservoir:index,color:0xa7cdbd}),platform(s.negativeX,.2,3,{flowPad:-1,reservoir:index,color:0xd6bba8})];
   for(const f of r.pads){box(0,.065,1.09,.78,.07,.05,0x467468,f.group);if(f.flowPad>0)box(0,.065,1.09,.07,.45,.05,0x467468,f.group);}
   r.tray=platform(s.x,r.height,6,{oneWay:true,h:.35,color:0xd2dfc1});r.water=box(s.x,r.floor+r.volume/r.area/2,-.35,5.8,r.volume/r.area,r.area/5.8,0x78b6b2);r.water.material=new THREE.MeshStandardMaterial({color:0x75b7b7,transparent:true,opacity:.45,roughness:.45});
   for(const dx of [-3.15,3.15]){box(s.x+dx,2,-.55,.10,6,.12,0x78988a);box(s.x+dx,-2.3,-.55,.10,2.6,.12,0x9bafa0);}box(s.x,r.floor,-.55,6.4,.12,.18,0x78988a);box(s.x,s.target,-.65,6.6,.12,.12,0xc6ab65);
   r.gate=tallGate(s.gate,14.6);state.reservoirs.push(r);
   label(()=>tx('站着进水','Stand here: fill'),s.positiveX,2.2,{w:6.5,font:27});label(()=>tx('站着出水','Stand here: drain'),s.negativeX,2.2,{w:6.5,font:27});
  }
  label(()=>tx('离开踏板，水位就停。','Step off. The water remembers.'),21,5.1,{w:12,font:30});label(()=>tx('刚才多站那会儿，也算数。','That extra second counted.'),57,5.1,{w:12,font:30});
  for(const [x,y] of [[13,1.4],[20,1.5],[27,1.4],[36,3.5],[48,1.4],[59,1.4],[66,1.4],[74,2.8],[87,1.3]])feather(x,y,x===36||x===74);
 }
}
export function takeSeriesTerm(f,a){
 if(!f?.termSign||!a.state.series)return false;const {state,showToast,tx,tone}=a,s=state.series,key=f.termSign>0?'positive':'negative';if(s[key]>=12){showToast(tx('这一轨先够用了，看看另一边。','Enough from this rail. Try the other side.'),2.4);return true;}
 const next=seriesBounds(s.positive+(key==='positive'?1:0),s.negative+(key==='negative'?1:0));if(next.sum<-.15||next.sum>1.1){s.rejected=(s.rejected||0)+1;showToast(tx('桥碰到限位了，这包先放回。','Rail stop. That packet stays in the hopper.'),2.5);tone(180,.08);return true;}s[key]++;s.offers++;Object.assign(s,next);tone(f.termSign>0?650:410,.11);if(s.offers===1)showToast(tx('正的添上，负的收回。','Positive extends it. Negative brings it back.'),2.6);if(s.ready&&!s.celebrated){s.celebrated=true;showToast(tx('剩下那点，也都在槽里了。','Even the unfinished tail fits now.'),2.8);}return true;
}
export function updateAnalysisWorld(kind,a,dt){
 const {state,p,movePlatform,showToast,tx}=a;
 if(kind==='series'){
  const s=state.series,target=30+9*s.sum,f=state.sumBridge;movePlatform(f,f.x+Math.max(-8*dt,Math.min(8*dt,target-f.x)),.65);
  if(state.seriesCaptionReady!==s.ready){state.seriesCaptionReady=s.ready;state.seriesCaption?.userData.refresh?.();}
  const left=30+9*s.low,right=30+9*s.high;state.tailBand.position.x=(left+right)/2;state.tailBand.scale.x=Math.max(.025,right-left);state.tailLeft.position.x=left;state.tailRight.position.x=right;
  const ready=s.ready&&Math.abs(f.x-target)<.025;state.analysisReady=ready;const g=state.seriesGate;g.open=ready;g.f.active=!ready;g.curtain.visible=!ready;
 }else if(kind==='integral'){
  for(const [i,r] of state.reservoirs.entries()){
   const requested=p.on?.reservoir===i?(p.on.flowPad||0)*r.rate:0;advanceReservoir(r,requested,dt);movePlatform(r.tray,r.x,r.height);const waterHeight=r.height-r.floor;r.water.visible=r.volume>0;r.water.scale.y=waterHeight;r.water.position.y=r.floor+waterHeight/2;
   r.ready=Math.abs(r.height-r.target)<=.38;r.gate.open=r.ready;r.gate.f.active=!r.ready;r.gate.curtain.visible=!r.ready;
   if(r.ready&&!r.everReady){r.everReady=true;showToast(tx('到线了。松脚，水位替你记着。','At the line. Step off; the water keeps the total.'),2.7);}
  }
  state.analysisReady=state.reservoirs.every(r=>r.ready);
 }
}
export function analysisStatus(kind,state,tx){
 if(kind==='series'){const s=state.series;return s.ready?tx('尾项范围已进槽','Entire tail range fits'):tx('正项 ','Positive ')+s.positive+tx(' 包 · 负项 ',' packets · negative ')+s.negative+tx(' 包',' packets');}
 if(kind==='integral')return state.reservoirs.map((r,i)=>(i+1)+': '+r.height.toFixed(2)+(r.ready?' ✓':'')).join('  ·  ');return '';
}
export function drawAnalysisWorld(renderer,g,phase='under'){
 const {ctx:c,unit:u}=renderer;if(phase==='over'){const controls=g.L.kind==='series'?(g.state.termBoxes||[]):(g.state.reservoirs||[]).flatMap(r=>r.pads);for(const f of controls){const [x,y]=renderer.project(f.x,f.y-(f.termSign?.38:-.04),1.12);c.strokeStyle='#416c60';c.lineWidth=2;c.beginPath();c.moveTo(x-u*.25,y);c.lineTo(x+u*.25,y);if((f.termSign||f.flowPad)>0){c.moveTo(x,y-u*.2);c.lineTo(x,y+u*.2);}c.stroke();}return;}
 if(g.L.kind==='series'){
  const s=g.state.series,left=renderer.project(30+9*s.low,4),right=renderer.project(30+9*s.high,4),A=renderer.project(30+9*.64,4),B=renderer.project(30+9*.69,4);
  c.fillStyle='#81ae8850';c.fillRect(A[0],A[1]-u*.32,B[0]-A[0],u*.64);c.strokeStyle=s.ready?'#477c62':'#b29954';c.lineWidth=3;c.beginPath();c.moveTo(...left);c.lineTo(...right);c.stroke();c.lineWidth=1.5;for(const xy of [left,right]){c.beginPath();c.moveTo(xy[0],xy[1]-u*.22);c.lineTo(xy[0],xy[1]+u*.22);c.stroke();}
 }
 if(g.L.kind==='integral')for(const r of g.state.reservoirs){
  const A=renderer.project(r.x-2.9,r.floor,-.6),B=renderer.project(r.x+2.9,r.height,-.6);c.fillStyle='#75b7b773';if(r.volume>0)c.fillRect(A[0],B[1],B[0]-A[0],A[1]-B[1]);c.strokeStyle='#78988a';c.lineWidth=1.5;for(const dx of [-3.15,3.15]){const low=renderer.project(r.x+dx,r.floor,-.6),high=renderer.project(r.x+dx,5,-.6);c.beginPath();c.moveTo(...low);c.lineTo(...high);c.stroke();}const floorLeft=renderer.project(r.x-3.15,r.floor,-.6),floorRight=renderer.project(r.x+3.15,r.floor,-.6);c.beginPath();c.moveTo(...floorLeft);c.lineTo(...floorRight);c.stroke();const L=renderer.project(r.x-3.3,r.target,-.6),R=renderer.project(r.x+3.3,r.target,-.6);c.strokeStyle=r.ready?'#42715c':'#b99e57';c.lineWidth=2;c.beginPath();c.moveTo(...L);c.lineTo(...R);c.stroke();
 }
}

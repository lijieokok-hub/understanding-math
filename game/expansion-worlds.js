// New worlds share the original body simulation. These are finite mechanisms, not a second physics engine.
export const pairedToggle=(bits,mask)=>bits.map((b,i)=>mask.includes(i)?1-b:b);
export const balanceState=(x,origin,mass,targetMoment)=>{
 const moment=mass*(x-origin)-targetMoment;
 return {moment,left:1+moment*.45,right:1-moment*.45,balanced:Math.abs(moment)<=.42};
};
export function buildExpansion(kind,a){
 const {THREE,state,platform,feather,label,checkpointAt,box,ball,root,mat,tx,makeGate}=a;
 state.expansionGates=[];state.specialGates=state.expansionGates;state.pairLinks=[];state.pairGroups=[];state.balanceUnits=[];
 const tallGate=x=>{const g=makeGate(x,0);g.bottom=-3.5;g.height=8.8;g.f.y=g.bottom+g.height;g.f.h=g.height;g.curtain.position.y=g.bottom+g.height/2;g.curtain.scale.set(.12,g.height,1.7);state.expansionGates.push(g);return g;};
 const wire=(x,y,f,depth)=>{const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(x,y,1.18),new THREE.Vector3(x,y-depth,1.18),new THREE.Vector3(f.x,f.y-depth,1.18),new THREE.Vector3(f.x,f.y+.05,1.18));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,22,.022,4,false),mat(0x809d8e));root.add(mesh);state.pairLinks.push({x,y,target:f,depth,mesh});};
 if(kind==='paired'){
  platform(17,-3.5,14,{h:.7,color:0xc1d5c8});platform(12.7,-1.65,2.5,{color:0xcad6c3});
  const intro={bits:[0,0],pads:[],bridges:[],taps:0};state.pairGroups.push(intro);
  for(const x of [17,22])intro.bridges.push(platform(x,.35,4.4,{active:false}));
  const p0=platform(9,.4,2.2,{pairPad:{group:0,mask:[0,1]},color:0x83b2a2});intro.pads.push(p0);wire(9,.45,intro.bridges[0],1.7);wire(9,.45,intro.bridges[1],2.05);
  label(()=>tx('踩一次，两块一起。','One landing. Both planks.'),11,3.8,{w:10,font:31});
  platform(32,0,18,{h:2});checkpointAt(26,0);platform(50,-3.5,57,{h:.8,color:0xc0d2c4});platform(42.5,-1.6,2.6);platform(66.9,-1.6,3.8,{returnStep:true});
  label(()=>tx('从右边绕上去 →','Up around the right edge →'),65.7,-2.45,{w:9,font:26});
  const group={bits:[0,1,0,1],pads:[],bridges:[],taps:0};state.pairGroups.push(group);
  for(let j=0;j<4;j++)group.bridges.push(platform(46+j*6,.35+(j%2)*.3,4.8,{active:!!group.bits[j]}));
  for(let j=0;j<3;j++){const f=platform(28+j*5,.4,2.2,{pairPad:{group:1,mask:[j,j+1]},color:0x83b2a2});group.pads.push(f);label(()=>[tx('左边两块','Left pair'),tx('中间两块','Middle pair'),tx('右边两块','Right pair')][j],f.x,2.1,{w:4.8,font:26});for(const index of [j,j+1])wire(f.x,.45,group.bridges[index],1.8+j*.25);}
  for(const g of state.pairGroups){for(const f of g.bridges){f.preview=a.outline?.(f.x,f.y,f.w);if(f.preview)f.preview.visible=!f.active;}for(const f of g.pads)for(const dx of [-.28,.28])ball(dx,.08,.5,.08,0xd4bd70,f.group);}
  label(()=>tx('刚补好的那块，怎么又没了？','Did that switch just unswitch my bridge?'),39,5.4,{w:13,font:28,opacity:.7});
  platform(74,0,10,{h:2});tallGate(71);state.expansionReady=false;
  for(const [x,y] of [[15.5,1.7],[21,1.7],[30,1.8],[39,1.6],[46,1.7],[52,2.0],[58,1.7],[64,2],[52,-2.1]])feather(x,y,y<0);
 }else if(kind==='balance'){
  platform(17,0,14,{h:2});platform(40,0,11,{h:2});platform(48,0,14,{h:2});platform(80,0,17,{h:2});platform(49,-3.5,77,{h:.8,color:0xc4d0c1});platform(12,-1.7,3);platform(39,-1.7,3);platform(71,-1.7,3);checkpointAt(42,0);
  const specs=[{origin:11,min:12,max:18,start:12,mass:1,target:4,lifts:[26,33],gate:38},{origin:44,min:45,max:51,start:50,mass:2,target:6,lifts:[60,67],gate:72}];
  for(const [j,s] of specs.entries()){
   const cart=platform(s.start,1.05,1.35,{h:1.05,solid:true,color:0xe1c48f,balanceCart:true});cart.mass=s.mass;
   for(const dx of [-.4,.4])ball(dx,-.95,1.13,.15,0x526b60,cart.group);
   const lifts=s.lifts.map(x=>platform(x,1,5,{color:0xc8d5bb}));const gate=tallGate(s.gate),unit={...s,cart,lifts,gate,solved:false,everSolved:false};state.balanceUnits.push(unit);
   const rail=box((s.min+s.max)/2,.09,-.8,s.max-s.min+1,.07,.08,0x597e6a);const ideal=s.origin+s.target/s.mass;box(ideal,.075,.1,.84/s.mass,.04,1.5,0xb0cf8c);
   for(let mark=s.min;mark<=s.max;mark++)box(mark,.22,-.8,.04,.32,.04,0x7f9986);
   unit.caption=label(()=>String(s.mass),s.start,1.62,{w:1.8,font:40,bold:true});
   label(()=>j===0?tx('推到绿带。再跳过去。','Push to green. Then hop over.'):tx('这块重一点。少推一点。','Twice the weight. A lighter touch.'),(s.min+s.max)/2,4.5,{w:12,font:30});
   const beam=box((s.lifts[0]+s.lifts[1])/2,.05,-.8,s.lifts[1]-s.lifts[0],.09,.10,0x769382);unit.beam=beam;
   box((s.lifts[0]+s.lifts[1])/2,-1.3,-.8,.12,2.6,.12,0x809b81);
  }
  label(()=>tx('用力过猛，路先歪了。','A little more. No, the other little more.'),29,5.2,{w:13,font:28,opacity:.7});state.expansionReady=false;
  for(const [x,y] of [[16,2.5],[23,1.9],[27,2.4],[33,2.4],[30,4.7],[47,2.5],[58,2.2],[65,2.4],[78,1.3]])feather(x,y,y>4);
 }
}
export function updateExpansion(kind,a,dt){
 const {state,p,input,movePlatform,setActive,mat,showToast,tx}=a;
 if(kind==='balance'){
  for(const u of state.balanceUnits){
   const c=u.cart,axis=input.axis||0,near=Math.abs(p.x-c.x)<p.w/2+c.w/2+.12,beside=p.y<.68&&p.y+p.h>.12,toward=axis!==0&&Math.sign(c.x-p.x)===Math.sign(axis);
   if(near&&beside&&toward)movePlatform(c,Math.max(u.min,Math.min(u.max,c.x+axis*2.7*dt)),c.y);
   const b=balanceState(c.x,u.origin,u.mass,u.target);u.moment=b.moment;u.solved=b.balanced;
   for(let i=0;i<2;i++)movePlatform(u.lifts[i],u.lifts[i].x,i===0?b.left:b.right);
   // The line is a linkage diagram. Only the two horizontal trays are colliders.
   u.beam.rotation.z=Math.atan2(b.right-b.left,u.lifts[1].x-u.lifts[0].x);u.beam.position.y=1;
   u.caption.position.x=c.x;u.gate.open=b.balanced;u.gate.f.active=!b.balanced;u.gate.curtain.visible=!b.balanced;
   if(b.balanced&&!u.everSolved){u.everSolved=true;showToast(tx('平了。先别再好心推一下。','Level. Resist the helpful extra shove.'),2.7);}
  }
  state.expansionReady=state.balanceUnits.every(u=>u.solved);
 }
 if(kind==='paired'){
  const f=p.landed;if(f?.pairPad){const {group,mask}=f.pairPad,g=state.pairGroups[group];g.bits=pairedToggle(g.bits,mask);g.taps++;g.bridges.forEach((b,i)=>{setActive(b,!!g.bits[i]);if(b.preview)b.preview.visible=!b.active;});if(g.taps===1)showToast(tx('一起亮，也能一起灭。','Together on. Together off.'),2.5);else if(g.taps===3)showToast(tx('这一下，有人同意，有人熄灯。','Two planks have received your update.'),2.5);}
  state.expansionReady=state.pairGroups.every(g=>g.bits.every(Boolean));
  for(const link of state.pairLinks)link.mesh.material=mat(link.target.active?0x599a7f:0x9aa99b);
  for(const g of state.expansionGates){g.open=state.expansionReady;g.f.active=!g.open;g.curtain.visible=!g.open;}
 }
}
export const PAIRED_LEVEL={id:4,name:['刚亮怎么又灭了','Two Planks Got the Memo'],tag:['一脚下去，两边都收到了。','One landing. Two updates.'],color:0xe0e8dc,ink:0x3f6857,accent:0xba9e62,ground:0xe9e7d3,kind:'paired',width:76,
 hint:['跳到绿色开关上，会同时翻转连线指向的两块桥板；再踩一次就能撤回。','Land on a green switch to toggle its two linked planks. Land again to undo it.'],task:['先看哪两块会变。把两组桥都接上，就能继续。','Watch the linked pair. Complete both bridges to continue.'],
 jokes:[['这边亮了。那边怎么没了？','That one appeared. Where did the other one go?'],['这回大家都亮着。先别再踩一下。','All on. Resist the extra helpful tap.'],['原来“再来一次”真能撤回。','For once, doing it again really is undo.']],
 proof:['每块桥板只有亮、灭两种状态。一个开关翻转两块桥板：亮变灭，灭变亮。对同一个开关操作两次，两块都会恢复。\n固定开关的最终效果只取决于它被踩了奇数次还是偶数次；这组开关交换先后不会改变最终状态。每次翻两块，也会保持亮板总数的奇偶性。','Each plank has two states: on and off. A switch flips its two linked planks; applying that switch twice restores both.\nFor these fixed switches, the final state depends only on whether each was used an odd or even number of times. Their order does not affect the final state. Flipping two planks also preserves the parity of the number of lit planks.'],
 boundary:['目标已从初始状态验证可达。这里是二元翻转与奇偶性，不把所有机关都说成可交换，也不把解法藏在算术选择题里。','The target has been checked to be reachable from the initial state. These are binary toggles and parity; no claim is made that every kind of operation commutes.']};
export function drawExpansionWorld(renderer,g,phase='under'){
 if(g.L.kind!=='paired')return;const c=renderer.ctx,u=renderer.unit;
 if(phase==='over'){for(const group of g.state.pairGroups)for(const f of group.pads){for(const dx of [-.28,.28]){const [x,y]=renderer.project(f.x+dx,f.y+.08,.5);c.fillStyle='#d4bd70';c.beginPath();c.arc(x,y,u*.08,0,7);c.fill();}}return;}
 for(const link of g.state.pairLinks){const f=link.target,A=renderer.project(link.x,link.y,1.18),B=renderer.project(link.x,link.y-link.depth,1.18),C=renderer.project(f.x,f.y-link.depth,1.18),D=renderer.project(f.x,f.y+.05,1.18);c.strokeStyle=f.active?'#599a7f9e':'#9aa99b90';c.lineWidth=1.4;c.beginPath();c.moveTo(...A);c.bezierCurveTo(...B,...C,...D);c.stroke();}
}

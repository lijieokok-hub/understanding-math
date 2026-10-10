// A tangent determines only the initial launch velocity; gravity and later player input still act.
export const curveValue=(q,curve)=>curve.a*q*q+curve.c;
export const curveSlope=(q,curve)=>2*curve.a*q; // Equal x/y plot scale makes this the world-coordinate slope too.
export function tangentVelocity(slope,direction=1,speed=20){const vx=direction*speed/Math.sqrt(1+slope*slope);return {vx,vy:slope*vx};}
export const DERIVATIVE_LEVEL={id:11,name:['一样高，怎么飞反了','Same Height, Different Flight'],tag:['看的是这儿往哪边斜。','The slope is doing the steering.'],color:0xe1dfe8,ink:0x615a7a,accent:0xbaab6d,ground:0xe8e3db,kind:'derivative',width:85,
 hint:['先挑向右上斜的箭头，落到小踏板后朝右按↑，飞上金色平台。起飞后，左右仍能调整。','Choose an arrow that slopes up to the right. Land on its perch, then jump right onto the gold platform. You can still steer after take-off.'],task:['到高处的收信台落脚，打开这一段的门。下方可以返回重来。','Land on the high receiving perch to open each gate. The lower route lets you try again.'],
 jokes:[['高度一样，不代表起飞方向一样。','Same altitude. Very different departure plans.'],['这回挑的是斜率，不是运气。','That was a slope, not a lucky guess.'],['往下斜，是真的往下飞。','Downhill really did mean downhill.']],
 proof:[String.raw`第一条曲线为 \(f(q)=1.8-q^2/4\)，第二条为 \(g(q)=q^2/4\)。它们的导数分别为 \(f'(q)=-q/2\) 与 \(g'(q)=q/2\)。局部世界坐标的横纵方向采用相同比例；函数图、切线和标记点位于同一平面，显示时接受共同的相机投影。导数给出局部世界坐标中的切线斜率。
设斜率为 \(m\)，朝向为 \(d\in\{-1,1\}\)，起飞瞬间速度为
\[\bigl(v_x,v_y\bigr)=\frac{20d}{\sqrt{1+m^2}}(1,m).\]
例如同一条曲线上高度相同的两个点，切线斜率可以符号相反，因而向右起飞的竖直速度也相反。`,String.raw`The two curves are \(f(q)=1.8-q^2/4\) and \(g(q)=q^2/4\), with derivatives \(f'(q)=-q/2\) and \(g'(q)=q/2\). The local world coordinates use equal horizontal and vertical scales. The graph, tangent and marked point lie in one plane and share the camera projection. The derivative gives the tangent slope in local world coordinates.
For slope \(m\) and facing direction \(d\in\{-1,1\}\), the initial launch velocity is
\[\bigl(v_x,v_y\bigr)=\frac{20d}{\sqrt{1+m^2}}(1,m).\]
Two points of equal height on the same curve can have opposite tangent slopes and therefore opposite initial vertical velocities when launching right.`],
 boundary:['图像由解析函数采样绘出，起飞使用同一函数的解析导数，不把绘制折线的斜率当成导数。切线只规定起飞瞬间的方向；重力、振翅和后续操控会改变飞行，鸟不会沿整条切线无限直飞。紫色曲线是函数图像，只有标出的水平小踏板承重。','The plot samples the analytic function, and the launch uses that same function’s analytic derivative, not the slope of a display-polyline segment. The tangent specifies the initial direction only; gravity, flapping and later steering change the flight. The drawn curve is a graph; only the marked horizontal perches support the bird.']};
export function buildDerivative(a){
 const {THREE,state,platform,feather,label,checkpointAt,box,root,mat,tx,makeGate}=a;state.curves=[];state.derivativeSolved=[false,false];state.specialGates=[];state.tangentFlight=null;
 platform(15,1.1,3.3,{color:0xd0c8d9});platform(43,0,16,{h:2});checkpointAt(44,0);platform(50,1.1,3.3,{color:0xd0c8d9});platform(56,.6,3.3,{color:0xd0c8d9});platform(80,0,16,{h:2});platform(47,-3.5,80,{h:.8,color:0xc5ccd0});for(const x of [14,33.3,53,70])platform(x,-1.65,3);
 const specs=[{cx:22,base:2,scale:1.2,a:-.25,c:1.8,receiver:29,width:8,receiverY:5.0,gate:39},{cx:57,base:2,scale:1.2,a:.25,c:0,receiver:68,width:6.6,gate:78}];
 for(const [i,s] of specs.entries()){
  const curve={...s,points:[],perches:[],plotZ:0},samples=[...Array.from({length:65},(_,n)=>-2.7+n*5.4/64),-2,-1,1,2].sort((a,b)=>a-b);for(const q of samples)curve.points.push([s.cx+s.scale*q,s.base+s.scale*curveValue(q,s)]);
  const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.points.map(([x,y])=>new THREE.Vector3(x,y,0))),new THREE.LineBasicMaterial({color:0x9b86b4,depthTest:false,depthWrite:false}));mesh.renderOrder=1;curve.graph=mesh;root.add(mesh);
  for(const q of (i===0?[-2,-1,1,2]:[-2,2])){const x=s.cx+s.scale*q,y=s.base+s.scale*curveValue(q,s),slope=curveSlope(q,s),f=platform(x,y,1.35,{oneWay:true,h:.25,color:0xc8bad6,launchPoint:{q,slope,curve:i}});curve.perches.push(f);const tangent=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x-.7,y-.7*slope,0),new THREE.Vector3(x+.7,y+.7*slope,0)]),new THREE.LineBasicMaterial({color:0x7e638f,depthTest:false,depthWrite:false}));tangent.renderOrder=1;f.tangent=tangent;root.add(tangent);const point=new THREE.Mesh(new THREE.CircleGeometry(.065,16),new THREE.MeshBasicMaterial({color:0xc1a35b,depthTest:false,depthWrite:false}));point.position.set(x,y,0);point.renderOrder=2;f.launchMarker=point;root.add(point);const length=Math.sqrt(1+slope*slope),dx=1/length,dy=slope/length,tip=new THREE.Vector3(x+.7,y+.7*slope,0),left=new THREE.Vector3(tip.x-.22*dx-.1*dy,tip.y-.22*dy+.1*dx,0),right=new THREE.Vector3(tip.x-.22*dx+.1*dy,tip.y-.22*dy-.1*dx,0);const arrow=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([left,tip,tip,right]),new THREE.LineBasicMaterial({color:0x7e638f,depthTest:false,depthWrite:false}));arrow.renderOrder=1;root.add(arrow);}
  curve.receiver=platform(s.receiver,s.receiverY??5.6,s.width,{oneWay:true,h:.4,color:0xd8d7b1,derivativeReceiver:i});curve.gate=makeGate(s.gate,0);curve.gate.bottom=-3.5;curve.gate.height=10.5;curve.gate.f.y=7;curve.gate.f.h=10.5;curve.gate.curtain.position.y=1.75;curve.gate.curtain.scale.set(.12,10.5,1.7);state.specialGates.push(curve.gate);state.curves.push(curve);
 }
 label(()=>tx('先挑向右上斜的点。','Start with an up-right slope.'),19,7.3,{w:11,font:28});label(()=>tx('落在金台就开门。','Land on gold to open the gate.'),29,7.0,{w:8,font:28});label(()=>tx('再找向右上的点。','Find another up-right slope.'),55,7.8,{w:11,font:28});label(()=>tx('再落一次金台。','One more gold landing.'),68,7.6,{w:8,font:28});
 for(const [x,y] of [[15,2.4],[19.6,4.2],[29,6.9],[37,1.3],[48,2.3],[59.4,4.4],[68,6.9],[81,1.3]])feather(x,y,y>6);
}
export function ignoreDerivativeLanding(state,f,p){
 const source=state.tangentIgnoreSource;if(!source)return false;
 const outside=p.x+p.w/2<=source.x-source.w/2+.01||p.x-p.w/2>=source.x+source.w/2-.01||p.y+p.h<source.y-(source.h||.25)-.03;
 if(outside){state.tangentIgnoreSource=null;return false;}return f===source;
}
export function prepareDerivativeInput(state,p,input,dt){
 const axis=input.axis||0;
 if(p.on?.launchPoint)state.tangentSupport=p.on;else if(p.grounded||p.coyote<=0)state.tangentSupport=null;
 if(state.tangentIgnoreSource)ignoreDerivativeLanding(state,state.tangentIgnoreSource,p);
 let flight=state.tangentFlight;
 if(flight){flight.age+=dt;if(p.grounded||flight.age>.4){if(!p.grounded)p.vx=flight.vx;state.tangentFlight=null;flight=null;}}
 if(flight){
  // Keep launch momentum while accepting directional correction from the next tick.
  // Same-direction input does not add a second run-speed boost; no input coasts.
  const limit=flight.horizontalLimit??Math.abs(flight.vx);
  flight.vx=Math.max(-limit,Math.min(limit,flight.vx+axis*24*dt));
  p.vx=0;if(axis)p.facing=Math.sign(axis);input.axis=0;
 }
 return {wind:flight?.vx||0,axis};
}
export function actualDerivativeJump(state,p,input,type,previous,requestedAxis){
 if(type==='flap'){
  if(state.tangentFlight)p.vx=state.tangentFlight.vx;
  state.tangentFlight=null;input.axis=requestedAxis;return {wind:0};
 }
 const source=previous?.launchPoint?previous:state.tangentSupport;if(!source?.launchPoint)return null;
 const marker=source.launchPoint,direction=requestedAxis?Math.sign(requestedAxis):p.facing;
 const flight={...tangentVelocity(marker.slope,direction),slope:marker.slope,curve:marker.curve,q:marker.q,age:0};
 flight.horizontalLimit=Math.abs(flight.vx);state.tangentFlight=flight;state.tangentIgnoreSource=source;p.vx=0;p.vy=flight.vy;p.facing=direction;input.axis=0;
 return {wind:flight.vx};
}
export function derivativeLanded(a){const {state,p,showToast,tx,tone}=a,index=p.landed?.derivativeReceiver;if(index!==undefined&&!state.derivativeSolved[index]){state.derivativeSolved[index]=true;state.curves[index].gate.open=true;state.curves[index].gate.f.active=false;state.curves[index].gate.curtain.visible=false;showToast(tx('接住了。刚才那条切线没白看。','Delivered. That tangent had a destination.'),2.8);tone(790,.13);}state.analysisReady=state.derivativeSolved.every(Boolean);}
export function drawDerivative(renderer,g){if(g.L.kind!=='derivative')return;const c=renderer.ctx,u=renderer.unit;c.strokeStyle='#9684b5';c.lineWidth=1.6;for(const curve of g.state.curves){c.strokeStyle='#9684b5';c.lineWidth=1.6;c.beginPath();curve.points.forEach(([x,y],i)=>{const p=renderer.project(x,y,0);i?c.lineTo(...p):c.moveTo(...p);});c.stroke();for(const f of curve.perches){const m=f.launchPoint.slope,A=renderer.project(f.x-.7,f.y-.7*m,0),B=renderer.project(f.x+.7,f.y+.7*m,0);c.strokeStyle='#79608c';c.lineWidth=2;c.beginPath();c.moveTo(...A);c.lineTo(...B);c.stroke();const angle=Math.atan2(B[1]-A[1],B[0]-A[0]);c.beginPath();c.moveTo(B[0]-u*.15*Math.cos(angle-.5),B[1]-u*.15*Math.sin(angle-.5));c.lineTo(...B);c.lineTo(B[0]-u*.15*Math.cos(angle+.5),B[1]-u*.15*Math.sin(angle+.5));c.stroke();const P=renderer.project(f.x,f.y,0);c.fillStyle='#c1a35b';c.beginPath();c.arc(P[0],P[1],u*.065,0,Math.PI*2);c.fill();}}}

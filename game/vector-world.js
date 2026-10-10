import {controlLayout} from './benjiu/c-control-layout.mjs';
// A bounded, explicit force model. Arrows represent accelerations, not velocities.
export const WIND_X=[0,8,-8],WIND_Y=[0,16,-8],WIND_DRAG=2.4,WIND_STEER=12;
export function vectorSum(a,b){return {x:a.x+b.x,y:a.y+b.y};}
export function windAcceleration(vx,axis,wind){return {x:WIND_STEER*axis-WIND_DRAG*vx+wind.x,y:wind.y-27};}
export const VECTOR_LEVEL={id:20,kind:'vector',width:76,name:['风往哪边使劲？','Which Way Is the Push?'],tag:['往右吹一点，再往上托一把。','A push across. A little lift.'],color:0xdce7e5,ink:0x45717b,accent:0xc0a260,ground:0xdfe5d5,
 hint:['先把两个纸钮调成 → 和 ↑。跳向右边的大平台；空中还可以再振一次翅。','Set the two controls to → and ↑. Jump toward the wide platform on the right; you can flap once more in the air.'],
 task:['先到右边，再借向左的风飞回上层纸台。落下去，沿下面的路回岸边；上岸处没有风。','Land on the right, then use a leftward wind to reach the upper ledge. If you drop, follow the lower path back; the step onto the bank is outside the wind.'],
 jokes:[['有风助力。也有风添乱。','A tailwind. Occasionally a complication.'],['换个方向，刚才的顺风就能送你回来。','Your former tailwind can take you home.'],['两边都收到，风可以下班了。','Both delivered. The wind is off duty.']],
 completion:['风还是那两股，这回会借了。','Same two winds. Now they are helping.'],
 proof:[String.raw`把箭头当成一股推力：朝右的风向右推，朝上的风往上托。两股同时作用时，横着的分量相加，竖着的分量也相加。
例如本关的一种设置是
\[(8,0)+(0,16)=(8,16).\]
绿色箭头因此指向右上方。把横风换成向左，就得到
\[(-8,0)+(0,16)=(-8,16),\]
绿色箭头转向左上方。
箭头表示风合起来往哪边使劲，不是小鸟接下来必须走的直线。小鸟原来的速度、你的左右操作和重力也会影响飞行。`,String.raw`Think of each arrow as a push: one wind pushes sideways and the other lifts upward. Add the horizontal parts together, and add the vertical parts together.
One setting in this level is
\[(8,0)+(0,16)=(8,16).\]
The green arrow points up and right. Reverse the horizontal wind and the sum becomes
\[(-8,0)+(0,16)=(-8,16),\]
so the green arrow points up and left.
This is the direction of the combined wind, not a straight path the bird must follow. Its existing speed, your steering and gravity also affect its flight.`],
 boundary:['横风与竖风互相垂直，不会互相抵消。上托只抵掉一部分重力，鸟仍会落下。这里是游戏中的二维运动模型；两个落脚台都实际到达后才完成机关。','The perpendicular winds do not cancel one another. Upward wind offsets only part of gravity, so the bird still comes down. This is a two-dimensional game model; both ledges must actually be landed on.']};
export function buildVector(a){const {state,platform,box,label,feather,checkpointAt,makeGate,tx,THREE,root}=a;
 const s=state.vector={ix:0,iy:0,arrivals:[false,false],controls:[],labels:[],forces:{x:0,y:0},acceleration:{x:0,y:-27},inField:false,settled:false,changes:0};state.analysisReady=false;state.specialGates=[];
 platform(16,0,12,{h:2});platform(33,-3.5,44,{h:.75,color:0xc0d4cd});platform(25.2,-1.8,6.4);platform(38,-1.8,5.6);platform(57,-1.7,4,{h:.65});platform(69,0,14,{h:3,pillar:true});
 s.rest=platform(28,-.2,5.6,{oneWay:true,h:.18,color:0xbad4cc,vectorRest:true});label(()=>tx('中间也能歇脚','A place to catch your breath'),28,1.35,{w:10,font:25});
 s.perches=[platform(44,.6,24,{h:.5,color:0xe2d19d,vectorArrival:0}),platform(23,3.8,14,{oneWay:true,h:.18,color:0xc1d8cc,vectorArrival:1})];checkpointAt(39,.6);
 for(const [x,y,axis] of controlLayout(a.cMode===true)){const f=platform(x,y,1.8,{h:.65,solid:true,color:axis==='x'?0xa5c9c7:0xd9c590,vectorControl:axis});s.controls.push(f);label(axis==='x'?'↔':'↕',x,y-.26,{w:2.7,font:90,z:1.11});s.labels.push(label(()=>{const value=axis==='x'?WIND_X[s.ix]:WIND_Y[s.iy];return value===0?'0':axis==='x'?(value>0?'→':'←'):(value>0?'↑':'↓');},x,y+.9,{w:4.4,font:90,bold:true}));}
 s.labels.push(label(()=>s.arrivals[0]?tx('到了 ✓','Landed ✓'):tx('1. 先到这边 →','1. First landing →'),35.5,2.5,{w:9,font:30}));s.labels.push(label(()=>s.arrivals[1]?tx('回来了 ✓','Back again ✓'):s.arrivals[0]?tx('2. 换成 ←，飞回来','2. Set ←, then fly back'):tx('回来时落在这里','Land here on the way back'),23,5.8,{w:12,font:30}));
 s.labels.push(label(()=>s.arrivals[0]&&!s.arrivals[1]?(s.ix===2&&s.iy===1?tx('← 就这样，飞回上层','← Ready. Fly back to the upper ledge.'):tx('← 上托不变，横风朝左','← Keep ↑. Turn the crosswind left.')):'',43,6.0,{w:13,font:28}));
 label(()=>tx('起飞 →','Take off →'),20.5,1.15,{w:5,font:30});
 s.labels.push(label(()=>tx('绿色：两股风合起来','Green: both winds together'),30,10.7,{w:14,font:28}));
 label(()=>tx('← 这里走回岸边','← Back to the bank'),32,-2.5,{w:12,font:28});label(()=>tx('这里上岸，没有风','A calm step back up'),23.1,.05,{w:9,font:26});
 // Static boundary markings communicate the force region; the safety path is outside it.
 for(const x of [24,34])for(let j=0;j<7;j++)box(x,.4+j*1.8,-1.4,.045,.72,.045,0xa2bab0);
 const makeArrow=color=>{const group=new THREE.Group();root.add(group);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1,7),new THREE.MeshBasicMaterial({color}));const tip=new THREE.Mesh(new THREE.ConeGeometry(.12,.32,9),shaft.material);group.add(shaft,tip);return {group,shaft,tip};};
 s.arrows=[makeArrow(0x4d9a9c),makeArrow(0xc5a34e),makeArrow(0x5b9460)];s.accelArrow=makeArrow(0x677b80);
 const g=makeGate(59,0);g.bottom=-6;g.height=26;g.f.y=20;g.f.h=26;g.curtain.position.y=7;g.curtain.scale.y=26;s.gate=g;state.specialGates.push(g);
 for(const [x,y] of [[20,5.1],[29,4.9],[35,2.1],[44,2.0],[49,1.9],[25,-.45],[41,-2.2],[69,1.3]])feather(x,y,y>6);
 updateVector(a,0);
}
function setArrow(arrow,x,y,dx,dy,z=-.6){const length=Math.hypot(dx,dy);arrow.group.visible=length>.01;if(!arrow.group.visible)return;arrow.group.position.set(x,y,z);arrow.group.rotation.z=-Math.atan2(dx,dy);arrow.shaft.scale.y=length;arrow.shaft.position.y=length/2;arrow.tip.position.y=length;}
export function vectorForces(state,p){const s=state.vector;if(!s)return null;const active=!s.settled&&p.x>=24&&p.x<=34&&p.y>.08&&p.y<13.2&&!p.grounded;s.inField=active;return active?{x:WIND_X[s.ix],y:WIND_Y[s.iy],drag:WIND_DRAG,steer:WIND_STEER}:null;}
export function onVectorHead(f,a){if(!f?.vectorControl||!a.state.vector)return false;const s=a.state.vector;if(s.settled)return true;const key=f.vectorControl==='x'?'ix':'iy';s[key]=(s[key]+1)%3;s.changes++;s.labels.forEach(l=>l.userData.refresh?.());a.tone?.(440+(s.ix+s.iy)*80,.075);if(s.changes===1)a.showToast?.(a.tx('箭头变了，风就真的变了。','A new arrow. A real change in force.'),2.5);return true;}
export function onVectorLanding(f,a){if(f?.vectorArrival===undefined||!a.state.vector)return false;const s=a.state.vector,i=f.vectorArrival;if(!s.arrivals[i]){s.arrivals[i]=true;a.showToast?.(a.tx(i?(s.arrivals[0]?'回来了！可以往出口走了。':'这里先记下了，再到右边的大平台。'):'到了！横风调成 ←，上托保持 ↑。再飞回左上方。',i?(s.arrivals[0]?'Back again! The exit is ready.':'This landing counts. Next, the wide platform on the right.'):'Landed! Set the horizontal wind to ← and keep ↑. Fly back to the upper ledge.'),2.7);a.tone?.(710+i*120,.1);}s.labels.forEach(l=>l.userData.refresh?.());a.state.analysisReady=s.arrivals.every(Boolean);if(a.state.analysisReady&&!s.settled){s.settled=true;s.ix=s.iy=0;s.labels.forEach(l=>l.userData.refresh?.());}return true;}
export function updateVector(a,dt){const s=a.state.vector;if(!s)return;s.forces=vectorSum({x:WIND_X[s.ix],y:0},{x:0,y:WIND_Y[s.iy]});setArrow(s.arrows[0],28,7.4,s.forces.x*.13,0);setArrow(s.arrows[1],28+s.forces.x*.13,7.4,0,s.forces.y*.13);setArrow(s.arrows[2],28,7.4,s.forces.x*.13,s.forces.y*.13);
 s.accelArrow.group.visible=false;
 s.gate.open=!!a.state.analysisReady;s.gate.f.active=!s.gate.open;s.gate.curtain.visible=!s.gate.open;
}
export function drawVector(r,g){if(g.L.kind!=='vector')return;const s=g.state.vector,c=r.ctx,u=r.unit;
 c.strokeStyle='#91b4b066';c.lineWidth=1.5;c.setLineDash([6,9]);for(const x of [24,34]){const a=r.project(x,.1,-1.4),b=r.project(x,13.2,-1.4);c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}c.setLineDash([]);
 const arrow=(x,y,dx,dy,color,width=2.5)=>{const a=r.project(x,y,-.6),b=r.project(x+dx,y+dy,-.6),angle=Math.atan2(b[1]-a[1],b[0]-a[0]);if(Math.hypot(dx,dy)<.01)return;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();c.beginPath();c.moveTo(...b);for(const delta of [-.5,.5])c.lineTo(b[0]-Math.cos(angle+delta)*u*.18,b[1]-Math.sin(angle+delta)*u*.18);c.closePath();c.fill();};
 arrow(28,7.4,s.forces.x*.13,0,'#4d9a9c');arrow(28+s.forces.x*.13,7.4,0,s.forces.y*.13,'#c5a34e');arrow(28,7.4,s.forces.x*.13,s.forces.y*.13,'#5b9460',3);

}

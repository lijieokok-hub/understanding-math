export const WRAP_LEVEL={id:18,kind:'wrap',width:58,name:['右边出去，左边回来','Around the Same Page'],tag:['纸卷起来了。路还接着。','The page curls. The path continues.'],color:0xdde7dc,ink:0x426c62,accent:0xc6a569,ground:0xe9e1ce,
 hint:['两条青色纸边是同一条接缝。飞过一边，会从另一边以原来的高度和速度接着飞。','The two teal edges are the same seam. Cross either one and continue from the other at the same height and speed.'],
 task:['中间纸墙挡着近路。沿接缝绕到背面的高台，再从纸筒上方飞出去。','The paper wall blocks the direct route. Wrap around to the higher perches, then fly out above the rolled page.'],
 jokes:[['绕了一圈。没有加班一圈。','A round trip. No extra paperwork.'],['路走完了，翅膀也没被偷偷补满。','A new edge. The same remaining flap.'],['右边不是世界尽头。只是这张纸的边。','The edge of the page is not the edge of the world.']],
 completion:['这回，绕路真的是近路。','The long way around turned out to be the short way.'],
 proof:[String.raw`纸筒内部用周期横坐标表示：\(x\sim x+L\)，其中 \(L=12\)。用一条宽为 \(L\) 的平面带表示圆柱，左右边按同一高度粘合。
横向穿过右缝时减去 \(L\)，穿过左缝时加上 \(L\)。接缝变换保持 \(y\)、\(v_x\)、\(v_y\) 不变，也不增加振翅余量。跨缝前后的连续运动，在平面画面上显示为两边相接。
纸墙和踏板是纸筒中的有限障碍；从上沿离开后，回到普通平面路段。`,String.raw`Inside the rolled page, the horizontal coordinate is periodic: \(x\sim x+L\), with \(L=12\). A planar strip of width \(L\) represents the cylinder, with its two edges identified at equal heights.
Crossing the right seam subtracts \(L\); crossing the left seam adds \(L\). The transition preserves \(y\), \(v_x\), \(v_y\), and the remaining flap. Continuous movement across the seam appears at opposite edges of this planar view.
The wall and perches are finite obstacles on the cylinder. Above its rim, the exit returns to an ordinary planar section.`],
 boundary:['只展示指定圆柱区域的周期坐标识别；没有把一般环面、遍历性或任意拓扑定理归结为一次跨缝。接缝处露出的另一侧片段属于同一只小鸟，不增加碰撞实体。','This illustrates a specified periodic cylinder model, not a theorem about general tori, ergodicity, or arbitrary topology. The slice visible across the seam belongs to the same bird; it does not add a second colliding body.']};

export function wrapCrossing(p,previousX,s){
 if(previousX<s.left||previousX>s.right||p.y<s.floor-.5||p.y>s.rim)return 0;
 const delta=p.x<s.left?s.length:p.x>s.right?-s.length:0;
 if(!delta)return 0;
 p.x+=delta;s.crossings++;s.lastDirection=delta>0?-1:1;
 return delta;
}
export function wrapPreview(p,s){
 if(p.y<s.floor-.5||p.y>s.rim||p.x<s.left||p.x>s.right)return null;
 if(p.x-s.left<1.5)return p.x+s.length;
 if(s.right-p.x<1.5)return p.x-s.length;
 return null;
}
export function buildWrap(a){
 const {THREE,state,platform,box,label,root,mat,feather,checkpointAt,tx}=a;
 const s=state.wrap={left:18,right:30,length:12,floor:-2.2,rim:9,crossings:0,lastDirection:0,exited:false};
 platform(24,s.floor,12,{wrapSurface:true,h:.8,color:0xccd8c5});
 s.perches=[platform(20,0,3.8,{wrapSurface:true,color:0xe5dcc0}),platform(28,2.3,3.8,{wrapSurface:true,color:0xd6dfc7}),platform(20,4.6,3.8,{wrapSurface:true,color:0xe5dcc0}),platform(28,6.9,3.8,{wrapSurface:true,color:0xd6dfc7})];
 platform(24,7.8,2.6,{wrapSurface:true,h:10,solid:true,color:0xd6d0b8});
 s.exit=platform(34,8,5.2,{color:0xd4c49a,wrapExit:true});platform(40,5.6,5.2,{color:0xe1dbc4});platform(46,3.1,5.2,{color:0xe1dbc4});platform(55,0,13,{h:3,pillar:true});
 checkpointAt(20,0);checkpointAt(40,5.6);
 for(const x of [s.left,s.right]){
  const roll=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,11.2,16),mat(0xeee7d4));roll.position.set(x,3.4,-.32);root.add(roll);
  box(x,3.4,.04,.055,11.2,.055,0x568e80);
  for(let j=0;j<6;j++){const y=s.floor+j*2.2;box(x,y,.09,.48,.075,.045,j%2?0xbb9b59:0x5f9585);}
 }
 label(()=>tx('同一条接缝','The same seam'),24,10.5,{w:11,font:31});
 label('↔',18,9.55,{w:2.1,font:74});label('↔',30,9.55,{w:2.1,font:74});
 label(()=>tx('先绕过去，再往上飞。','Around first. Then up.'),24,-4.1,{w:12,font:29});
 label(()=>tx('从纸的上沿出去','Leave above the rim'),34,10.7,{w:10,font:29});
 for(const [x,y] of [[20,1.3],[28,3.6],[20,5.9],[28,8.2],[24,9.1],[34,9.3],[40,6.9],[46,4.4],[53,1.3],[57,1.5],[19,-.9],[29,-.9]])feather(x,y,y>8);
 return s;
}
export function drawWrap(r,g,phase='under'){
 if(g.L.kind!=='wrap'||phase!=='under')return;
 const c=r.ctx,u=r.unit,s=g.state.wrap;
 for(const x of [s.left,s.right]){
  const low=r.project(x,s.floor,-.32),high=r.project(x,s.rim,-.32),width=.44*u;
  const grad=c.createLinearGradient(low[0]-width/2,0,low[0]+width/2,0);grad.addColorStop(0,'#c7c6ae');grad.addColorStop(.5,'#fff6de');grad.addColorStop(1,'#d9d9c3');c.fillStyle=grad;c.fillRect(low[0]-width/2,high[1],width,low[1]-high[1]);
  c.strokeStyle='#568e80';c.lineWidth=2;c.beginPath();c.moveTo(...r.project(x,s.floor,.04));c.lineTo(...r.project(x,s.rim,.04));c.stroke();
  for(let j=0;j<6;j++){const [px,py]=r.project(x,s.floor+j*2.2,.09);c.strokeStyle=j%2?'#bb9b59':'#5f9585';c.lineWidth=2;c.beginPath();c.moveTo(px-u*.24,py);c.lineTo(px+u*.24,py);c.stroke();}
 }
}

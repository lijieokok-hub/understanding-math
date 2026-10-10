// Adjacent swaps move whole, labelled platforms. The multiset of heights never changes.
export const SWAP_HEIGHTS=[.6,3.2,5.8,8.4];
export const SWAP_STATIONS=[18,25,32,39];
export function adjacentSwap(order,index){if(!Number.isInteger(index)||index<0||index>=order.length-1)throw new RangeError('Choose neighbouring stations');const next=[...order];[next[index],next[index+1]]=[next[index+1],next[index]];return next;}
export function inversionCount(order){let n=0;for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++)if(order[i]>order[j])n++;return n;}
export const PERMUTATION_LEVEL={id:19,kind:'permutation',width:70,name:['高的先别急','Please Mind the Order'],tag:['台阶没少。就是座位有点乱。','All the steps are here. The seating plan needs work.'],color:0xe6e7d9,ink:0x5b7162,accent:0xc8a261,ground:0xe7e0c9,
 hint:['↑ 顶两台之间的换座钮，它们会交换位置。每个钮只管相邻两台。','Bump a swap button with ↑ to exchange the two neighbouring perches. Each button connects one pair.'],
 task:['把台阶排成从左到右逐级升高。下面的纸路始终能走，换错了再顶一次。','Arrange the steps so they rise from left to right. The lower path stays open; bump the same button again to undo a swap.'],
 jokes:[['不是你跳得不高。是它插队了。','That step cut in line.'],['换回来也算操作，不算白忙。','Undo is a perfectly respectable move.'],['这回谁也没插队。','Everyone is finally in step.']],
 completion:['一块没多，一块没少。路顺了。','The same four steps. A much better route.'],
 proof:[String.raw`四块平台的高度始终是 \(0.6,3.2,5.8,8.4\)，编号依次为 \(1,2,3,4\)。每次换座只交换相邻两项，平台、编号和碰撞体一起移动。
初始顺序是 \((3,1,4,2)\)。交换第1对、第3对、再交换第2对，就得到 \((1,2,3,4)\)。这三次交换每次都减少一个逆序对；高度与平台总数保持不变。
同一对连换两次会回到原顺序。这里只把一个四项排列排好，不把一次成功跳跃当成一般排序算法的证明。`,String.raw`The four perch heights remain \(0.6,3.2,5.8,8.4\), labelled \(1,2,3,4\). Each control exchanges adjacent entries, moving each perch, its label, and its collider together.
The initial order is \((3,1,4,2)\). Swap the first pair, the third pair, then the second pair to obtain \((1,2,3,4)\). Each of these three swaps removes one inversion. The set of heights and the number of platforms are unchanged.
Swapping the same pair twice restores its order. This solves one four-entry arrangement; a successful jump is not a proof of a general sorting algorithm.`],
 boundary:['换座过程中碰撞体跟着可见平台移动；站在平台上的鸟一起移动。过关检查实际排列已经递增，不能用按钮次数代替。下方回路不随排列关闭。','During a swap, collision surfaces follow the visible perches and carry a standing bird. Completion checks the actual increasing order, not a count of button presses. The lower return path never closes.']};
export function buildPermutation(a){
 const {state,platform,label,box,feather,checkpointAt,makeGate,tx}=a;
 const s=state.permutation={order:[2,0,3,1],tiles:[],controls:[],labels:[],motion:null,moves:0};state.analysisReady=false;state.specialGates=[];
 platform(29,-1.7,40,{h:.65,color:0xc8d6c4});platform(12,-.8,3.6,{solid:true});checkpointAt(14.5,-1.7);
 const colors=[0xcbd6b5,0xe1c99d,0xc2d8d2,0xd3bfd1];
 for(let rank=0;rank<4;rank++){
  const x=SWAP_STATIONS[s.order.indexOf(rank)],f=platform(x,SWAP_HEIGHTS[rank],4.2,{h:.6,color:colors[rank],permutationRank:rank});s.tiles.push(f);s.labels.push(label(String(rank+1),x,f.y+1.1,{w:5,font:86,bold:true}));
  for(let j=0;j<=rank;j++)box(-.55+j*.35,-.3,1.1,.12,.24,.045,0x597b70,f.group);
 }
 for(let i=0;i<3;i++){
  const x=(SWAP_STATIONS[i]+SWAP_STATIONS[i+1])/2,f=platform(x,1.5,1.5,{h:.6,solid:true,color:0xc3b478,permutationSwap:i});s.controls.push(f);label('↔',x,2.35,{w:4.8,font:84});
  for(const endpoint of [SWAP_STATIONS[i],SWAP_STATIONS[i+1]]){box((endpoint+x)/2,.9,-.9,Math.abs(endpoint-x),.03,.03,0x8d9c79);box(endpoint,1.25,-.9,.035,.7,.035,0x8d9c79);}
 }
 label(()=>tx('每次只换旁边这两位。','Just these two neighbours.'),27,-3.1,{w:15,font:29});
 const gate=makeGate(45,-1.7);gate.bottom=-4;gate.height=20;gate.f.y=16;gate.f.h=20;gate.curtain.position.y=6;gate.curtain.scale.y=20;s.gate=gate;state.specialGates.push(gate);
 platform(48,10.7,6,{h:.65,color:0xd5c8a2});platform(54,7.5,5.5);platform(60,4,5.5);platform(66,0,12,{h:3,pillar:true});platform(48,-1.7,5,{h:.65});platform(54,-.8,5.5);checkpointAt(48,10.7);
 label(()=>tx('排好了，就顺着走。','In order. Onward.'),47,13.2,{w:10,font:30});
 for(const [x,y] of [[14,-.4],[18,1.8],[25,4.4],[32,7],[39,9.6],[48,11.9],[58,5.2],[66,1.3]])feather(x,y,y>9);
}
export function onPermutationHead(f,a){
 if(f?.permutationSwap===undefined||!a.state.permutation)return false;
 const s=a.state.permutation;if(s.motion)return true;
 const index=f.permutationSwap,old=s.order;s.order=adjacentSwap(old,index);s.moves++;
 s.motion={age:0,duration:.55,from:s.tiles.map(tile=>tile.x),to:s.tiles.map((tile,rank)=>SWAP_STATIONS[s.order.indexOf(rank)])};
 a.tone?.(440+index*90,.08);if(s.moves===1)a.showToast?.(a.tx('整块换过去，编号也跟着。','The whole perch moves. Its number comes along.'),2.4);
 return true;
}
export function updatePermutation(a,dt){const s=a.state.permutation;if(!s)return;
 if(s.motion){s.motion.age=Math.min(s.motion.duration,s.motion.age+dt);const t=s.motion.age/s.motion.duration,e=t*t*(3-2*t);s.tiles.forEach((f,i)=>a.movePlatform(f,s.motion.from[i]+(s.motion.to[i]-s.motion.from[i])*e,f.y));if(t>=1)s.motion=null;}else s.tiles.forEach(f=>{f.dx=f.dy=0;});
 s.labels.forEach((l,i)=>l.position.x=s.tiles[i].x);a.state.analysisReady=!s.motion&&inversionCount(s.order)===0;
 s.gate.open=a.state.analysisReady;s.gate.f.active=!s.gate.open;s.gate.curtain.visible=!s.gate.open;
}
export function drawPermutation(r,g){if(g.L.kind!=='permutation')return;const c=r.ctx,s=g.state.permutation;c.strokeStyle='#8d9c7990';c.lineWidth=1.5;
 for(let i=0;i<3;i++){const f=s.controls[i];c.beginPath();for(const endpoint of [SWAP_STATIONS[i],SWAP_STATIONS[i+1]]){const a=r.project(f.x,.9,-.9),b=r.project(endpoint,.9,-.9),e=r.project(endpoint,1.6,-.9);c.moveTo(...a);c.lineTo(...b);c.lineTo(...e);}c.stroke();}
}

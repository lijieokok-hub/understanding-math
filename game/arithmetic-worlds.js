// Physical paper lengths and conserved unit cells. No arithmetic answer boxes.
export const PAPER_UNIT=1.2;
export function paperLayout(columns){if(![3,4,6].includes(columns))throw new RangeError('Use a divisor of twelve');return Array.from({length:12},(_,i)=>({column:i%columns,row:Math.floor(i/columns)}));}
export function coversSpan(intervals,start,end){let reach=start;for(const [a,b] of [...intervals].sort((x,y)=>x[0]-y[0])){if(b<start)continue;if(a>reach+1e-8)return false;reach=Math.max(reach,b);if(reach>=end-1e-8)return true;}return false;}
export function inventoryIds(s){return [...s.bins.filter(x=>x!==null),...(s.carry===null?[]:[s.carry]),...s.bridges.flatMap(b=>b.ids)];}
export const ARITHMETIC_LEVELS=[
 {id:2,kind:'array',width:64,name:['一张纸，几种排法','Room for Every Block'],tag:['分得挺公平，就是不够高。','Perfectly fair. Not quite tall enough.'],color:0xe8e4da,ink:0x6b6751,accent:0xc5a161,ground:0xe5ddc7,
 hint:['↑ 顶折纸钮，把同一张十二格纸换个排法。先到矮收件台，再到高收件台。','Bump the folding button with ↑ to rearrange the same twelve squares. Reach the low delivery perch, then the high one.'],task:['格子不会变多。多几行，就会少几列。回程纸梯会在第一份送到后展开。','There are always twelve squares. More rows mean fewer columns. Your return steps unfold after the first delivery.'],jokes:[['纸没少。只是横着的挪去竖着了。','Nothing vanished. Some width became height.'],['这回分得公平，也够得着了。','Fairly divided. Finally within reach.'],['再折一次，纸也没变成十三格。','Another fold. Still not a thirteenth square.']],
 proof:[String.raw`纸面一直由12个相同单位格组成。可选排列是 \(6\times2\)、\(4\times3\) 和 \(3\times4\)。每一种排列的格子总数都是12。
把12格平均分为 \(r\) 行，每行就是 \(12/r\) 格；改变行数，会同时改变可见宽度和高度。这里展示乘法计数与整数等分，单位格并没有被复制。`,String.raw`The paper always contains twelve identical unit squares. The available arrangements are \(6\times2\), \(4\times3\), and \(3\times4\), each with twelve squares.
Dividing the squares equally among \(r\) rows gives \(12/r\) squares per row. Changing the grouping changes the physical width and height without creating any new squares.`],
 boundary:['只提供12的这些整数分组，不暗示任意整数都能等分出任意整数行列。折纸按钮在纸块外，变化后每一格的画面与碰撞位置同步。','Only the displayed integer factorizations of twelve are offered. The control is outside the blocks, and each square’s visible and collision positions change together.']},
 {id:1,kind:'addition',width:65,name:['桥也要做加减','A Little More, a Little Less'],tag:['显然，这里还差一段。','Clearly. Except for this missing piece.'],color:0xdce8de,ink:0x315b53,accent:0xc19a50,ground:0xeae8d6,
 hint:['← → 走；↑ 起跳，再按可振翅。顶纸盒取一卷，到桥边展开；多铺的可以收回。','← → move; ↑ jumps and a second ↑ flaps. Bump a paper box and unfold its roll at a bridge post. Extra pieces can be retrieved.'],task:['空手顶桥柱，会把最后一段收回。两处缺口都补齐，门就开。','Bump a bridge post with empty wings to retrieve its last piece. Fill both real gaps to open the gate.'],jokes:[['加法会了。桥还得自己搭。','The addition is easy. The bridge needs your help.'],['多铺的那段，原来能收回来。','The spare piece was already in your bridge.'],['“显然”说有桥。小鸟决定自己带纸。','“Clearly” promised a bridge. The bird brought paper.']],
 proof:[String.raw`三卷纸的长度分别为2、3、4个单位。第一处缺口长5个单位，第二处长4个单位。每卷只存在一份。
把2与3首尾相接，实际总长为 \(2+3=5\)，再把4留给第二处，两处都能覆盖。若先把4也接在第一处，空手取回这一卷会把那段长度减去；原材料仍在鸟手上，并未消失。`,String.raw`The three rolls have lengths 2, 3, and 4 units. The first gap is 5 units long and the second is 4 units long. Each roll exists exactly once.
Joining 2 and 3 end to end gives \(2+3=5\), leaving the 4-unit roll for the second gap. If the 4-unit roll was also placed at the first bridge, retrieving it subtracts that length from the bridge while preserving the material in the bird’s wings.`],
 boundary:['加法对应首尾相接的真实长度，减法对应取回真实纸段。出口仍检查实际区间是否覆盖缺口，不把重叠长度重复相加。拾到纸卷不等于完成一般数学证明。','Addition represents end-to-end physical lengths; subtraction retrieves an actual piece. The exit checks real interval coverage rather than counting overlap twice. Picking up a roll does not prove a general theorem.']}
];
function gate(a,x){const g=a.makeGate(x,0);g.bottom=-3.5;g.height=15;g.f.y=11.5;g.f.h=15;g.curtain.position.y=4;g.curtain.scale.set(.12,15,1.7);a.state.specialGates.push(g);return g;}
function open(g,yes){g.open=yes;g.f.active=!yes;g.curtain.visible=!yes;}
function refresh(s){for(const label of s.labels||[])label.userData?.refresh?.();}
export function buildArithmetic(kind,a){
 const {state,platform,feather,label,checkpointAt,box,outline,tx}=a;state.specialGates=[];state.analysisReady=false;
 if(kind==='array'){
  platform(15,0,8,{h:2});platform(38,-3.5,65,{h:.8,color:0xc8d1be});platform(20.7,-1.7,3);platform(53,0,24,{h:2});
  const s=state.array={columns:6,index:0,tiles:[],deliveries:[false,false],labels:[]};
  s.control=platform(16,3.2,2.4,{h:.7,solid:true,color:0xd7c699,arithmeticHead:'fold'});box(0,-.35,1.12,.72,.38,.08,0xf8eed2,s.control.group);
  for(let i=0;i<12;i++)s.tiles.push(platform(26,1.2,1.2,{h:1.2,solid:true,color:i%2?0xd7d8b8:0xe7ddba,arrayTile:i}));
  s.low=platform(34,2.4,5.2,{oneWay:true,h:.4,color:0xbcccac,arrayDelivery:0});s.high=platform(35,7.7,6,{oneWay:true,h:.4,color:0xd8c087,arrayDelivery:1});
  s.returnSteps=[platform(33,-1.1,3,{oneWay:true,h:.4,active:false,hiddenWhenInactive:true}),platform(36,.8,3,{oneWay:true,h:.4,active:false,hiddenWhenInactive:true})];checkpointAt(17,0);checkpointAt(34,2.4);s.gate=gate(a,43);
  s.labels.push(label(()=>s.columns+tx(' 列 · ',' columns · ')+(12/s.columns)+tx(' 行 · 共十二格',' rows · twelve squares'),26,9.2,{w:15,font:29}));label(()=>tx('↑ 顶一下，换个排法','↑ Bump to fold again'),16,4.75,{w:11,font:28});label(()=>tx('先送这里','First delivery'),34,4,{w:7,font:27});label(()=>tx('还有一份在上面','One more, up here'),35,9.1,{w:10,font:26});
  for(const [x,y] of [[14,1.4],[20,1.4],[25,3.5],[34,3.6],[35,8.9],[40,1.2],[49,1.3],[58,1.3]])feather(x,y,y>8);
  layoutArray(a);return;
 }
 if(kind==='addition'){
  for(let j=0;j<3;j++)platform(14.8+j*3.6,.2+j*.24,2.7);
  label(()=>tx('这次，带上自己的桥。','This time, bring your own bridge.'),18,3.8,{w:11,font:29});
  platform(31,0,14,{h:2});platform(48,0,8,{h:2});platform(62,0,10.4,{h:2});platform(40,-3.5,58,{h:.8,color:0xc0d4c4});for(const x of [13,40,54.5])platform(x,-1.7,3);checkpointAt(26,0);
  const s=state.addition={units:[2,3,4],bins:[0,1,2],carry:null,pieces:[],binBoxes:[],binMarks:[],labels:[],bridges:[{start:38,end:44,ids:[]},{start:52,end:56.8,ids:[]}],moves:0};
  for(let i=0;i<3;i++){
   const f=platform(27.5+i*3,3.2,2.0,{h:.75,solid:true,color:[0xc6d7b5,0xddc79e,0xb8d0d0][i],arithmeticHead:'bin',binIndex:i});s.binBoxes.push(f);s.binMarks.push(box(0,-.34,1.12,.78,.36,.12,0xf6edd3,f.group));
   s.labels.push(label(()=>s.bins[i]===null?tx('空纸盒','Empty box'):tx('纸卷 ','Roll ')+s.units[s.bins[i]],f.x,4.65,{w:4.5,font:27}));
   const piece=platform(0,0,s.units[i]*PAPER_UNIT,{oneWay:true,h:.35,color:0xd8dfc5,active:false,hiddenWhenInactive:true,paperPieceId:i});for(let mark=1;mark<s.units[i];mark++)box(-piece.w/2+mark*PAPER_UNIT,-.14,1.08,.025,.2,.035,0x9caa83,piece.group);s.pieces.push(piece);
  }
  for(const [i,x] of [36,50].entries()){const f=platform(x,3.2,2.1,{h:.75,solid:true,color:0xc8b77e,arithmeticHead:'bridge',bridgeIndex:i});s.bridges[i].post=f;label(()=>tx('↑ 展开 / 收回','↑ Place / retrieve'),x,4.65,{w:8.5,font:27});}
  s.carryMesh=box(0,0,1.1,.85,.45,.18,0xf2e7c5);s.carryMesh.visible=false;s.gate=gate(a,59);label(()=>tx('多铺的，也能收回来。','A spare piece can come back.'),47,6.4,{w:13,font:28,opacity:.7});
  for(const [x,y] of [[15,1.4],[20,1.9],[25,1.3],[38.7,1.4],[41.8,1.4],[47,1.4],[54,1.4],[62,1.3]])feather(x,y,false);rebuildAddition(a);
 }
}
function layoutArray(a){const s=a.state.array,cells=paperLayout(s.columns);cells.forEach(({column,row},i)=>{const f=s.tiles[i];f.x=26+(column-(s.columns-1)/2)*PAPER_UNIT;f.y=(row+1)*PAPER_UNIT;f.group.position.set(f.x,f.y,0);f.dx=f.dy=0;});refresh(s);}
function rebuildAddition(a){const s=a.state.addition;for(const f of s.pieces){f.active=false;f.group.visible=false;}
 for(const bridge of s.bridges){let x=bridge.start;for(const id of bridge.ids){const f=s.pieces[id];f.x=x+f.w/2;f.y=0;f.group.position.set(f.x,0,0);f.active=true;f.group.visible=true;f.dx=f.dy=0;x+=f.w;}bridge.covered=coversSpan(bridge.ids.map(id=>{const f=s.pieces[id];return [f.x-f.w/2,f.x+f.w/2]}),bridge.start,bridge.end);bridge.length=(x-bridge.start)/PAPER_UNIT;}
 s.binMarks.forEach((m,i)=>{m.visible=s.bins[i]!==null;});s.carryMesh.visible=s.carry!==null;a.state.analysisReady=s.bridges.every(b=>b.covered);open(s.gate,a.state.analysisReady);refresh(s);
}
export function onArithmeticHead(f,a){if(!f?.arithmeticHead)return false;
 const {state,p,showToast,tx,tone}=a;
 if(f.arithmeticHead==='fold'){const s=state.array;s.index=(s.index+1)%3;s.columns=[6,4,3][s.index];layoutArray(a);tone?.(510+s.index*90,.1);return true;}
 const s=state.addition;if(!s)return false;
 if(f.arithmeticHead==='bin'){const i=f.binIndex,[held,stored]=[s.carry,s.bins[i]];s.carry=stored;s.bins[i]=held;}
 else{const bridge=s.bridges[f.bridgeIndex];if(s.carry!==null){bridge.ids.push(s.carry);s.carry=null;}
  else if(bridge.ids.length){const id=bridge.ids.at(-1);if(p?.on===s.pieces[id]){showToast?.(tx('先站到岸上，再收这一段。','Step onto the bank before retrieving this piece.'),2.5);return true;}s.carry=bridge.ids.pop();showToast?.(tx('减下来的，在你翅膀上。','Subtracted from the bridge. Still in your wings.'),2.5);}
  else{showToast?.(tx('这里还没铺，先带一卷来。','Nothing laid here yet. Bring a roll.'),2.3);return true;}}
 s.moves++;rebuildAddition(a);tone?.(620,.09);return true;
}
export function onArithmeticLanding(f,a){if(f?.arrayDelivery===undefined||!a.state.array)return false;const s=a.state.array,index=f.arrayDelivery;if(!s.deliveries[index]){s.deliveries[index]=true;if(index===0){for(const step of s.returnSteps){step.active=true;step.group.visible=true;}a.showToast?.(a.tx('收到了。回程纸梯也展开了。','Delivered. Your return steps have unfolded.'),2.8);}else a.showToast?.(a.tx('这回够高了，十二格一格没多。','High enough. Still exactly twelve squares.'),2.8);a.tone?.(740,.12);}a.state.analysisReady=s.deliveries.every(Boolean);open(s.gate,a.state.analysisReady);return true;}
export function updateArithmetic(a){const {state,p}=a;if(state.addition){const s=state.addition;s.carryMesh.visible=s.carry!==null;s.carryMesh.position.set(p.x+p.facing*.65,p.y+.8,1.1);}}
export function drawArithmetic(renderer,g,phase='under'){
 const c=renderer.ctx,u=renderer.unit;
 if(g.L.kind==='addition'&&phase==='over'){const s=g.state.addition;for(const [i,f] of s.binBoxes.entries())if(s.bins[i]!==null){const [x,y]=renderer.project(f.x,f.y-.34,1.12);c.fillStyle='#f6edd3';c.fillRect(x-u*.39,y-u*.18,u*.78,u*.36);}for(const f of s.pieces)if(f.active){c.strokeStyle='#9caa83';c.lineWidth=1;for(let mark=1;mark<s.units[f.paperPieceId];mark++){const [x,y]=renderer.project(f.x-f.w/2+mark*PAPER_UNIT,-.04,1.08);c.beginPath();c.moveTo(x,y);c.lineTo(x,y+u*.23);c.stroke();}}if(s.carry!==null){const [x,y]=renderer.project(g.p.x+g.p.facing*.65,g.p.y+.8,1.1);c.fillStyle='#f2e7c5';c.fillRect(x-u*.425,y-u*.225,u*.85,u*.45);c.strokeStyle='#b29a68';c.strokeRect(x-u*.425,y-u*.225,u*.85,u*.45);}}
 if(g.L.kind==='array'&&phase==='over'){const f=g.state.array.control,[x,y]=renderer.project(f.x,f.y-.35,1.12);c.fillStyle='#f8eed2';c.fillRect(x-u*.36,y-u*.19,u*.72,u*.38);c.strokeStyle='#9e956c';c.lineWidth=1;c.beginPath();c.moveTo(x-u*.1,y-u*.19);c.lineTo(x+u*.1,y+u*.19);c.stroke();}
}

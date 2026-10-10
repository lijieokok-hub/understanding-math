// Read-only guidance derived from actual mechanism state.
// Use the actual reset lens created by this level, not a historical visit count.
const atResetSection=(state,x,size)=>size===1&&Number.isFinite(x)&&Number.isFinite(state.scaleResetLens?.x)&&Number.isFinite(state.scaleResetLens.touchRadius)&&state.scaleResetLens.touchRadius>=0&&x>=state.scaleResetLens.x-state.scaleResetLens.touchRadius;
export function currentGoal(kind,state,{lang=0,vectorGoal='',complete=false,size=1,x=null}={}){
 const say=(zh,en)=>lang?en:zh;
 if(complete)return say('本关完成，可以翻到下一页','Chapter done. Choose the next one');
 // Reuse the live wind stage rather than adding a second instruction.
 if(kind==='vector')return vectorGoal;
 const ready=['addition','array','paired','permutation','reflection','composition','derivative','integral','series','ae'].includes(kind)&&state.analysisReady===true;
 if(ready){
  if(kind==='integral'&&state.reservoirs?.some(r=>r.flow!==0))return say('水位到线了，离开踏板再过桥','At gold. Step off, then cross');
  return say('机关已就绪，前往出口','Mechanism ready. Head to the exit');
 }
 switch(kind){
  case 'induction':if(state.bridge?.length&&state.bridge.every(f=>f.active))return say('桥接好了，继续往右走','Bridge complete. Continue right');break;
  case 'addition':{
   const s=state.addition;if(!s)break;const gap=s.bridges.findIndex(b=>!b.covered)+1;
   if(gap)return s.carry===null?say(`取纸或收回纸段，补第${gap}处缺口`,`Take or retrieve a roll for gap ${gap}`):say(`顶桥柱，把纸铺到第${gap}处缺口`,`Bump the post to fill gap ${gap}`);break;
  }
  case 'array':if(state.array?.deliveries[0])return state.array.columns===3?say('已经够高了，跳到高收件台','Tall enough. Jump to the high perch'):say('折成三列四行，再到高收件台','Make 3 columns; reach the high perch');break;
  case 'scale':if(state.appendixComplete)return say('两份折页都展开了，前往出口','Both pages open. Head to the exit');
   if(atResetSection(state,x,size))return state.appendixOpened>0?say('顶开或踩开剩下的折页盒','Bump or land on the remaining folded-page box'):say('向前走，顶开或踩开折页盒','Continue ahead; bump or land on the folded-page boxes');
   if(state.appendixOpened>0)return say('再碰另一份折页，展开剩下的路','Touch the other folded page');
   if(size<1)return say('穿过低洞，再碰放大透镜','Cross the tunnel; use the grow lens');
   if(size>1)return say('沿高台继续，找到还原透镜','Find the reset lens on the high path');
   return say('用透镜穿过低洞，再找两份折页','Use lenses; unfold both pages');
  case 'period':if(state.periodCrossed)return say('沿平台继续前往出口','Follow the perches toward the exit');break;
  case 'paired':if(state.pairGroups?.[0]?.bits.every(Boolean))return say('看连线，接齐后面四块桥板','Light the four linked planks');break;
  case 'permutation':if(state.permutation?.motion)return say('等换座停稳，再看台阶次序','Wait for the swap, then check');break;
  case 'composition':{
   const s=state.composition;if(!s)break;
   if(s.order.length===2)return s.value===8?say('等八号桥停稳，再亲自落上去','Land on the stopped bridge at 8'):say('回左边顶“重来”，换个先后次序','Restart left; try the other order');
   if(s.order.length===1)return s.used.T?say('已加三，再落上“翻倍”台','Added three. Now land on Double'):say('已翻倍，再顶“加三”看结果','Doubled. Next, bump Add three');break;
  }
  case 'threshold':if(state.thresholds?.length&&state.thresholds.every(f=>f.active))return say('三段都稳了，可以过桥','All three sections are stable. Cross');break;
  case 'derivative':if(state.derivativeSolved?.[0])return say('到第二段曲线，飞上对应金台','Second curve: reach its gold perch');break;
  case 'integral':{
   if(state.reservoirs?.some(r=>r.ready&&r.flow!==0))return say('水已到金线，先离开踏板','At the gold line. Step off the pad');
   const i=state.reservoirs?.findIndex(r=>!r.ready);if(i>=0)return say(`第${i+1}箱水：调到金线，再离开踏板`,`Tank ${i+1}: step off at the gold line`);break;
  }
  case 'series':if(state.series?.ready)return say('范围已进槽，等桥停稳','The range fits. Wait for the bridge');break;
  case 'inverse':return say('借升降台，沿平台继续向右','Use the lift to continue right');
  case 'symbols':if(state.secondWord)return say('路已接出，沿平台前往出口','Path built. Follow it to the exit');
   if(state.firstWord)return say('先走已接出的路，再选一次高低','Follow the path; choose a lane again');break;
  case 'wrap':if(state.wrap?.exited)return say('出口已开放，沿高台前往出口','Exit open. Take the high perches');break;
  case 'cover':if(state.coverComplete)return say('桥已没有缺口，前往出口','No gaps remain. Head to the exit');break;
  case 'ae':if(state.ae?.erased)return say('点已擦去，等两台在零线会合','Point erased. Wait for both at zero');
   if(state.ae?.atStop)return say('面积已到零，上高台顶擦点按钮','Area is zero. Bump the eraser above');break;
 }
 return GOAL_COPY[kind]?.goal[lang?1:0]||say('沿可见平台继续前进','Continue along the visible platforms');
}

// The pause reminder is selected with the same live state as the short goal.
// Completed save records and historical lens/landing counters do not locate the bird.
export function currentGuidance(kind,state,context={}){
 const {lang=0,complete=false,openingHint='',size=1,x=null}=context,say=(zh,en)=>lang?en:zh;
 const goal=currentGoal(kind,state,context);let controls=openingHint;
 if(complete)controls=say('可以翻到下一关，也可以重新玩这一关。','Choose the next chapter or replay this one.');
 else if(kind==='vector'){
  controls=state.vector?.settled?say('两处落脚都已记下，风已停。沿平台去右侧出口。','Both landings count and the wind is off. Follow the perches to the right-hand exit.'):
   state.vector?.arrivals[0]?say('把横风设为向左，竖风设为向上。朝左起跳，落到左上方纸台；空中还能振翅一次。','Set the horizontal wind left and the vertical wind up. Jump left to the upper paper ledge; you can flap once in the air.'):
   say('把横风设为向右，竖风设为向上，朝右起跳。早振翅或不振翅都可先落到纸台，再跳到右岸。','Set the horizontal wind right and the vertical wind up, then jump right. An early flap or no flap can land on the paper ledge; jump again to reach the right bank.');
 }else if(kind==='integral'){
  controls=state.reservoirs?.some(r=>r.ready&&r.flow!==0)?say('这一箱已到金线。先走下加水或放水踏板，让水位停住，再过桥。','This tank has reached its gold line. Step off the fill or drain pad to stop the water, then cross.'):
   state.analysisReady?say('两箱水都已到线。保持踏板空着，沿桥前往出口。','Both tanks are at their lines. Leave the pads clear and cross to the exit.'):
   say('站在加号踏板上进水，减号踏板上放水。看到水位进入金线范围就离开踏板；调好一箱再到下一箱。','Stand on plus to fill or minus to drain. Step off when the water reaches the gold line, then move to the next tank.');
 }else if(state.analysisReady===true&&['addition','array','paired','permutation','reflection','composition','derivative','series','ae'].includes(kind)){
  controls=say('当前机关已完成。沿现有平台前往出口；若返回再动机关，请留意目标是否重新变化。','The current mechanism is ready. Follow the platforms to the exit; if you return and change it, watch the goal update.');
 }else if(kind==='period'&&state.periodCrossed){
  controls=say('沿平台继续前往出口。如果回书签后又来到门前，等两组平台再次碰头时通过。','Continue along the perches. If a bookmark returns you before the gate, wait for the groups to meet again before crossing.');
 }else if(kind==='array'&&state.array?.deliveries[0]){
  controls=state.array.columns===3?say('现在已经是三列四行，不必再顶折纸钮。沿最高一排起跳，落到高收件台。','The paper is already three columns and four rows. Do not fold it again; jump from its top row to the high delivery perch.'):
   say('沿已经展开的纸梯返回，顶折纸钮，排成三列四行后停下，再跳到高收件台。','Return on the unfolded paper steps. Bump the folding button until there are three columns and four rows, then jump to the high perch.');
 }else if(kind==='scale'){
  controls=state.appendixComplete?say('两份折页都已展开。沿透镜和平台前往出口，返回书签后仍需按洞口高度调大小。','Both folded pages are open. Follow the lenses and perches to the exit; after returning to a bookmark, adjust your size to fit the tunnel again.'):
   size<1?say('当前已经缩小，可以穿过低洞；碰放大透镜后再登高台。','You are small enough for the low tunnel. Touch the grow lens before climbing the high perches.'):
   size>1?say('当前已经放大。沿高台走到还原透镜，再碰两份折页把路展开。','You are enlarged. Follow the high perches to the reset lens, then touch both folded pages.'):
   atResetSection(state,x,size)?say('沿前方平台走，从下顶开剩余折页盒，或落到盒子上；两份都展开后去出口。','Follow the platforms ahead. Bump the remaining folded-page boxes from below or land on them; open both, then head to the exit.'):
   say('低洞前碰缩小透镜，高台前碰放大透镜；还原后碰两份折页。R 回书签可能恢复大小，要重新看洞口。','Shrink for the low tunnel, grow for the high perches, then reset and touch both folded pages. Returning to a bookmark may reset your size, so check the tunnel again.');
 }else if(kind==='derivative'){
  controls=say('在当前这段曲线上找向右上方倾斜的箭头。落到它的小踏板，朝右按跳跃，起飞后可按左右微调，落上该段金色收件台。下方可以返回。','On the current curve, find an arrow leaning up and right. Land on its perch and launch right. After take-off, use left and right to adjust and reach that curve’s gold receiving perch. The lower route lets you return.');
 }else if(kind==='composition'&&state.composition?.order.length){
  const s=state.composition;
  controls=s.order.length===1?(s.used.T?say('加三这一站已做过，现在是 4。落到“翻倍”台，再等滑桥停稳。','Add three has run; the value is now 4. Land on Double, then wait for the bridge.'):
   say('翻倍这一站已做过，现在是 2。顶“加三”看这一次序的结果，或返回“重来”换个次序。','Double has run; the value is now 2. Bump Add three to see this order’s result, or use Restart to try another order.')):
   s.value===8?say('两次操作已把目标送到 8。等滑桥停稳后亲自落上去，出口才会打开。','The two operations target 8. Wait for the bridge to stop, then land on it to unlock the exit.'):
   say('这轮到了 5。沿下方回路回左侧，顶“重来”，再试先加三、后翻倍。','This round reached 5. Return left along the lower path, bump Restart, then try Add three before Double.');
 }else if(kind==='ae'&&state.ae?.atStop){
  controls=state.ae.erased?say('那个点已擦掉。等另一台也降到零，再沿平台前进。','The point has been erased. Wait for the other lift to reach zero, then continue.'):
   say('夹具已经到零止点。爬到高台，向上顶擦点按钮，再等两台在零线会合。','The clamp is at the zero stop. Climb to the high lift and bump the eraser, then wait for both lifts to meet at zero.');
 }else if(kind==='wrap')controls=say('左右接缝相连，穿缝登上更高的平台，再越过右侧上沿去出口。R 若回到纸筒内，仍沿这条高路走。','The left and right seams join. Cross a seam to climb the higher perches, then clear the upper-right edge. If a bookmark returns you inside, take that high route again.');
 // Keep the flight hint brief; the pause dialog retains the full instructions.
 const hint=kind==='derivative'&&lang&&!complete&&state.analysisReady!==true
  ? 'On an up-right arrow perch, jump right. Steer onto gold; retry via the lower route.' : controls;
 return {goal,controls,hint};
}
export const GOAL_COPY={
 "induction": {
  "goal": [
   "踩实桥板，让桥接下去",
   "Land on a plank to extend the bridge"
  ],
  "play": [
   "踩上第一块实心桥板，让下一块出现。",
   "Land on the first solid plank to reveal the next one."
  ]
 },
 "addition": {
  "goal": [
   "取一卷纸，补第一处缺口",
   "Bring a roll to the first gap"
  ],
  "play": [
   "顶一个纸盒，带纸卷去补第一处缺口。",
   "Bump a paper box, then carry its roll to the first gap."
  ]
 },
 "array": {
  "goal": [
   "先送到矮收件台",
   "Reach the low delivery perch"
  ],
  "play": [
   "先把第一份送到矮台。",
   "Make the first delivery to the low perch."
  ]
 },
 "scale": {
  "goal": [
   "碰缩小透镜，再穿洞",
   "Shrink, then go through the tunnel"
  ],
  "play": [
   "碰缩小透镜，从低洞穿过去。",
   "Touch the shrink lens and fit through the tunnel."
  ]
 },
 "period": {
  "goal": [
   "到门前等两组平台碰头",
   "Wait by the gate for both groups"
  ],
  "play": [
   "先到门前的实地，等门打开。",
   "Reach the solid ground by the gate, then wait for it to open."
  ]
 },
 "paired": {
  "goal": [
   "踩绿开关，接起两块桥",
   "Land on green to join the two planks"
  ],
  "play": [
   "落到绿开关上，让连着的两块桥一起亮。",
   "Land on the green switch to turn on its two linked planks."
  ]
 },
 "permutation": {
  "goal": [
   "把台阶排成从低到高",
   "Put the steps in rising order"
  ],
  "play": [
   "把四块台阶排成从左低到右高。",
   "Put the four steps in rising order from left to right."
  ]
 },
 "reflection": {
  "goal": [
   "让光照进金色圆环",
   "Guide the beam into the gold ring"
  ],
  "play": [
   "把光送进金色圆环。",
   "Guide the beam into the gold ring."
  ]
 },
 "composition": {
  "goal": [
   "把滑桥送到8，再落上去",
   "Send the bridge to 8, then land on it"
  ],
  "play": [
   "用两站把滑桥送到 8，再落上去。",
   "Use both stops to send the bridge to 8, then land on it."
  ]
 },
 "vector": {
  "goal": [
   "先飞到右边的大平台",
   "Reach the wide platform on the right"
  ],
  "play": [
   "调成 → 和 ↑，先飞到右边大平台。",
   "Set → and ↑, then fly to the wide platform on the right."
  ]
 },
 "shadow": {
  "goal": [
   "上下两条路，都要避开障碍",
   "Clear the obstacles on both lanes"
  ],
  "play": [
   "看上下两条路，让小鸟和影子都避开障碍。",
   "Watch both lanes and clear the obstacles with the bird and its shadow."
  ]
 },
 "threshold": {
  "goal": [
   "在安全台等最后一段亮起",
   "Wait safely for the last section"
  ],
  "play": [
   "到前面的安全台，等最后一段桥亮起来。",
   "Wait on the safe perch until the last bridge section appears."
  ]
 },
 "derivative": {
  "goal": [
   "从紫色小台飞到金色台",
   "Launch from purple and land on gold"
  ],
  "play": [
   "先站到左边第一块紫色小台，朝右起飞，落到金色台。",
   "Start from the first purple perch on the left, launch right, and land on the gold perch."
  ]
 },
 "integral": {
  "goal": [
   "把水调到金线，再离开踏板",
   "Reach the gold line, then step off"
  ],
  "play": [
   "把第一箱水调到金线，离开踏板后再过桥。",
   "Bring the first tank to the gold line, step off the pad, then cross."
  ]
 },
 "series": {
  "goal": [
   "让整条金色范围收进绿槽",
   "Fit the whole gold range in the slot"
  ],
  "play": [
   "两边轮流取一些包，让整条金线收进绿槽。",
   "Take packets from both sides until the whole gold range fits inside the green slot."
  ]
 },
 "inverse": {
  "goal": [
   "进紫色区，让升降台回来",
   "Enter violet to bring the lift back"
  ],
  "play": [
   "进紫色区，让升降台沿原路回来。",
   "Enter the violet field to bring the lift back along its route."
  ]
 },
 "symbols": {
  "goal": [
   "选上路或下路，让路接着长",
   "Choose a lane to build the next path"
  ],
  "play": [
   "选上路或下路，看看前面接出什么路。",
   "Choose the upper or lower lane and see which path appears ahead."
  ]
 },
 "wrap": {
  "goal": [
   "穿过接缝，绕到另一侧高台",
   "Cross the seam to the higher perch"
  ],
  "play": [
   "从左边接缝绕过去，落到右侧高一点的平台。",
   "Cross the left seam to reach the higher perch on the right."
  ]
 },
 "cover": {
  "goal": [
   "振翅留墨，补齐标记间的桥",
   "Flap to fill the bridge between markers"
  ],
  "play": [
   "空中振翅留墨，把两个标记之间接满。",
   "Flap to paint the bridge and fill the space between the two markers."
  ]
 },
 "ae": {
  "goal": [
   "把夹具推到金色止点",
   "Push the clamp to the gold stop"
  ],
  "play": [
   "把夹具推到金色止点。",
   "Push the clamp all the way to the gold stop."
  ]
 }
};

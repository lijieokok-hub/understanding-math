// Presentation-only university palettes and quiet material inlays.
// No values here are read by physics, world builders, or mathematical state.
const PALETTES={
 series:{skyTop:'#f6f0e5',skyMid:'#eee5d4',skyBase:'#d8cbb7',sun:'#fff8dc',layers:['#b8aea0','#cdc4b4','#dfd6c4'],inlay:['#c9c0ae','#ded5c2','#e8e0d0'],edge:'#526160',cap:'#fff7e5',side:'#9ca79c',bottom:'#a9b4a5',contact:'#253b3e45'},
 integral:{skyTop:'#eff4ef',skyMid:'#dceae7',skyBase:'#b9d2d0',sun:'#fff6d9',layers:['#9fbfc0','#bad2d1','#d0e1dc'],inlay:['#b9d2ce','#d5e5de','#e2ede4'],edge:'#465f65',cap:'#f7f5e5',side:'#8faeac',bottom:'#9ab5ae',contact:'#1c3e4947'},
 derivative:{skyTop:'#f4eff0',skyMid:'#e7e1e9',skyBase:'#c9c5d4',sun:'#fff3dc',layers:['#b5b0bd','#cdc7d1','#dfd9e1'],inlay:['#cbc3cd','#e0d7e0','#eee5ea'],edge:'#555c6b',cap:'#fff5e8',side:'#a4a6b0',bottom:'#b2b0b7',contact:'#302c4a43'},
 ae:{skyTop:'#f5f6ed',skyMid:'#e7efe9',skyBase:'#ccded7',sun:'#fff9e4',layers:['#adcbc1','#c7ddd1','#e0eade'],inlay:['#c8ded1','#e0ece0','#edf3e7'],edge:'#486260',cap:'#fff9e9',side:'#95afa3',bottom:'#a5bfb2',contact:'#203e4145'},
};
const NIGHT={skyTop:'#172f3e',skyMid:'#27414d',skyBase:'#36535b',sun:'#e6d9b4',layers:['#47646c','#3a5661','#314b59'],inlay:['#5a7379','#4a6570','#405b67'],edge:'#cad7cd',cap:'#e6e2ce',side:'#647e7e',bottom:'#738b84',contact:'#0a182870'};
export const isCollegeWorld=kind=>Object.hasOwn(PALETTES,kind);
export function worldPalette(kind,night=false){return isCollegeWorld(kind)?(night?NIGHT:PALETTES[kind]):null;}

// Broad, irregular silhouettes, with no ticks, data bars, axes, or repeated
// game-sized ledges. Each contour joins continuously at the tiled boundaries.
export function collegeContour(kind,span=1,height=1,layer=0){
 const pts=[];
 const add=(x,y)=>pts.push([x*span,y*height]);
 const smooth=(knots)=>{for(let j=0;j<knots.length-1;j++){const [x0,y0]=knots[j],[x1,y1]=knots[j+1];for(let k=0;k<8;k++){const t=k/8,e=t*t*(3-2*t);add(x0+(x1-x0)*t,y0+(y1-y0)*e);}}add(...knots.at(-1));};
 // Keep the ground well below the identifying structures. The last world
 // has a genuinely open, almost level horizon rather than another mountain.
 const profiles={
  series:[[0,.09],[.18,.13],[.42,.10],[.66,.16],[.86,.11],[1,.09]],
  integral:[[0,.08],[.24,.08],[.39,.10],[.65,.10],[.78,.08],[1,.08]],
  derivative:[[0,.07],[.25,.13],[.48,.08],[.76,.16],[1,.07]],
  ae:[[0,.02],[.28,.028],[.58,.02],[.82,.031],[1,.02]],
 };
 smooth((profiles[kind]||profiles.ae).map(([x,y])=>[x,y*(1+layer*.08)]));
 return pts;
}

// Filled ribbons below the ridge, never graph strokes. Reuse the same local
// normalized coordinates for both renderers. Static and baked on Canvas.
export function sceneryInlays(kind,span=1,height=1,layer=0){
 if(!isCollegeWorld(kind))return [];
 const ridge=collegeContour(kind,span,height,layer),paths=[];
 if(kind==='ae'){
  // Quiet mineral flecks only in the very low distant land. They never pulse,
  // and are not round point markers or placed in the mathematical graph plane.
  if(layer!==2)return [];
  for(const [x,y,size] of [[.08,.025,1],[.14,.055,.7],[.31,.03,.7],[.46,.06,1],[.63,.035,.8],[.73,.055,.7],[.90,.035,1]]){
   const dx=.004*size,dy=.008*size;
   paths.push([[x-dx,y],[x,y+dy],[x+dx,y],[x,y-dy]].map(([a,b])=>[a*span,b*height]));
  }
  return paths;
 }
 // The aqueduct's lower water-light band stays broad and near the ground.
 // On the swept ridges the inlay is a material facet, not an extra thin curve.
 const count=kind==='series'?1:kind==='derivative'?0:1;
 for(let n=0;n<count;n++){
  const inset=(kind==='integral'?.115:kind==='derivative'?.01:.065+n*.11)*height;
  const thickness=height*(kind==='integral'?.065:kind==='derivative'?.075:.013);
  const top=ridge.map(([x,y])=>[x,y-inset]);
  const bottom=[...ridge].reverse().map(([x,y])=>[x,y-inset-thickness]);
  paths.push([...top,...bottom]);
 }
 return paths;
}

export function addCollegePlatformArt(THREE,group,w,h,kind){
 const theme=worldPalette(kind);if(!theme)return;
 // An ink edge exactly follows the existing cap; it does not extend support.
 const x=w/2,z=1.081,y=.063;
 const points=[[-x,y,z],[x,y,z],[-x,y,z],[-x,y,-z],[x,y,z],[x,y,-z]];
 const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
 const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:theme.edge,transparent:true,opacity:.74}));
 line.userData.visualOnly=true;group.add(line);
}

// A few large, distant architectural silhouettes give each world a readable
// identity. Coordinates are environmental art, not mathematical plot samples.
// Their layer is behind all mechanisms; none can be added to collider lists.
export function sceneryFeatures(kind,span=1,height=1){
 const shapes=[],add=(points,tone='body')=>shapes.push({points:points.map(([x,y])=>[x*span,y*height]),tone});
 const rect=(x,y,w,h,tone)=>add([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],tone);
 const arch=(cx,cy,rx,ry,thickness,tone='body')=>{const path=[];for(let i=0;i<=32;i++){const a=Math.PI-i*Math.PI/32;path.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}for(let i=32;i>=0;i--){const a=Math.PI-i*Math.PI/32;path.push([cx+Math.cos(a)*(rx-thickness),cy+Math.sin(a)*(ry-thickness*2.3)]);}add(path,tone);};
 if(kind==='series'){
  // Three clusters of folded pages recede; no scale, ticks, or numerical ratio.
  for(const [cx,y,w,d] of [[.18,.68,.26,.18],[.54,.47,.19,.13],[.83,.32,.13,.095]]){
   add([[cx-w*.5,y-d*.52],[cx+w*.40,y-d*.52],[cx+w*.5,y-d*.24],[cx+w*.5,y],[cx-w*.5,y]],'body');
   for(let n=0;n<3;n++){
    const yy=y+n*d*.24,inset=n*w*.035;
    add([[cx-w*.5+inset,yy],[cx+w*.40-inset,yy],[cx+w*.5-inset,yy+d*.18],[cx-w*.40+inset,yy+d*.18]],n===2?'lit':'body');
    add([[cx-w*.5+inset,yy],[cx+w*.40-inset,yy],[cx+w*.40-inset,yy+d*.045],[cx-w*.5+inset,yy+d*.045]],'lit');
   }
  }
 }else if(kind==='integral'){
  // A long horizontal aqueduct and three open arches, deliberately far larger
  // and paler than the foreground rectangular measured vessels.
  rect(-.03,.69,1.06,.07,'body');rect(-.03,.76,1.06,.017,'lit');
  for(const cx of [.14,.50,.86]){
   arch(cx,.14,.15,.55,.033);
   rect(cx-.15,.02,.033,.12,'body');rect(cx+.117,.02,.033,.12,'body');
  }
  rect(-.03,-.07,1.06,.04,'lit');
 }else if(kind==='derivative'){
  // Broad stone/wind ribs have physical thickness and no endpoints or arrows.
  arch(.19,.07,.19,.90,.028,'body');arch(.72,.04,.26,.70,.045,'body');
  arch(.19,.07,.181,.864,.006,'lit');
 }else if(kind==='ae'){
  // One very pale distant pearl above an open plain. It is not the gold pin
  // used by the actual function, is unlabelled, and never flashes or moves.
  const circle=[];for(let i=0;i<32;i++){const a=i*Math.PI/16;circle.push([.81+Math.cos(a)*.013,1.08+Math.sin(a)*.062]);}add(circle,'lit');
  rect(.06,.05,.29,.006,'lit');
 }
 return shapes;
}

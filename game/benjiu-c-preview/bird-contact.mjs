/** Presentation-only contact response. It never mutates the simulated body. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function birdContactPose(p,platforms){
 const s=p.scale||1,half=p.w/2,head=p.y+p.h;
 let near=0,ceiling=0;
 for(const f of platforms){
  if(f.active===false||f.renderInvisible||!f.solid||f===p.on)continue;
  const left=f.x-f.w/2,right=f.x+f.w/2,bottom=f.y-(f.h||.55);
  if(head>bottom+.025*s&&p.y<f.y-.025*s){
   const gap=p.facing>0?left-(p.x+half):(p.x-half)-right;
   if(gap>=-.06*s&&gap<.6*s)near=Math.max(near,1-clamp(gap/(.6*s),0,1));
  }
  if(p.x+half>left+.025*s&&p.x-half<right-.025*s){
   const gap=bottom-head;
   if(gap>=-.06*s&&gap<.32*s)ceiling=Math.max(ceiling,1-clamp(gap/(.32*s),0,1));
  }
 }
 // Calibrated against all baked poses and native BeakWarmTip vertices. The
 // feet origin stays fixed; tiny toe motion is part of the leaning pose.
 const moving=clamp(Math.abs(p.vx)/2,0,1),leanLimit=p.grounded?.40+.09*moving:.44;
 return {lean:-p.facing*leanLimit*near*near,squash:1-.17*ceiling*ceiling};
}
export function applyNativeBirdPose(group,p,pose){
 group.position.set(p.x,p.y,0);group.scale.setScalar(p.scale);group.updateMatrix();
 group.matrix.elements[4]=p.scale*pose.lean;
 group.matrix.elements[5]=p.scale*pose.squash;
 group.matrixAutoUpdate=false;group.matrixWorldNeedsUpdate=true;
}
export function wrapBirdDomain(p,s){
 return !!s&&p.x>=s.left&&p.x<=s.right&&p.y>=s.floor-.5&&p.y<=s.rim;
}

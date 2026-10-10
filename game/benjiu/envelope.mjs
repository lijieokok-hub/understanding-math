import {DESIGN,point} from './rig-predict.mjs';

// Full alpha > 4 source pixel-cell hulls, before texture filtering. Clipped face
// layers deliberately retain their complete hull: a conservative superset.
export function poseEnvelope(layers,manifest,facing=1){
 let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
 for(const layer of layers){
  if((layer.opacity??1)<=0)continue;
  const outline=manifest.parts[layer.key]?.outline;
  if(!outline?.length)throw new Error('Missing alpha hull: '+layer.key);
  for(const p of outline){const q=point(layer.m,...p),x=(q[0]-DESIGN.centerX)*facing/DESIGN.pixelsPerWorld,y=(DESIGN.footY-q[1])/DESIGN.pixelsPerWorld;
   if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Nonfinite rig envelope');
   left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
  }
 }
 if(![left,right,bottom,top].every(Number.isFinite))throw new Error('Empty rig envelope');
 return {left,right,bottom,top,width:right-left,height:top-bottom};
}
export function worldEnvelope(e,body,visualScale){
 const k=body.scale*visualScale;
 return {left:body.x+e.left*k,right:body.x+e.right*k,bottom:body.y+e.bottom*k,top:body.y+e.top*k};
}
export function boxContainsEnvelope(p,e,epsilon=1e-8){return e.left>=p.x-p.w/2-epsilon&&e.right<=p.x+p.w/2+epsilon&&e.bottom>=p.y-epsilon&&e.top<=p.y+p.h+epsilon;}
export function visibleEnvelope(e,clipX){
 if(!clipX)return e;
 const v={...e,left:Math.max(e.left,clipX.left),right:Math.min(e.right,clipX.right)};
 return v.left>=v.right?null:v;
}
export function envelopeOverlaps(e,f,epsilon=1e-8){return f.active!==false&&f.solid&&e.right>f.x+(-f.w/2)+epsilon&&e.left<f.x+f.w/2-epsilon&&e.top>f.y-(f.h||.55)+epsilon&&e.bottom<f.y-epsilon;}


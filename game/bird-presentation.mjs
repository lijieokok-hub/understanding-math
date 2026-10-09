/** Rendering state for the same bird at a cylindrical seam and on the lower track. */
import {wrapBirdDomain} from './bird-contact.mjs';
const materialSet=group=>{const set=new Set();group.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])set.add(m);});return [...set];};
export function createBirdPresentation(THREE,bird,ghost){
 const main=materialSet(bird.group),other=materialSet(ghost.group);
 const defaults=new Map(other.map(m=>[m,{color:m.color?.clone(),opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,depthTest:m.depthTest}]));
 const shadowClipping=new Map([...main,...other].map(m=>[m,m.clipShadows]));
 const planes=[new THREE.Plane(new THREE.Vector3(1,0,0),-18),new THREE.Plane(new THREE.Vector3(-1,0,0),30)];
 const orders=new Map();ghost.group.traverse(o=>orders.set(o,o.renderOrder));
 let clipped=false,ghostMode=null;
 function beforeGhostUpdate(){
  // Restore the un-tinted model before its own dynamic crest colours update.
  for(const m of other){const d=defaults.get(m);if(d.color)m.color.copy(d.color);m.opacity=d.opacity;}
 }
 function update(kind,p,s){
  const next=kind==='wrap'&&wrapBirdDomain(p,s);
  if(next){planes[0].constant=-s.left;planes[1].constant=s.right;}
  if(next!==clipped){for(const m of [...main,...other]){m.clippingPlanes=next?planes:null;m.clipShadows=next?true:shadowClipping.get(m);m.needsUpdate=true;}clipped=next;}
  const mode=kind==='shadow'?'shadow':'continuation';
  for(const m of other){const d=defaults.get(m);m.transparent=mode==='shadow'||d.transparent;m.depthWrite=mode==='shadow'?false:d.depthWrite;m.depthTest=d.depthTest;if(mode==='shadow'){m.opacity*=.6;m.color?.setHex(0x80c9d0);}if(mode!==ghostMode)m.needsUpdate=true;}
  if(mode!==ghostMode)ghost.group.traverse(o=>{o.renderOrder=mode==='shadow'?22+(orders.get(o)||0):orders.get(o)||0;});
  ghostMode=mode;
 }
 return {beforeGhostUpdate,update,mainMaterials:main,ghostMaterials:other};
}

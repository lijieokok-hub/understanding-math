/** The lower lane depicts the translated trajectory, not a second collision world. */
export const SHADOW_OFFSET=4;
export function shadowSurface(f){return {x:f.x,y:f.y-SHADOW_OFFSET,w:f.w,h:.18,active:f.active,source:f,oneWay:true,solid:false};}
export function shadowContactBody(p,surfaces){return {...p,y:p.y-SHADOW_OFFSET,on:surfaces.find(f=>f.source===p.on)||null};}
export function styleShadowLayer(group,order){
 const copies=new Map();group.traverse(o=>{if(!o.material)return;const clone=m=>{if(!copies.has(m)){const c=m.clone();c.depthTest=true;c.depthWrite=!c.transparent;copies.set(m,c);}return copies.get(m);};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);o.renderOrder=order;});
}

export const UPPER_LANE_BOTTOM=-.45;
export function clipUpperLane(THREE,group){
 const copies=new Map(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-UPPER_LANE_BOTTOM);
 group.traverse(o=>{if(!o.material)return;const clone=m=>{if(!copies.has(m)){const c=m.clone();c.clippingPlanes=[plane];c.clipShadows=true;copies.set(m,c);}return copies.get(m);};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});
}
export function addShadowDepthBoundary(THREE,root){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false}));mesh.frustumCulled=false;mesh.renderOrder=19;mesh.onBeforeRender=renderer=>renderer.clearDepth();root.add(mesh);return mesh;
}

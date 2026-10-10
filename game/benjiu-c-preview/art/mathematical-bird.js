/**
 * Mathematical Bird — texture-free, animated 3D mascot derived from the owner's bird logo.
 * Dependency injection avoids bundling another copy of Three.js.
 * Coordinates: +X forward, +Y up, +Z left wing. Feet rest at Y=0.
 * Usage: const bird = createMathematicalBird(THREE); scene.add(bird.group);
 *        bird.update({time: seconds, speed: 0..1, flying: boolean, facing: 1|-1, dark: boolean});
 */
export function createMathematicalBird(THREE, options = {}) {
  const group = new THREE.Group(); group.name = 'MathematicalBird';
  const heading = new THREE.Group(); group.add(heading);
  const bounce = new THREE.Group(); heading.add(bounce);
  const rig = new THREE.Group(); rig.scale.setScalar(0.82); bounce.add(rig);
  const materials = [], geometries = new Set();
  const mat = (color, roughness=.4, metalness=0) => {
    const m = new THREE.MeshStandardMaterial({color, roughness, metalness}); materials.push(m); return m;
  };
  const navy = mat(0x26394a,.40,.055), feather = mat(0x355064,.39,.045);
  const cream = mat(0xf5eddb,.42,.015), pale = mat(0xe2d6ba,.46,.02);
  const gold = mat(0xc79b51,.28,.48), dark = mat(0x101d29,.17,.10);
  const eye = mat(0xe8be65,.20,.32); eye.emissive.setHex(0xe6b658);
  const glint = mat(0xfffae9,.12,.05); glint.emissive.setHex(0xffe7aa); glint.emissiveIntensity=.1;
  const sphere = new THREE.SphereGeometry(1,24,16);
  const add = (parent, geometry, material, name, p=[0,0,0], s=[1,1,1]) => {
    geometries.add(geometry); const m = new THREE.Mesh(geometry,material); m.name=name;
    m.position.set(...p); m.scale.set(...s); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  };
  const orb = (parent,material,name,p,s) => add(parent,sphere,material,name,p,s);
  const v3 = a => new THREE.Vector3(...a);
  const tube = (parent,pts,r,material,name,segments=24) => add(parent,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v3)),segments,r,6,false),material,name);
  function blade(parent, points, width, thickness, material, name, sections=18, sides=10) {
    const curve=new THREE.CatmullRomCurve3(points.map(v3));
    const pos=[],uv=[],ix=[]; const normal=new THREE.Vector3(0,1,0);
    for(let i=0;i<=sections;i++){
      const t=i/sections, c=curve.getPoint(t), tangent=curve.getTangent(t).normalize();
      let across=new THREE.Vector3().crossVectors(normal,tangent).normalize();
      if(across.lengthSq()<.01) across.set(1,0,0);
      const thick=new THREE.Vector3().crossVectors(tangent,across).normalize();
      const w=width(t),h=thickness(t);
      for(let j=0;j<=sides;j++){
        const a=j/sides*Math.PI*2, q=c.clone().addScaledVector(across,Math.cos(a)*w).addScaledVector(thick,Math.sin(a)*h);
        pos.push(q.x,q.y,q.z);uv.push(t,j/sides);
        if(i<sections&&j<sides){const k=i*(sides+1)+j;ix.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
      }
    }
    // Seal both ends: these are closed volumetric feather meshes, never flat image planes.
    ix.push(...Array.from({length:sides-2},(_,j)=>[0,j+2,j+1]).flat());
    const end=sections*(sides+1);ix.push(...Array.from({length:sides-2},(_,j)=>[end,end+j+1,end+j+2]).flat());
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    return add(parent,geo,material,name);
  }
  // A single continuous head/neck/breast volume avoids intersecting-sphere seams.
  // Navy/ivory is a smooth per-vertex painted boundary on that same surface.
  const body = new THREE.Group(); body.name='Body'; rig.add(body);
  const rings=[[-.10,.245,.012,.010],[-.10,.32,.29,.21],[-.12,.47,.455,.305],[-.12,.65,.50,.33],[-.015,.83,.36,.285],[.20,.97,.23,.222],[.355,1.11,.278,.247],[.35,1.24,.238,.211],[.335,1.35,.13,.126],[.33,1.40,.004,.004]];
  const sample = (t,k) => {
    const f=t*(rings.length-1),i=Math.min(rings.length-2,Math.floor(f)),u=f-i;
    const a=rings[Math.max(0,i-1)][k],b=rings[i][k],c=rings[i+1][k],d=rings[Math.min(rings.length-1,i+2)][k];
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u);
  };
  const bodyPos=[],bodyColors=[],bodyIx=[],nr=42,ns=48;
  const smooth = (a,b,x) => {const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  for(let i=0;i<=nr;i++){
    const t=i/nr,cx=sample(t,0),y=sample(t,1),rx=Math.max(.003,sample(t,2)),rz=Math.max(.003,sample(t,3));
    for(let j=0;j<=ns;j++){
      const a=j/ns*Math.PI*2,c=Math.cos(a),z=Math.sin(a);bodyPos.push(cx+rx*c,y,rz*z);
      const creamSide=smooth(.16,.34,c),cap=1-smooth(1.145+.045*c,1.182+.045*c,y);
      const blend=creamSide*cap, col=navy.color.clone().lerp(cream.color,blend);bodyColors.push(col.r,col.g,col.b);
      if(i<nr&&j<ns){const q=i*(ns+1)+j;bodyIx.push(q,q+ns+1,q+1,q+1,q+ns+1,q+ns+2);}
    }
  }
  const bodyGeo=new THREE.BufferGeometry();bodyGeo.setAttribute('position',new THREE.Float32BufferAttribute(bodyPos,3));bodyGeo.setAttribute('color',new THREE.Float32BufferAttribute(bodyColors,3));bodyGeo.setIndex(bodyIx);bodyGeo.computeVertexNormals();
  // Match duplicated seam normals so the painted surface stays optically continuous.
  const bn=bodyGeo.attributes.normal;for(let i=0;i<=nr;i++){const a=i*(ns+1),b=a+ns,n=new THREE.Vector3().fromBufferAttribute(bn,a).add(new THREE.Vector3().fromBufferAttribute(bn,b)).normalize();bn.setXYZ(a,n.x,n.y,n.z);bn.setXYZ(b,n.x,n.y,n.z);}
  const coat=mat(0xffffff,.38,.055);coat.vertexColors=true;
  add(body,bodyGeo,coat,'ContinuousHeadNeckBreast');
  const head = new THREE.Group(); head.name='Head'; head.position.set(.36,1.13,0); body.add(head);
  // Beak follows the original pointed, slightly upturned profile, modelled in full 3D.
  const beakGeo = new THREE.ConeGeometry(.115,.27,4,1,false);
  const beak=add(head,beakGeo,navy,'Beak',[.303,-.025,0]);beak.rotation.z=-Math.PI/2;beak.rotation.x=Math.PI/4;beak.scale.set(.76,1,.70);
  const tip=add(head,new THREE.ConeGeometry(.047,.10,4),gold,'BeakWarmTip',[.407,-.023,0]);tip.rotation.z=-Math.PI/2;tip.rotation.x=Math.PI/4;tip.scale.set(.8,1,.70);
  // The logo's integral-like hooked stroke becomes a small swept curl rather than a flat crest.
  tube(head,[[.025,.195,0],[-.075,.32,0],[-.055,.42,0],[.03,.435,0],[.069,.372,0]],.027,navy,'IntegralCurl',22);
  orb(head,gold,'CurlTip',[.069,.372,0],[.029,.031,.029]);
  const eyelids=[];
  for(const side of [-1,1]){
    const e=new THREE.Group();e.name=side>0?'EyeLeft':'EyeRight';e.position.set(.126,.043,side*.211);head.add(e);eyelids.push(e);
    orb(e,navy,'EyeSocket',[0,0,0],[.068,.071,.028]);
    orb(e,eye,'AmberIris',[.004,.002,side*.024],[.045,.047,.016]);
    orb(e,dark,'Pupil',[.009,.002,side*.036],[.023,.029,.009]);
    orb(e,glint,'EyeCatchlight',[-.012,.021,side*.043],[.012,.013,.007]);
  }
  const wings=[];
  for(const side of [-1,1]){
    const w=new THREE.Group();w.name=side>0?'WingLeft':'WingRight';w.position.set(-.11,.78,side*.235);body.add(w);wings.push({group:w,side});
    blade(w,[[.04,.02,0],[-.20,.085,side*.20],[-.48,.09,side*.40],[-.69,.04,side*.60]],
      t=>.18*Math.pow(1-t,.58)+.012,t=>.045*(1-t)+.008,navy,'WingSilhouette');
    // Layered flight feathers provide volume, readable separation and a pale underside.
    for(let k=0;k<2;k++){
      const z=side*(.09+k*.105),x=-.12-k*.11;
      blade(w,[[x,.085,z],[x-.20,.095,z+side*.14],[x-.43,.045,z+side*.27]],
        t=>(.076-.009*k)*Math.pow(Math.sin(Math.PI*(.08+.92*t)),.72)+.008,t=>.017*Math.sin(Math.PI*t)+.006,k===0?pale:feather,'FlightFeather'+k,12,8);
    }
    tube(w,[[.045,.068,.005],[-.2,.125,side*.20],[-.48,.120,side*.40],[-.675,.049,side*.585]],.007,gold,'WingFineGoldEdge',18);
  }
  const tail = new THREE.Group(); tail.name='ForkTail';tail.position.set(-.49,.56,0);body.add(tail);
  for(const side of [-1,1]){
    blade(tail,[[0,0,side*.055],[-.26,.065,side*.115],[-.5,.13,side*.215],[-.67,.15,side*.255]],
      t=>.115*Math.pow(Math.sin(Math.PI*(.10+.90*t)),.70)+.005,t=>.036*Math.sin(Math.PI*t)+.006,navy,'ForkPlume'+side,16,8);
  }
  const feet=[];
  for(const side of [-1,1]){
    const f=new THREE.Group(); f.name=side>0?'FootLeft':'FootRight'; f.position.set(.00,.145,side*.15);rig.add(f);feet.push({group:f,side});
    const leg=add(f,new THREE.CylinderGeometry(.023,.027,.18,8),gold,'Leg',[0,.015,0]);leg.rotation.z=-.14;
    for(const z of [-.04,0,.04])tube(f,[[.015,-.058,0],[.074,-.115,z*.65],[.14,-.118,z]],.020,gold,'Toe',8);
    tube(f,[[.008,-.067,0],[-.043,-.11,0],[-.082,-.116,0]],.017,gold,'RearToe',8);
  }
  group.scale.setScalar(options.scale ?? 1);
  const clamp=THREE.MathUtils.clamp;
  let prevTime=0, yaw=0, flight=0, light=0;
  function update({time=0,delta,speed=0,flying=false,facing=1,dark:night=false,reducedMotion=false}={}){
    const dt=clamp(delta??(time-prevTime||1/60),0,.08);prevTime=time;
    const blend=1-Math.exp(-dt*12),run=clamp(Math.abs(speed),0,1),targetYaw=facing<0?Math.PI:0;
    let diff=((targetYaw-yaw+Math.PI*3)%(Math.PI*2))-Math.PI;yaw+=diff*blend;heading.rotation.y=yaw;
    flight+=(Number(flying)-flight)*blend;light+=(Number(night)-light)*blend;
    const stride=time*(8+run*7),wingWave=reducedMotion?0:Math.sin(time*(flying?17:2.2));
    bounce.position.y=(reducedMotion?0:Math.sin(time*2.6)*.011)+run*(1-flight)*Math.abs(Math.sin(stride))*.026;
    body.rotation.z=-run*.075+flight*.06;head.rotation.z=0;
    tail.rotation.z=(reducedMotion?0:Math.sin(time*3.2)*.025)+flight*.06;
    for(const {group:w,side} of wings){
      w.rotation.x=side*((1-flight)*.12-flight*(.32+wingWave*.82));
      w.rotation.y=-side*.40*(1-flight);w.rotation.z=-run*.025;
    }
    for(const {group:f,side} of feet){
      f.rotation.z=(1-flight)*Math.sin(stride+(side>0?0:Math.PI))*run*.45-flight*.9;
      f.position.y=.145+Math.max(0,Math.cos(stride+(side>0?0:Math.PI)))*run*.04*(1-flight)+flight*.10;
    }
    eye.emissiveIntensity=.025+light*.85;glint.emissiveIntensity=.06+light*.35;
    const blink=(!reducedMotion && time%5.1>4.97)? .20:1;
    eyelids.forEach(e=>{e.scale.y=blink;});
  }
  update({time:0,dark:options.dark??false});
  if(options.dark){eye.emissiveIntensity=.875;glint.emissiveIntensity=.41;light=1;}
  let triangles=0,meshes=0;group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  group.userData={asset:'MathematicalBird',front:'+X',up:'+Y',nominalHeight:1.33,triangles,meshes,textureFree:true};
  function dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  return {group,update,dispose,parts:{heading,body,head,wings:wings.map(w=>w.group),feet:feet.map(f=>f.group),tail},materials:{navy,cream,gold,eye},dimensions:{height:1.33,width:1.65,depth:1.44},stats:{triangles,meshes}};
}
export default createMathematicalBird;

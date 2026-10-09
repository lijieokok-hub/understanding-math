import {createCrestTimeline,clamp,smooth} from './crest-pose.js';
/**
 * Non-invasive decoration of the owner's existing MathematicalBird. No physics or input.
 * Call bird.update(input), then crest.update(input). Dispose crest BEFORE bird.
 * Every update mutates fixed-size buffers; never builds/disposes geometry per frame.
 */
export function createBirdCrest(THREE,bird,{sections=32,sides=10}={}){
  const head=bird?.parts?.head;
  if(!head)throw new TypeError('createBirdCrest requires the original MathematicalBird.parts.head');
  const original=[head.getObjectByName('IntegralCurl'),head.getObjectByName('CurlTip')].filter(Boolean);
  if(original.length!==2)throw new Error('Original IntegralCurl/CurlTip identity anchors are missing');
  if(head.getObjectByName('IntegralCrestRig'))throw new Error('A crest is already attached');
  sections=Math.max(16,Math.min(64,Math.floor(sections)));sides=Math.max(6,Math.min(16,Math.floor(sides)));
  const priorVisibility=original.map(o=>o.visible);original.forEach(o=>o.visible=false);
  const rig=new THREE.Group();rig.name='IntegralCrestRig';rig.position.set(.025,.195,0);head.add(rig);
  // All control points stay in the original crest's local XY plane. Tube thickness remains 3D.
  const paths={
    idle:[[0,0,0],[.045,.055,0],[.043,.090,0],[-.025,.115,0],[-.070,.172,0],[-.067,.235,0],[.003,.256,0],[.046,.204,0]],
    question:[[-.015,.189,0],[-.009,.239,0],[.074,.290,0],[.092,.366,0],[.035,.416,0],[-.066,.409,0],[-.111,.351,0]],
    upright:[[-.010,.190,0],[-.014,.245,0],[-.018,.297,0],[-.014,.350,0],[-.002,.399,0],[.012,.432,0]]
  };
  const samples={};
  for(const [key,points] of Object.entries(paths)){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
    samples[key]=new Float32Array((sections+1)*3);
    for(let i=0;i<=sections;i++){const v=curve.getPoint(i/sections);samples[key].set([v.x,v.y,v.z],i*3);}
  }
  const rings=(sections+1)*(sides+1),count=rings+2,indices=[];
  for(let i=0;i<sections;i++)for(let j=0;j<sides;j++){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  for(let j=0;j<sides;j++){indices.push(rings,j+1,j);const k=sections*(sides+1)+j;indices.push(rings+1,k,k+1);}
  const makeGeometry=()=>{const g=new THREE.BufferGeometry();g.setIndex(indices);g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));g.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.24,0),.36);return g;};
  const geo=makeGeometry(),haloGeo=makeGeometry();
  const navy=new THREE.Color(0x26394a),nightInk=new THREE.Color(0x8095a0),gold=new THREE.Color(0xc79b51),warm=new THREE.Color(0xffedb5);
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.36,metalness:.10,emissive:0xf1d494,emissiveIntensity:0});
  const haloMaterial=new THREE.MeshBasicMaterial({color:0xffe2a0,transparent:true,opacity:0,depthWrite:false,side:THREE.BackSide});
  const dotMaterial=new THREE.MeshStandardMaterial({color:0x26394a,roughness:.31,metalness:.14});
  const tipMaterial=bird.materials.gold.clone();
  const feather=new THREE.Mesh(geo,material);feather.name='IntegralCrestFeather';feather.castShadow=true;feather.receiveShadow=true;rig.add(feather);
  const halo=new THREE.Mesh(haloGeo,haloMaterial);halo.name='IntegralCrestSoftRim';halo.renderOrder=2;rig.add(halo);
  const dotGeo=new THREE.SphereGeometry(1,12,8),dot=new THREE.Mesh(dotGeo,dotMaterial),tip=new THREE.Mesh(dotGeo,tipMaterial);
  dot.name='IntegralCrestPunctuationDot';dot.position.set(-.010,.104,0);dot.castShadow=true;rig.add(dot);
  tip.name='IntegralCrestWarmTip';tip.castShadow=true;rig.add(tip);
  const center=new Float32Array((sections+1)*3),timeline=createCrestTimeline();let disposed=false,latest;
  const baseColor=new THREE.Color(),col=new THREE.Color();
  function fillGeometry(g,radiusScale,pose,dark){
    const p=g.attributes.position.array,n=g.attributes.normal.array,c=g.attributes.color.array;
    baseColor.copy(navy).lerp(nightInk,dark?.60:0);
    for(let i=0;i<=sections;i++){
      const t=i/sections,k=i*3,prev=Math.max(0,i-1)*3,next=Math.min(sections,i+1)*3;
      let tx=center[next]-center[prev],ty=center[next+1]-center[prev+1];const len=Math.hypot(tx,ty)||1;tx/=len;ty/=len;
      const nx=ty,ny=-tx,r=(.026*(1-pose.upright)+(.028*(.96-.68*smooth(.35,1,t)))*pose.upright)*radiusScale;
      const pulse=pose.pulseProgress===null?0:Math.exp(-Math.pow((t-pose.pulseProgress)/.17,2))*pose.pulseEnvelope;
      col.copy(baseColor).lerp(gold,pose.upright*.045).lerp(warm,pulse*.95);
      for(let j=0;j<=sides;j++){
        const angle=j/sides*Math.PI*2,co=Math.cos(angle),si=Math.sin(angle),q=(i*(sides+1)+j)*3;
        p[q]=center[k]+nx*co*r;p[q+1]=center[k+1]+ny*co*r;p[q+2]=si*r*.86;
        n[q]=nx*co;n[q+1]=ny*co;n[q+2]=si;
        c[q]=col.r;c[q+1]=col.g;c[q+2]=col.b;
      }
    }
    for(let end=0;end<2;end++){
      const src=end?sections*3:0,q=(rings+end)*3,other=end?(sections-1)*3:3;
      p[q]=center[src];p[q+1]=center[src+1];p[q+2]=0;
      let dx=center[src]-center[other],dy=center[src+1]-center[other+1],len=Math.hypot(dx,dy)||1;
      n[q]=dx/len;n[q+1]=dy/len;n[q+2]=0;c[q]=col.r;c[q+1]=col.g;c[q+2]=col.b;
    }
    g.attributes.position.needsUpdate=true;g.attributes.normal.needsUpdate=true;g.attributes.color.needsUpdate=true;
  }
  function update(input={}){
    if(disposed)return null;
    const pose=timeline.sample(input),dark=!!input.dark;latest=pose;
    for(let i=0;i<center.length;i++)center[i]=samples.idle[i]*(1-pose.shape)+samples.question[i]*pose.question+samples.upright[i]*pose.upright;
    rig.rotation.z=pose.sway;rig.rotation.x=pose.reducedMotion?0:pose.sway*.20;
    fillGeometry(geo,1,pose,dark);
    halo.visible=pose.glow>0&&!pose.reducedMotion;
    if(halo.visible)fillGeometry(haloGeo,1.55,pose,dark);
    haloMaterial.opacity=pose.glow*.75;
    material.emissiveIntensity=pose.reducedMotion?0:pose.glow*(dark?.50:.10);
    dot.visible=pose.dot>.03;dot.scale.setScalar(.026*pose.dot);
    dotMaterial.color.copy(navy).lerp(dark?nightInk:gold,dark?.75:pose.upright*.52);
    dotMaterial.emissive.setHex(0xffdd8c);dotMaterial.emissiveIntensity=pose.reducedMotion?0:pose.glow*.5;
    const end=sections*3;tip.position.set(center[end],center[end+1],center[end+2]);
    // Keep the logo's little warm terminal in idle/question; remove it from the pointed upright stroke.
    tip.scale.setScalar(.028*(1-pose.upright*.85));tip.visible=tip.scale.x>.009;
    return pose;
  }
  update();
  return {group:rig,update,setState:timeline.setState,sample:timeline.sample,
    get pose(){return latest;},parts:{feather,dot,tip,halo},
    stats:{triangles:(indices.length/3)*2+(dotGeo.index.count/3)*2,opaqueTriangles:indices.length/3+(dotGeo.index.count/3)*2,vertices:count,meshes:4,perFrameGeometryAllocations:0},
    dispose(){if(disposed)return;disposed=true;head.remove(rig);original.forEach((o,i)=>o.visible=priorVisibility[i]);geo.dispose();haloGeo.dispose();dotGeo.dispose();material.dispose();haloMaterial.dispose();dotMaterial.dispose();tipMaterial.dispose();}
  };
}
export default createBirdCrest;

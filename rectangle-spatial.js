import { A, B, PI, curve, chord, address } from './rectangle-spatial-geometry.mjs';

// The surface below is the actual image F(Sym²(ellipse)), not an embedding of
// a Möbius band.  It must overlap: that distinction is the point of the story.
const root = document.getElementById('spatial-story');
if (root) {
  const en = document.documentElement.lang === 'en';
  const $ = id => document.getElementById(id);
  const canvasHost = $('spatial-canvas');
  const fallback = $('spatial-fallback');
  const status = $('spatial-status');
  const progress = $('spatial-progress');
  const play = $('spatial-play');
  const buttons = Array.from(root.querySelectorAll('[data-spatial-stage]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // On a narrow screen show one full-size panel at a time. Both canvases keep
  // their layout and share the same progress even while one is off-screen.
  const pair = root.querySelector('.spatial-pair');
  const switcher = root.querySelector('.spatial-tabs');
  const tabs = Array.from(root.querySelectorAll('[data-spatial-panel]'));
  if (pair && switcher && tabs.length === 2) {
    root.classList.add('spatial-js');
    switcher.hidden = false;
    const narrow = matchMedia('(max-width: 700px)');
    const setTab = i => tabs.forEach((tab, n) => tab.setAttribute('aria-pressed', String(i === n)));
    tabs.forEach((tab, i) => tab.addEventListener('click', () => {
      const panel = pair.children[i];
      pair.scrollTo({left: panel.offsetLeft - pair.firstElementChild.offsetLeft, behavior: 'auto'});
      setTab(i);
    }));
    pair.addEventListener('scroll', () => {
      if (narrow.matches) setTab(pair.scrollLeft > pair.clientWidth / 2 ? 1 : 0);
    }, {passive: true});
    narrow.addEventListener('change', () => { pair.scrollLeft = 0; setTab(0); });
  }
  const caption = en ? [
    '1 / Boundary. A repeated pair {a, a} has length zero. Its address stays on the original ellipse at height 0.',
    '2 / Lift a chord. Its midpoint gives the horizontal position; its length is the height. The coloured sheets together are the image of one band.',
    '3 / Collision. Two different diameters of this ellipse have the same midpoint and length. Their addresses meet; four distinct endpoints make a rectangle.',
    '4 / Cap the boundary. The disk meets the image only on the ellipse. This real image already overlaps: only a hypothetical collision-free F would embed RP².'
  ] : [
    '1 / 边界：重复点对 {a, a} 的弦长为零，所以它的地址始终在高度为零的原椭圆上。',
    '2 / 弦升空：中点给出水平位置，弦长给出高度。两种颜色只是标记同一条带的不同参数区域。',
    '3 / 发生碰撞：椭圆上两条不同的直径，中点和长度都相同。它们的地址相遇，四个不同端点组成矩形。',
    '4 / 补上圆盘：圆盘与这个像只沿椭圆边界相接。真实的像已经重合；只有假设 F 无碰撞，才会得到 RP² 的嵌入。'
  ];
  const pauseWord = en ? 'Pause animation' : '暂停动画';
  const playWord = en ? 'Play animation' : '播放动画';
  const approaching = en ? '3 / Move the second diameter. Both midpoints agree; watch their lengths approach each other. At the meeting point, four distinct endpoints make a rectangle.' : '3 / 转动第二条直径：两条弦的中点相同，长度正在接近。等地址重合时，四个不同的端点就组成矩形。';
  let value = 0, phase = -1, captionKey = '', playing = false, frame = 0, last = 0;
  let renderScene = () => {}, renderAbstract = () => {}, initStarted = false;

  function phaseFor(v) { return v < 22 ? 0 : v < 48 ? 1 : v < 80 ? 2 : 3; }
  function setValue(v) {
    value = Math.max(0, Math.min(100, v));
    progress.value = String(Math.round(value));
    const next = phaseFor(value);
    const nextCaptionKey = `${next}-${next === 2 && value < 76 ? 'approach' : 'settled'}`;
    if (nextCaptionKey !== captionKey) {
      phase = next;
      captionKey = nextCaptionKey;
      status.textContent = phase === 2 && value < 76 ? approaching : caption[phase];
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === phase)));
      root.dataset.phase = String(phase + 1);
    }
    renderScene(value);
    renderAbstract(value);
  }
  function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    last = 0;
    play.textContent = playWord;
    root.dataset.playing = 'false';
  }
  function tick(now) {
    if (!playing) return;
    // Limit work on lower-powered devices while keeping time-based motion.
    if (last && now - last < 32) { frame = requestAnimationFrame(tick); return; }
    if (last) setValue(value + Math.min(200, now - last) / 180);
    last = now;
    if (value >= 100) { stop(); return; }
    frame = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    if (reduce.matches) { setValue(100); return; }
    if (value >= 100) setValue(0);
    playing = true;
    root.dataset.playing = 'true';
    play.textContent = pauseWord;
    frame = requestAnimationFrame(tick);
  });
  $('spatial-reset').addEventListener('click', () => { stop(); setValue(0); });
  progress.addEventListener('input', () => { stop(); setValue(Number(progress.value)); });
  buttons.forEach(b => b.addEventListener('click', () => { stop(); setValue(Number(b.dataset.spatialStage)); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  setValue(0);

  // A standard embedded Möbius band is shown only as a model of the abstract
  // pair space. Its green boundary is not the physical ellipse below: the
  // synchronised dots show how the actual map sends one to the other.
  function initAbstractBand() {
    const host = $('abstract-band-canvas'), canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.setAttribute('aria-hidden', 'true'); host.append(canvas);
    $('abstract-band-fallback').hidden = true;
    const n=48, m=20, triangles=[], lines=[];
    const band=(t,d)=>{
      const u=1-2*d/PI, r=1.04+.4*u*Math.cos(t);
      return [r*Math.cos(2*t), .4*u*Math.sin(t), r*Math.sin(2*t)];
    };
    for(let i=0;i<n;i++)for(let j=0;j<m;j++){
      const a=band(PI*i/n,PI*j/m),b=band(PI*(i+1)/n,PI*j/m),c=band(PI*i/n,PI*(j+1)/m),d=band(PI*(i+1)/n,PI*(j+1)/m);
      triangles.push({p:[a,b,c],sheet:j<m/2?0:1},{p:[c,b,d],sheet:j<m/2?0:1});
    }
    for(let i=0;i<=16;i++)lines.push(Array.from({length:25},(_,j)=>band(PI*i/16,PI*j/24)));
    for(let j=2;j<8;j+=2)lines.push(Array.from({length:97},(_,i)=>band(PI*i/96,PI*j/8)));
    const boundary=[...Array.from({length:97},(_,i)=>band(PI*i/96,0)),...Array.from({length:97},(_,i)=>band(PI*i/96,PI))];
    const yaw=.6,pitch=.76,sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
    const right=[cy,0,-sy],up=[-sp*sy,cp,-sp*cy],view=[cp*sy,sp,cp*cy];
    const dot=(p,q)=>p[0]*q[0]+p[1]*q[1]+p[2]*q[2];
    let w=1,h=1,scale=1;
    const project=p=>[w/2+dot(p,right)*scale,h/2-dot(p,up)*scale,dot(p,view)];
    function path(points,closed=false){ctx.beginPath();points.forEach((p,i)=>{const q=project(p);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);});if(closed)ctx.closePath();}
    function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';path(points);ctx.stroke();}
    function mark(point,color){const p=project(point);ctx.beginPath();ctx.arc(p[0],p[1],5.5,0,2*PI);ctx.fillStyle=color;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#fff';ctx.stroke();}
    renderAbstract=t=>{
      ctx.clearRect(0,0,w,h);const dark=document.documentElement.dataset.theme==='dark';
      const ordered=triangles.map(o=>({o,z:(dot(o.p[0],view)+dot(o.p[1],view)+dot(o.p[2],view))/3})).sort((a,b)=>a.z-b.z);
      for(const {o} of ordered){ctx.globalAlpha=.72;ctx.fillStyle=o.sheet?(dark?'#89c2ae':'#65a792'):(dark?'#e3b189':'#d79d6f');path(o.p,true);ctx.fill();}
      ctx.globalAlpha=1;
      for(const l of lines)line(l,dark?'rgba(230,239,225,.30)':'rgba(53,100,76,.28)',.8);
      line(boundary,dark?'#bce4bd':'#245d47',3.2);
      if(t<22){const tau=(PI/4+2*PI*t/22)%(2*PI);mark(band(tau%PI,tau<PI?0:PI),dark?'#d2efc9':'#245d47');}
      else {
        const d=Math.min(1,(t-22)/26)*PI/2;mark(band(PI/4,d),'#c45e39');
        if(t>=48)mark(band(PI/2+Math.min(1,(t-48)/28)*PI/4,PI/2),'#087d75');
      }
    };
    function resize(){w=host.clientWidth;h=host.clientHeight;if(!w||!h)return;scale=Math.min(w/3.4,h/2.9);const dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);renderAbstract(value);}
    new ResizeObserver(resize).observe(host);
    new MutationObserver(()=>renderAbstract(value)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    resize();
  }

  // The same 3D coordinates can also be projected with Canvas 2D. This is
  // important for browsers without WebGL: the animation remains interactive,
  // rather than becoming a misleading static picture.
  function initProjectedCanvas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    canvas.setAttribute('aria-hidden', 'true');
    canvasHost.append(canvas); fallback.setAttribute('hidden', '');
    root.dataset.engine = 'canvas2d';
    $('spatial-engine').textContent = en ? 'Drag panel B to turn its view, or use the angle buttons.' : '拖动 B 图可旋转视角，也可以使用下方的视角按钮。';
    root.querySelector('.spatial-view-controls').hidden = false;
    const orbit = {yaw: .78, pitch: .54, width: 1, height: 1, scale: 1, dpr: 1};
    const triangles = [];
    const curveLines = [];
    for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) {
      const t0 = PI * i / 32, t1 = PI * (i + 1) / 32;
      const d0 = PI * j / 32, d1 = PI * (j + 1) / 32;
      const a = address(t0, d0), b = address(t1, d0), c = address(t0, d1), d = address(t1, d1);
      triangles.push({p:[a,b,c], sheet:j < 16 ? 0 : 1}, {p:[c,b,d], sheet:j < 16 ? 0 : 1});
    }
    for (let i = 0; i <= 12; i++) curveLines.push(Array.from({length: 65}, (_, j) => address(PI * i / 12, PI * j / 64)));
    for (let j = 2; j < 16; j += 2) curveLines.push(Array.from({length: 65}, (_, i) => address(PI * i / 64, PI * j / 16)));
    const ellipse = Array.from({length: 181}, (_, i) => {const p = curve(2 * PI * i / 180); return [p[0], 0, p[1]];});
    const dark = () => document.documentElement.dataset.theme === 'dark';
    const floor = p => [p[0], .015, p[1]];
    let basis;
    function calculateBasis() {
      const {yaw, pitch} = orbit, sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
      basis = { right:[cy, 0, -sy], up:[-sp * sy, cp, -sp * cy], view:[cp * sy, sp, cp * cy] };
    }
    const dot = (p, q) => p[0]*q[0] + p[1]*q[1] + p[2]*q[2];
    function project(p) {
      const v = [p[0], p[1] - 1.17, p[2]];
      return [orbit.width/2 + dot(v, basis.right)*orbit.scale, orbit.height/2 - dot(v, basis.up)*orbit.scale, dot(v, basis.view)];
    }
    function path(points, close = false) {
      ctx.beginPath(); points.forEach((p, i) => {const q = project(p); if (i) ctx.lineTo(q[0],q[1]); else ctx.moveTo(q[0],q[1]);});
      if (close) ctx.closePath();
    }
    function line(points, color, width = 1, dash = []) {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.setLineDash(dash); path(points); ctx.stroke(); ctx.restore();
    }
    function mark(p, color, radius = 5, outline = '#fff') {
      const q = project(p); ctx.beginPath(); ctx.arc(q[0],q[1],radius,0,2*PI); ctx.fillStyle=color; ctx.fill();
      if (outline) {ctx.strokeStyle=outline;ctx.lineWidth=1.5;ctx.stroke();}
    }
    function drawChord(t, d, color) {
      const c = chord(t,d), a = floor(c.a), b = floor(c.b), m = floor(c.midpoint), top = [c.midpoint[0],c.length,c.midpoint[1]];
      line([a,b],color,3.3); line([m,top],color,1.6,[5,4]);
      mark(a,color,5); mark(b,color,5); mark(top,color,6);
      return top;
    }
    function resize() {
      const w = canvasHost.clientWidth, h = canvasHost.clientHeight; if (!w || !h) return;
      orbit.width=w; orbit.height=h; orbit.scale=Math.min(w/4.85,h/4.85); orbit.dpr=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.round(w*orbit.dpr); canvas.height=Math.round(h*orbit.dpr);
      ctx.setTransform(orbit.dpr,0,0,orbit.dpr,0,0); renderScene(value);
    }
    renderScene = t => {
      calculateBasis(); const isDark=dark();
      ctx.clearRect(0,0,orbit.width,orbit.height);
      const gridColor=isDark?'rgba(198,219,200,.18)':'rgba(76,122,92,.18)';
      for (let k=-2;k<=2;k++) {
        line([[-2,0,k],[2,0,k]],gridColor,.8); line([[k,0,-2],[k,0,2]],gridColor,.8);
      }
      const diskAlpha=.7*Math.min(1,Math.max(0,(t-80)/15));
      if (diskAlpha) {ctx.save();ctx.globalAlpha=diskAlpha;ctx.fillStyle=isDark?'#d3e7ba':'#9cc9a0';path(ellipse,true);ctx.fill();ctx.restore();}
      const alpha=.12+.32*Math.min(1,Math.max(0,(t-16)/30));
      const ordered=triangles.map(o=>({o,z:(dot(o.p[0],basis.view)+dot(o.p[1],basis.view)+dot(o.p[2],basis.view))/3})).sort((a,b)=>a.z-b.z);
      for (const {o} of ordered) {
        ctx.globalAlpha=alpha;ctx.fillStyle=o.sheet ? (isDark?'#91c3b2':'#69a994') : (isDark?'#e0ad80':'#cf9162');
        path(o.p,true);ctx.fill();
      }
      ctx.globalAlpha=1;
      const meshColor=isDark?'rgba(206,229,207,.27)':'rgba(52,100,76,.25)';
      for (const points of curveLines) line(points,meshColor,.85);
      line(ellipse,isDark?'#b6e0bc':'#285e4c',3.5);
      if(t<22) {const p=curve(PI/4+2*PI*t/22);mark(floor(p),isDark?'#d8f0d4':'#285e4c',6);}
      let top;
      if(t>=22) top=drawChord(PI/4,Math.min(1,(t-22)/26)*PI/2,'#c45e39');
      if(t>=48) drawChord(PI/2+Math.min(1,(t-48)/28)*PI/4,PI/2,'#087d75');
      if(t>=76) {
        const x=A/Math.SQRT2,z=B/Math.SQRT2;
        line([[x,.02,z],[x,.02,-z],[-x,.02,-z],[-x,.02,z],[x,.02,z]],'#ae4e30',2.7);
        const q=project(top);ctx.save();ctx.lineWidth=2.8;ctx.strokeStyle='#c45e39';ctx.beginPath();ctx.arc(q[0],q[1],10,0,2*PI);ctx.stroke();ctx.strokeStyle='#087d75';ctx.beginPath();ctx.arc(q[0],q[1],15,0,2*PI);ctx.stroke();ctx.restore();
      }
    };
    root.querySelectorAll('[data-turn]').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.turn==='left')orbit.yaw-=.28;
      if(b.dataset.turn==='right')orbit.yaw+=.28;
      if(b.dataset.turn==='up')orbit.pitch=Math.min(1.15,orbit.pitch+.14);
      if(b.dataset.turn==='down')orbit.pitch=Math.max(.13,orbit.pitch-.14);
      renderScene(value);
    }));
    let pointer=null;
    canvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      orbit.yaw-=(e.clientX-pointer.x)*.008;orbit.pitch=Math.min(1.15,Math.max(.13,orbit.pitch+(e.clientY-pointer.y)*.005));
      pointer.x=e.clientX;pointer.y=e.clientY;renderScene(value);
    });
    canvas.addEventListener('pointerup',()=>{pointer=null;});canvas.addEventListener('pointercancel',()=>{pointer=null;});
    new ResizeObserver(resize).observe(canvasHost);
    new MutationObserver(()=>renderScene(value)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    resize();
  }

  // Both panels use the same mathematical 3D data and the same finite,
  // time-based animation. No GPU or external library is required.
  function init() {
    if (initStarted) return;
    initStarted = true;
    try {
      initAbstractBand();
      initProjectedCanvas();
    } catch (error) {
      root.dataset.engine = 'fallback';
      $('spatial-engine').textContent = en
        ? 'The interactive 3D view is unavailable on this device. The static diagram and the step-by-step explanation remain available.'
        : '此设备暂不能显示交互式三维图，仍可使用静态示意和分步说明。';
      console.warn('Spatial visualisation fallback:', error.message);
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) init();
        else if (playing) stop();
      }
    }, {rootMargin: '450px'});
    observer.observe(root);
  } else init();
}

import {balance} from './rectangle-balance-model.mjs';
const lab = document.getElementById('mey-lab');
if (lab) {
  const en = document.documentElement.lang === 'en';
  const $ = id => document.getElementById(id);
  const slider=$('mey-angle'), out=$('mey-output'), play=$('mey-play'), square=$('mey-square'), a=$('mey-d1'), b=$('mey-d2'), point=$('mey-point'), wave=$('mey-wave');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const pauseLabel=en?'Pause':'暂停', playLabel=en?'Play one turn':'播放一圈';
  let playing=false, frame=0;
  // The graph is sampled from the very same formula as the readout.
  wave.setAttribute('d',Array.from({length:145},(_,i)=>{
    const t=2*Math.PI*i/144;
    return `${i?'L':'M'}${(35+300*i/144).toFixed(2)} ${(105-9*balance(t)).toFixed(2)}`;
  }).join(' '));
  function draw() {
    const degrees=Number(slider.value), t=degrees*Math.PI/180;
    const p=Array.from({length:4},(_,i)=>[110+70*Math.cos(t+i*Math.PI/2),92-70*Math.sin(t+i*Math.PI/2)]);
    square.setAttribute('points',p.map(q=>q.join(',')).join(' '));
    [[a,p[0],p[2]],[b,p[1],p[3]]].forEach(([line,x,y])=>{line.setAttribute('x1',x[0]);line.setAttribute('y1',x[1]);line.setAttribute('x2',y[0]);line.setAttribute('y2',y[1]);});
    const value=balance(t); point.setAttribute('cx',35+300*degrees/360);point.setAttribute('cy',105-9*value);
    const shown=Math.abs(value)<.0005?0:value;
    out.textContent=en?`Rotation ${degrees}°. Signed difference H = ${shown.toFixed(2)}; ${shown===0?'the lifted vertices are coplanar.':'the diagonal heights differ.'}`:`旋转 ${degrees}°；高度差的两倍 H = ${shown.toFixed(2)}；${shown===0?'四个抬高后的点共面。':'两条对角线在中心处高度不同。'}`;
  }
  function stop(){playing=false;cancelAnimationFrame(frame);play.textContent=playLabel;out.setAttribute('aria-live','polite');}
  // Keep fractional animation time separate from the integer range input.
  let start=0, from=0;
  function animate(now){if(!playing)return;if(!start)start=now;slider.value=String(Math.min(360,Math.floor(from+(now-start)*.04)));draw();if(Number(slider.value)>=360){stop();return;}frame=requestAnimationFrame(animate);}
  play.addEventListener('click',()=>{if(playing){stop();return;}if(reduce.matches){slider.value='360';draw();return;}if(Number(slider.value)>=360)slider.value='0';from=Number(slider.value);start=0;playing=true;play.textContent=pauseLabel;out.setAttribute('aria-live','off');frame=requestAnimationFrame(animate);});
  slider.addEventListener('input',()=>{stop();draw();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&playing)stop();}).observe(lab);
  lab.classList.add('mey-ready');play.hidden=false;slider.disabled=false;draw();
}

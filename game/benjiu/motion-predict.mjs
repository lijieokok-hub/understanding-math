// Continuous action choreography. All deformation consumes the same painted layers.
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const pulse=(age,attack,hold,end)=>smooth(0,attack,age)*(1-smooth(hold,end,age));
export function createMotionDirector(){
  let stride=0,air=0,glide=0,previousGround=true,landAge=99,impact=.3;
  let bodyLean=0,shoulderLag=0,previousSpeed=0,previousVY=0,recoverAge=99;
  let lastEvent=null,previousFacing=1,turnAge=99;
  function update(input,dt){
    const speed=clamp(Math.abs(input.speed??0)),ground=!input.flying,reduced=!!input.reducedMotion;
    const vy=input.verticalSpeed??(ground?0:2),a=clamp(input.anticipation??0);
    if(ground&&!previousGround){landAge=0;impact=clamp(input.impact??Math.abs(previousVY)/12,.15,1);}
    else landAge+=dt;
    if(input.eventId!=null&&input.eventId!==lastEvent){lastEvent=input.eventId;if(input.event==='fall')recoverAge=0;}
    recoverAge+=dt;
    if(input.facing!==undefined&&input.facing!==previousFacing){turnAge=0;previousFacing=input.facing;}else turnAge+=dt;
    stride+=dt*(6+speed*13)*speed; // One shared phase for feet, body and wings.
    const blend=1-Math.exp(-dt*12);
    air+=(Number(!ground)-air)*blend;
    glide+=(Number(!!input.gliding)-glide)*(1-Math.exp(-dt*9));
    const rise=air*(1-glide)*smooth(0,7,vy),fall=air*(1-glide)*smooth(0,8,-vy);
    const land=pulse(landAge,.045,.07,.30)*impact;
    const rebound=pulse(landAge-.16,.05,.06,.27)*impact;
    const recover=ground?pulse(recoverAge,.10,.30,1.3):0;
    const shake=ground?pulse(recoverAge-.35,.12,.36,.62)*Math.sin((recoverAge-.35)*23):0;
    const targetLean=-speed*.105+fall*.105-rise*.035+recover*.09+shake*.025;
    bodyLean+=(targetLean-bodyLean)*(1-Math.exp(-dt*9));
    shoulderLag+=((bodyLean*-.7+(speed-previousSpeed)*.2)-shoulderLag)*(1-Math.exp(-dt*4));
    const strideSin=Math.sin(stride),wingBeat=Math.sin((input.time??0)*18);
    const out={
      stride,air,glide,rise,fall,land,recover,impact,landAge,
      bodyTilt:bodyLean,
      bodyY:-(ground?Math.abs(strideSin)*speed*23:0)+a*55+land*40-rebound*17+recover*14,
      scaleX:1+a*.05+land*.085-rebound*.025+recover*.018,
      scaleY:1-a*.075-land*.105+rebound*.04-recover*.025+rise*.025,
      wingNear: -a*.20 +rise*(.70+wingBeat*.24)+glide*(1.02+wingBeat*.055)+fall*(.25+wingBeat*.34)+land*.34-recover*.2+shake*.12,
      wingFar: a*.12 +rise*(-.58-wingBeat*.2)+glide*(-1.55-wingBeat*.045)+fall*(-.20-wingBeat*.3)-land*.27+recover*.1,
      nearWingScale:1+rise*.35+glide*.72+fall*.20,
      farWingScale:1+rise*.45+glide*1.0+fall*.20,
      footLift:air*(58+rise*45+glide*14-fall*32),
      footAngle:air*(-.15-rise*.22+fall*.28),
      crestImpulse:-a*.12+land*.28+rebound*-.10+rise*-.14+fall*.16+shake*.11,
      strapAngle:shoulderLag*.35,
      automaticGazeY:rise?-.6:fall?.72:recover?.65:null,
      blinkBias:land*.80,
      state:a>.01?'anticipate':ground?(landAge<.32?'land':recoverAge<1.35?'recover':speed>.03?'run':'idle'):glide>.3?'glide':rise>fall?'rise':'fall'
    };
    if(reduced){for(const k of ['bodyTilt','bodyY','wingNear','wingFar','crestImpulse','strapAngle','blinkBias'])out[k]*=.15;out.scaleX=1+(out.scaleX-1)*.15;out.scaleY=1+(out.scaleY-1)*.15;out.nearWingScale=1+(out.nearWingScale-1)*.15;out.farWingScale=1+(out.farWingScale-1)*.15;}
    previousGround=ground;previousSpeed=speed;previousVY=vy;return out;
  }
  return {update,saveState:()=>({stride,air,glide,previousGround,landAge,impact,bodyLean,shoulderLag,previousSpeed,previousVY,recoverAge,lastEvent,previousFacing,turnAge}),restoreState:s=>{({stride,air,glide,previousGround,landAge,impact,bodyLean,shoulderLag,previousSpeed,previousVY,recoverAge,lastEvent,previousFacing,turnAge}=s);}};
}

// One-shot story cues are intentionally independent of level count and rules.
// Lines are carried from Bert V3's event handlers, not a new four-level campaign.
const CUES={
  reveal:{state:'question',duration:2.8,line:'这个“补偿器”没接线。你连线路都嫌麻烦？',lookX:.85,lookY:.15},
  solve:{state:'insight',duration:2.8,line:'同一条线，来回拨两次，会回到原来。',lookX:.55,lookY:-.35},
  fall:{state:'recover',duration:2.7,line:'机关还记着。刚才的尝试没白做。',lookX:.12,lookY:.65},
  letter:{state:'question',duration:3.1,line:'连“不保证安全”都写在邀请函上。还挺诚实。',lookX:.35,lookY:.45},
  map:{state:'question',duration:3.4,line:'背面画的这些路线，是你画的？',lookX:-.4,lookY:.3}
};
export function createReactionDirector(){
  const seen=new Set();let cue=null,age=99,eventId=0;
  return {
    trigger(type,key=type){if(seen.has(key)||!CUES[type])return false;seen.add(key);cue={...CUES[type],event:type,eventId:++eventId};age=0;return true;},
    update(dt){age+=dt;if(!cue||age>cue.duration)return {state:'idle',expressionAge:age,eventId,event:cue?.event,line:''};
      const speaking=age>.25&&age<cue.duration-.3;
      const mouth=speaking?.08+.26*Math.pow(Math.max(0,Math.sin(age*18)+.35*Math.sin(age*29)),1.2):.03;
      return {...cue,expressionAge:age,mouth};},
    get seen(){return [...seen];}
  };
}

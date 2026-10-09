import {createCrestTimeline,clamp} from './crest-pose.js';
/** Two exact-model baked layers: body locomotion and independently sampled 3D crest. */
export function createCrestCanvasRenderer({bodyImage,crestImage,meta}){
  const timeline=createCrestTimeline();
  const isReady=()=>!!(bodyImage?.complete&&bodyImage.naturalWidth&&crestImage?.complete&&crestImage.naturalWidth);
  return {setState:timeline.setState,isReady,
    draw(ctx,input={}){
      if(!isReady())return false;
      const {x=0,y=0,unit=100,scale=1,facing=1,time=0,reducedMotion=false,dark=false}=input;
      const pose=timeline.sample(input),locomotion=input.locomotion??(input.flying?'flutter':Math.abs(input.speed??0)>.05?'moving':'idle');
      const anim=meta.bodyAnimations[locomotion]??meta.bodyAnimations.idle,ids=anim.frames;
      const body=meta.bodyFrames[ids[reducedMotion?0:Math.floor(Math.max(0,time)*anim.fps)%ids.length]];
      let seq=meta.crestAnimations[pose.state]??meta.crestAnimations.idle;
      const frameIds=dark?seq.darkFrames:seq.frames;
      let crestId;
      if(reducedMotion)crestId=dark?seq.reducedDarkFrame:seq.reducedFrame;
      else if(seq.loop)crestId=frameIds[Math.floor(Math.max(0,time)*seq.fps)%frameIds.length];
      else crestId=frameIds[Math.round(clamp(pose.age/pose.duration)*(frameIds.length-1))];
      const crest=meta.crestFrames[crestId];if(!crest)return false;
      const px=unit*scale/meta.pixelsPerWorldUnit;
      ctx.save();ctx.translate(x,y);ctx.scale(facing<0?-px:px,px);ctx.translate(-meta.pivotPx[0],-meta.pivotPx[1]);
      ctx.drawImage(bodyImage,body.x,body.y,body.w,body.h,0,0,body.w,body.h);
      ctx.save();ctx.transform(...body.crestAffine);
      // Bounded, steady soft rim. Reduced-motion requests get no decorative glow.
      if(pose.glow>0&&!reducedMotion){ctx.shadowColor='rgba(245,216,153,0.38)';ctx.shadowBlur=3;}
      ctx.drawImage(crestImage,crest.x,crest.y,crest.w,crest.h,crest.sourceX,crest.sourceY,crest.w,crest.h);
      ctx.restore();ctx.restore();return {state:pose.state,bodyFrame:body.name,crestFrame:crest.name};
    }
  };
}
export default createCrestCanvasRenderer;

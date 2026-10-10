// Do not alter context methods. The proxy is scoped to one synchronous draw,
// and unwinds every nested save even if a texture throws halfway through.
export function withCanvasScope(context,draw){
 let depth=0;const bound=new Map();
 const proxy=new Proxy(context,{get(target,key){
  if(key==='save')return ()=>{target.save();depth++;};
  if(key==='restore')return ()=>{if(depth>0){target.restore();depth--;}};
  const value=Reflect.get(target,key,target);
  if(typeof value!=='function')return value;
  if(!bound.has(key))bound.set(key,value.bind(target));return bound.get(key);
 },set(target,key,value){return Reflect.set(target,key,value,target);}});
 proxy.save();try{return draw(proxy);}finally{while(depth>0)proxy.restore();}
}


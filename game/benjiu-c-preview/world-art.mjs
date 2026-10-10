import {isCollegeWorld,collegeContour} from './college-art.mjs';
export {isCollegeWorld,worldPalette,sceneryInlays,sceneryFeatures,addCollegePlatformArt} from './college-art.mjs';
// Cached, deterministic scenery contours. Purely visual; never part of the collider list.
export function contour(kind,span=1,height=1,layer=0){
 if(isCollegeWorld(kind))return collegeContour(kind,span,height,layer);
 const pts=[],step=span/8,base=.12*height,amp=height*(.60+layer*.055);
 const point=(x,v)=>pts.push([x,base+v*amp]);
 for(let j=0;j<8;j++){const x=j*step,peak=[.75,.95,.7,.85,.75,.95,.7,.85][j];
  if(kind==='induction'){point(x,.22);point(x+step*.12,peak);point(x+step*.71,peak);point(x+step*.83,peak*.67);point(x+step,.22);}
  else if(kind==='inverse'){point(x,.18);point(x+step*.18,peak);point(x+step*.35,peak*.85);point(x+step,.18);}
  else if(kind==='threshold'){const v=[.28,.56,.86,.56,.28,.56,.86,.56][j];point(x,v);point(x+step*.86,v);point(x+step,[.28,.56,.86,.56,.28,.56,.86,.56][(j+1)%8]);}
  else if(kind==='cover'){for(let k=0;k<=5;k++)point(x+step*k/5,.19+Math.sin((j*5+k)*1.7+layer)*.018);}
  else if(kind==='shadow'){for(let k=0;k<=8;k++){const u=(j+k/8)/8;point(x+step*k/8,.28+Math.sin(u*Math.PI*4+layer*.5)*.08);}}
  else if(kind==='symbols'&&j%2){point(x,.16);point(x+step*.5,peak);point(x+step,.16);}
  else{for(let k=0;k<=12;k++){const u=k/12,v=kind==='scale'?Math.sqrt(Math.max(0,1-(2*u-1)**2)):Math.sin(Math.PI*u);point(x+step*u,.16+v*peak*.74);}}
 }
 return pts;
}

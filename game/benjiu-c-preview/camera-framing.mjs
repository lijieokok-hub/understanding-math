// Keep the complete logo silhouette visible when the viewport is tall and narrow.
// This changes only camera framing; the simulation and jump trajectories are unchanged.
export function frameCameraX({current,x,width,levelWidth,facing,scale=1,dt,reduced=false,maxPanSpeed=Infinity}){
 const half=width/2,edge=Math.min(6,Math.max(0,half-1.3));
 const lead=Math.min(facing>0?5:2,width*(facing>0?.22:.09));
 const target=Math.min(levelWidth-edge,Math.max(edge,x+lead));
 const offset=Math.min(1,dt*(reduced?12:5))*(target-current);
 const smooth=current+Math.max(-maxPanSpeed*dt,Math.min(maxPanSpeed*dt,offset));
 // Includes wings, tail and crest, rather than only the smaller physics collider.
 const margin=Math.min(half*.8,1.1*scale+.15),reach=Math.max(0,half-margin);
 return Math.min(x+reach,Math.max(x-reach,smooth));
}

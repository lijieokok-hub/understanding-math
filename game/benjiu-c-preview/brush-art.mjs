// Decorative outline only. Collision intervals always keep their full exact width.
export const INK_COLOR=0x245f5b;
export function brushOutline(width,variant=0){const pts=[];for(let i=0;i<=10;i++){const x=-width/2+.13+(width-.26)*i/10;pts.push([x,.74+Math.sin(i*1.71+variant)*.045]);}for(let i=10;i>=0;i--){const x=-width/2+.13+(width-.26)*i/10;pts.push([x,-.74+Math.cos(i*1.37+variant)*.045]);}return pts;}

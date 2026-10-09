// Actual finite closed-interval union in game coordinates. No pickup-count proxy.
export function analyzeInkCover(centers,{left=12,right=48,radius=4,epsilon=1e-7}={}){
 if(!(right>left)||!(radius>0))throw new RangeError('Invalid bridge interval');
 if(centers.some(x=>!Number.isFinite(x)))throw new TypeError('Ink centers must be finite');
 const raw=centers.map(c=>[Math.max(left,c-radius),Math.min(right,c+radius)]).filter(([a,b])=>a<=b).sort((a,b)=>a[0]-b[0]);
 const merged=[];for(const [a,b] of raw){const prev=merged[merged.length-1];if(prev&&a<=prev[1]+epsilon)prev[1]=Math.max(prev[1],b);else merged.push([a,b]);}
 const gaps=[];let cursor=left;for(const [a,b] of merged){if(a>cursor+epsilon)gaps.push([cursor,a]);cursor=Math.max(cursor,b);}if(cursor<right-epsilon)gaps.push([cursor,right]);
 const covered=merged.reduce((sum,[a,b])=>sum+b-a,0),complete=gaps.length===0&&merged.length>0&&merged[0][0]<=left+epsilon&&merged[merged.length-1][1]>=right-epsilon;
 return {merged,gaps,covered,complete,percent:complete?100:Math.min(99,Math.floor(covered/(right-left)*100))};
}

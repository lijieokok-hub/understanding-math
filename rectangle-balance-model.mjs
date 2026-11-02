// Meyerson's square-base example: twice the height difference of its diagonals.
export const height = t => Math.sin(2*t) + .4*Math.cos(t) + .2*Math.sin(3*t);
export const balance = t => height(t) + height(t+Math.PI) - height(t+Math.PI/2) - height(t+3*Math.PI/2);

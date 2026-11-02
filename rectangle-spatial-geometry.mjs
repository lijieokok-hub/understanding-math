// The example is an ellipse, not a model for every Jordan curve.
// All marks in the animation come from this single map.
export const A = 1.55;
export const B = 1.03;
export const PI = Math.PI;

export function curve(t) {
  return [A * Math.cos(t), B * Math.sin(t)];
}

export function chord(theta, delta) {
  const a = curve(theta + delta);
  const b = curve(theta - delta);
  const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return { a, b, midpoint, length: Math.hypot(a[0] - b[0], a[1] - b[1]) };
}

export function address(theta, delta) {
  const { midpoint, length } = chord(theta, delta);
  // THREE's y axis is vertical; the z coordinate is the second planar coordinate.
  return [midpoint[0], length, midpoint[1]];
}

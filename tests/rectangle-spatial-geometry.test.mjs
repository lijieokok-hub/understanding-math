import assert from 'node:assert/strict';
import { A, B, PI, curve, chord, address } from '../rectangle-spatial-geometry.mjs';

const close = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-10, `${why}: ${a} != ${b}`);
const pairClose = (a, b, why) => a.forEach((v, i) => close(v, b[i], why));

// Both sides of the Möbius seam must describe the same unordered pair.
for (let i = 0; i <= 180; i++) {
  const delta = PI * i / 180;
  const l = chord(0, delta), r = chord(PI, PI - delta);
  pairClose(l.a, r.b, 'seam endpoint a');
  pairClose(l.b, r.a, 'seam endpoint b');
  pairClose(address(0, delta), address(PI, PI - delta), 'seam address');
}

// Repeated point pairs map to the original Jordan curve at height zero.
for (let i = 0; i <= 80; i++) {
  const t = PI * i / 80;
  for (const d of [0, PI]) {
    const c = chord(t, d), f = address(t, d);
    pairClose(c.a, c.b, 'repeated pair');
    close(f[1], 0, 'zero height');
    pairClose([f[0], f[2]], curve(t + d), 'boundary on ellipse');
  }
}

// Check the closed formula printed on the page against the endpoints used to draw.
for (let i = 0; i <= 40; i++) for (let j = 0; j <= 36; j++) {
  const t = PI * i / 40, d = PI * j / 36, f = address(t, d);
  close(f[0], A * Math.cos(t) * Math.cos(d), 'printed first coordinate');
  close(f[2], B * Math.sin(t) * Math.cos(d), 'printed second coordinate');
  close(f[1], 2 * Math.sin(d) * Math.hypot(A * Math.sin(t), B * Math.cos(t)), 'printed length');
}

// The displayed collision is exact: two distinct chords and four right angles.
const p = chord(PI / 4, PI / 2), q = chord(3 * PI / 4, PI / 2);
pairClose(address(PI / 4, PI / 2), address(3 * PI / 4, PI / 2), 'collision');
close(p.length, Math.sqrt(2 * (A * A + B * B)), 'collision height');
const corners = [p.a, q.a, p.b, q.b];
for (let i = 0; i < 4; i++) {
  const a = corners[i], b = corners[(i + 1) % 4], c = corners[(i + 2) % 4];
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.1, 'distinct adjacent corners');
  close((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]), 0, 'right angle');
}
console.log('PASS: Möbius seam, exact ellipse boundary, collision and nondegenerate rectangle.');

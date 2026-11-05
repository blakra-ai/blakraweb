#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uRing;    // petal counts of up to three rings (0 = ring absent)
uniform vec3 uCol;
uniform float uOpen;   // 0 closed bud … 1 fully open
uniform float uCrown;  // 1 for the thousand-petal crown
uniform float uYantra; // 0 square, 1 crescent, 2 triangle down, 3 hexagram, 4 circle, 5 triangle in circle, 6 none
out vec4 color;

const float PI = 3.14159265;
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}
float sdTri(vec2 p, float r) {
  const float k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
float sdBox2(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }

// The seed geometry (yantra) of each centre, etched flat into the base plate.
float yantra2(vec2 q) {
  float w = 0.0022;
  if (uYantra < 0.5) return abs(sdBox2(q, vec2(0.12))) - w;
  if (uYantra < 1.5) return max(abs(length(q) - 0.13) - w, -(length(q - vec2(0.0, 0.07)) - 0.12));
  if (uYantra < 2.5) return abs(sdTri(vec2(q.x, -q.y), 0.15)) - w;
  // Heart: two interlocking rings (connection), not the hexagram, which reads as a religious emblem.
  if (uYantra < 3.5) return min(abs(length(q - vec2(0.05, 0.0)) - 0.1), abs(length(q + vec2(0.05, 0.0)) - 0.1)) - w;
  if (uYantra < 4.5) return min(abs(length(q) - 0.13) - w, abs(length(q) - 0.07) - w);
  if (uYantra < 5.5) return min(abs(length(q) - 0.14) - w, abs(sdTri(vec2(q.x, -q.y), 0.11)) - w);
  return 1e3;
}

float petals(vec3 p, float n, float radius, float len, float width, float tilt, float phase) {
  float a = atan(p.z, p.x) + phase;
  float sector = 2.0 * PI / n;
  float id = floor((a + sector * 0.5) / sector);
  a = a - id * sector;
  float r = length(p.xz);
  vec3 q = vec3(cos(a) * r, p.y, sin(a) * r);
  q.x -= radius;
  q.xy *= rot(-tilt);
  q.x -= len * 0.9;
  q.y += 0.55 * q.x * q.x;
  q.y -= 0.35 * q.z * q.z / width;
  return sdEllipsoid(q, vec3(len, 0.015, width)) - 0.003 * exp(-q.z * q.z * 1200.0);
}

// Instrument ring: a flat dial of ticks around the flower, the engineering half of the symbol.
float dial(vec3 p) {
  float r = length(p.xz);
  float a = atan(p.z, p.x);
  float n = 48.0;
  float s = 2.0 * PI / n;
  float ai = a - s * floor(a / s + 0.5);
  float major = step(0.5, fract((floor(a / s + 0.5)) / 4.0 + 0.01) < 0.25 ? 1.0 : 0.0);
  float tl = mix(0.02, 0.045, major);
  vec2 d2 = vec2(abs(ai * r) - 0.0025, abs(r - 0.74 - tl * 0.5) - tl * 0.5);
  float tick = length(max(d2, 0.0)) + min(max(d2.x, d2.y), 0.0);
  float ring = abs(r - 0.70) - 0.0012;
  float d = min(tick, ring);
  return length(vec2(max(d, 0.0), abs(p.y + 0.02) - 0.001));
}

vec2 map(vec3 p) {
  float spin = uTime * 0.15;
  vec3 pr = p;
  pr.xz *= rot(spin);
  float tilt = mix(1.3, 0.3, uOpen);
  float best = 1e9; float id = 0.0;
  for (int i = 0; i < 3; i++) {
    float n = uRing[i];
    if (n < 0.5) continue;
    float fi = float(i);
    float w = clamp(1.5 / n, 0.03, 0.14);
    float len = mix(0.36, 0.24, fi / 2.0) * (uCrown > 0.5 ? 1.1 : 1.0);
    float t = tilt + fi * mix(0.38, 0.22, uCrown) - uCrown * 0.15;
    float d = petals(pr - vec3(0.0, fi * 0.03, 0.0), n, 0.07 + 0.02 * (2.0 - fi), len, w, t, fi * PI / n);
    if (d < best) { best = d; id = 0.0; }
  }
  float core = length(p - vec3(0.0, 0.1, 0.0)) - 0.045;
  if (core < best) { best = core; id = 2.0; }
  vec3 yp = pr - vec3(0.0, -0.015, 0.0);
  float ys = 3.6;
  float y2 = yantra2(yp.xz / ys) * ys;
  float yd = length(vec2(max(y2, 0.0), abs(yp.y) - 0.0015));
  if (yd < best) { best = yd; id = 3.0; }
  float dd = dial(pr);
  if (dd < best) { best = dd; id = 4.0; }
  return vec2(best, id);
}

vec3 normalAt(vec3 p) {
  const vec2 k = vec2(1, -1);
  float e = 0.0007;
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x + k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 1.15, 2.35);
  vec3 ta = vec3(0.0, 0.2, 0.0);
  vec3 fw = normalize(ta - ro), rt = normalize(cross(fw, vec3(0, 1, 0))), up = cross(rt, fw);
  vec3 rd = normalize(fw * 1.8 + uv.x * rt + uv.y * up);

  vec3 bg = vec3(0.008, 0.008, 0.011) + uCol * 0.035 * exp(-dot(uv, uv) * 2.5);
  vec3 col = bg;
  float t = 0.015 * hash(gl_FragCoord.xy);
  for (int i = 0; i < 180; i++) {
    vec3 pos = ro + rd * t;
    vec2 h = map(pos);
    if (h.x < 0.0006) {
      vec3 n = normalAt(pos);
      vec3 v = -rd;
      vec3 gem = vec3(0.0, 0.1, 0.0);
      vec3 toGem = normalize(gem - pos);
      float fres = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 3.0);
      float dGem = length(gem - pos);
      float sss = pow(clamp(dot(-n, toGem) * 0.5 + 0.5, 0.0, 1.0), 2.0) * exp(-dGem * 2.6);
      vec3 base = uCol * (0.05 + 2.1 * sss) + uCol * fres * 1.15;
      vec3 key = normalize(vec3(0.4, 0.9, 0.5));
      base += vec3(1.0, 0.97, 0.94) * pow(max(dot(n, normalize(key + v)), 0.0), 80.0) * 0.4;
      if (h.y == 2.0) base = mix(uCol, vec3(1.0), 0.5 + 0.5 * pow(abs(dot(n, v)), 2.0)) * (1.2 + 1.4 * pow(abs(dot(n, v)), 4.0));
      if (h.y == 3.0) base = mix(uCol, vec3(1.0), 0.3) * 1.1;
      if (h.y == 4.0) base = uCol * 0.55 + 0.08;
      // Depth fade into the dark.
      base = mix(base, bg, smoothstep(2.2, 3.6, t));
      col = base;
      break;
    }
    t += h.x * 0.7;
    if (t > 6.0) break;
  }
  // Inner light: analytic glow around the gem, seen through gaps between the petals.
  vec3 gem = vec3(0.0, 0.1, 0.0);
  vec3 oc = gem - ro;
  float along = max(dot(oc, rd), 0.0);
  float dRay = length(oc - rd * along);
  col += mix(uCol, vec3(1.0), 0.3) * 0.05 / (dRay * dRay * 60.0 + 0.4) * smoothstep(0.0, 1.0, t / along);
  col = 1.0 - exp(-col * 1.4);
  col = pow(col, vec3(0.93));
  col += (hash(gl_FragCoord.xy + 7.0) - 0.5) / 255.0;
  color = vec4(col, 1.0);
}

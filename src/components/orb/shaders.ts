/**
 * GLSL shader library for the Living Orb.
 *
 * Upgraded from the original monolithic orb shader with:
 *  - a second, lower-frequency simplex-noise octave for layered deformation,
 *  - fractional Brownian motion (fBm) so the surface flows organically and
 *    never visibly loops ("procedural motion"),
 *  - an enhanced fresnel rim term for volumetric glow,
 *  - an energy-circulation swirl in the fragment shader (inner convection),
 *  - a click-ripple uniform so interactions radiate a displacement wave.
 *
 * The simplex-noise implementation is the canonical Ashima/Stefan Gustavson
 * snoise (kept verbatim from the previous working orb for stability).
 */

/* --------------------------- shared GLSL chunks -------------------------- */

/** Canonical 3D simplex noise (GLSL). */
export const SIMPLEX_NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

/** Fractional Brownian motion built from snoise for organic, non-looping flow. */
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}
`;

/* ----------------------------- plasma vertex ----------------------------- */

export const PLASMA_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uAudioBoost;     // 0..1 voice/state reactivity
uniform float uAmp;            // deformation amplitude multiplier (from StateTheme)
uniform float uBreath;         // breathing rate (from StateTheme)
uniform float uRippleStrength; // click-ripple intensity
uniform float uRippleTime;     // seconds since last ripple
uniform vec3  uRippleOrigin;   // ripple origin on the unit sphere

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying float vEnergy;

${SIMPLEX_NOISE_GLSL}

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  float t = uTime;

  // Layered fluid deformation: two noise octaves at different frequencies +
  // an fBm term, so the surface never repeats (procedural motion).
  float freqA = 0.08;
  float freqB = 0.21;
  float nA = snoise(position * freqA + vec3(t * 0.9));
  float nB = snoise(position * freqB + vec3(-t * 0.6, t * 0.4, t * 0.3)) * 0.45;
  float nC = fbm(position * 0.05 + vec3(t * 0.15)) * 0.5;

  float amp = 3.4 + uAudioBoost * 8.5;
  amp *= uAmp;

  // Slow breathing oscillation modulating the whole body.
  float breath = sin(t * uBreath * 1.6) * 0.6 + sin(t * uBreath * 0.7 + 1.3) * 0.3;

  float displacement = (nA + nB + nC) * amp + breath;

  // Click ripple: a wave radiating from the interaction point on the sphere.
  float distFromOrigin = acos(clamp(dot(normalize(position), normalize(uRippleOrigin)), -1.0, 1.0));
  float rippleWave = sin(distFromOrigin * 12.0 - uRippleTime * 8.0) *
                     exp(-uRippleTime * 1.6) * exp(-distFromOrigin * 0.6);
  displacement += rippleWave * uRippleStrength;

  vDisplacement = displacement;

  // Energy field drives fragment convection coloring.
  vEnergy = nC + nB * 0.5;

  vec3 newPos = position + normal * displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

/* ---------------------------- plasma fragment ---------------------------- */

export const PLASMA_FRAGMENT_SHADER = /* glsl */ `
uniform vec3  uBaseColor;
uniform vec3  uAccentColor;
uniform vec3  uFresnelColor;
uniform float uAudioBoost;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying float vEnergy;

void main() {
  vec3 viewVector = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewVector)), 2.8);

  // Base body color mixed by displacement + an energy-circulation swirl so the
  // interior appears to convect (inner energy circulation).
  float swirl = sin(vEnergy * 3.0 + uTime * 0.8) * 0.5 + 0.5;
  vec3 baseCol = mix(uBaseColor, uAccentColor, clamp(vDisplacement * 0.06 + 0.5, 0.0, 1.0));
  baseCol = mix(baseCol, uAccentColor, swirl * 0.25);

  // Fresnel rim glow + perceptual brightening toward the silhouette.
  vec3 finalCol = mix(baseCol, uFresnelColor, fresnel * 0.85);
  finalCol += uFresnelColor * uAudioBoost * fresnel * 0.4;

  float alpha = 0.86 + fresnel * 0.14 + uAudioBoost * 0.08;
  gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 1.0));
}
`;

/* ----------------------- energy particle (points) ------------------------ */

export const ENERGY_PARTICLE_VERTEX = /* glsl */ `
attribute float aSeed;       // per-particle random 0..1
attribute float aRadius;     // orbital radius offset
uniform float uTime;
uniform float uAudioBoost;
uniform float uSpeed;
uniform float uIntensity;
varying float vAlpha;

void main() {
  float t = uTime * uSpeed + aSeed * 6.2831;

  // Spiral path: particles flow inward then outward around the core
  // (inner energy circulation), each phase-offset by its seed.
  float r = aRadius + sin(t * 0.7 + aSeed * 9.0) * (3.0 + uAudioBoost * 6.0);
  float inc = aSeed * 3.1415;            // inclination
  float yaw = t * (0.6 + aSeed * 0.4);   // angular speed varies per particle

  vec3 pos;
  pos.x = cos(yaw) * cos(inc) * r;
  pos.z = sin(yaw) * cos(inc) * r;
  pos.y = sin(inc) * r + sin(t * 1.3 + aSeed * 4.0) * 2.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float size = (2.0 + aSeed * 2.5) * (1.0 + uAudioBoost * 1.6) * uIntensity;
  gl_PointSize = size * (240.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;

  // Twinkle / fade envelope.
  vAlpha = (0.35 + 0.65 * abs(sin(t * 1.7 + aSeed * 8.0))) * uIntensity;
}
`;

export const ENERGY_PARTICLE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float opacity = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
  gl_FragColor = vec4(uColor, opacity * 0.85);
}
`;

/* --------------------------- halo / glow sprite -------------------------- */

/** Vertex/fragment for soft additive halos around the orb (faked refraction). */
export const HALO_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * vec4(vPosition, 1.0);
}
`;

export const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec3 viewDir = normalize(-vPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
  float shimmer = 0.85 + 0.15 * sin(uTime * 1.2);
  float a = fresnel * uIntensity * shimmer;
  gl_FragColor = vec4(uColor, a * 0.55);
}
`;

/**
 * Living Orb GPU Shader Engine — GLSL 3D Simplex, 4-Octave FBM, 3D Curl Noise,
 * Velocity Squash/Stretch, Micro-oscillations, Glass Subsurface Scattering, Optical Caustics, and Fresnel Rim Glow.
 */

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

// Fractional Brownian Motion (4 octaves)
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100.0);
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p = p * 2.02 + shift;
    a *= 0.5;
  }
  return v;
}

// 3D Curl Noise for fluid-like non-divergent surface flow
vec3 snoiseVec3(vec3 x) {
  float s  = snoise(vec3(x));
  float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
  float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
  return vec3(s, s1, s2);
}

vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 p0 = snoiseVec3(p);
  vec3 p1 = snoiseVec3(p + dx);
  vec3 p2 = snoiseVec3(p + dy);
  vec3 p3 = snoiseVec3(p + dz);

  float x = (p2.z - p0.z) - (p3.y - p0.y);
  float y = (p3.x - p0.x) - (p1.z - p0.z);
  float z = (p1.y - p0.y) - (p2.x - p0.x);

  return normalize(vec3(x, y, z) / (2.0 * e));
}
`;

export const PLASMA_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uAudioBoost;
uniform float uAmp;
uniform float uBreath;
uniform float uRippleStrength;
uniform float uRippleTime;
uniform vec3  uRippleOrigin;
uniform vec2  uMousePos;
uniform vec2  uVelocity;
uniform float uMicroOscillation;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying float vDisplacement;
varying float vEnergy;

${SIMPLEX_NOISE_GLSL}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  float t = uTime;

  // 1. Organic Curl Noise + FBM fluid flow
  vec3 curl = curlNoise(position * 0.08 + vec3(t * 0.2, t * 0.15, t * 0.1));
  float noiseA = snoise(position * 0.06 + curl * 0.5 + vec3(t * 0.6));
  float noiseB = fbm(position * 0.04 + vec3(-t * 0.25, t * 0.3, t * 0.15)) * 0.5;

  float amp = (3.5 + uAudioBoost * 9.0) * uAmp;

  // 2. Continuous Organic Breathing Cycle
  float breath = sin(t * uBreath * 1.5) * 0.7 + sin(t * uBreath * 0.6 + 1.2) * 0.3;

  // 3. Directional Velocity Squash & Stretch (Inertia & Soft Body Response)
  vec2 normVel = length(uVelocity) > 0.001 ? normalize(uVelocity) : vec2(0.0);
  float velocityDot = dot(normalize(vNormal.xy), normVel);
  float squashStretch = velocityDot * length(uVelocity) * 0.85;

  // 4. Micro-Oscillations (22 Hz Liquid Intelligence Tremor)
  float microTremor = sin(position.x * 14.0 + t * 22.0) * uMicroOscillation * 1.2;

  // 5. Interactive Mouse Displacement
  vec3 normPos = normalize(position);
  float mouseDist = distance(vUv, uMousePos * 0.5 + 0.5);
  float mouseInfluence = exp(-mouseDist * 3.5) * 2.5;

  float displacement = (noiseA + noiseB + mouseInfluence * 0.1) * amp + breath + squashStretch + microTremor;

  // 6. Click Wavefront Propagation
  float distFromOrigin = acos(clamp(dot(normPos, normalize(uRippleOrigin)), -1.0, 1.0));
  float rippleWave = sin(distFromOrigin * 14.0 - uRippleTime * 9.0) *
                     exp(-uRippleTime * 1.8) * exp(-distFromOrigin * 0.5);
  displacement += rippleWave * uRippleStrength;

  vDisplacement = displacement;
  vEnergy = noiseB + noiseA * 0.5 + length(uVelocity) * 0.2;

  vec3 newPos = position + normal * displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

export const PLASMA_FRAGMENT_SHADER = /* glsl */ `
uniform vec3  uBaseColor;
uniform vec3  uAccentColor;
uniform vec3  uFresnelColor;
uniform float uAudioBoost;
uniform float uTime;
uniform vec2  uVelocity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying float vDisplacement;
varying float vEnergy;

// Optical Caustics pattern simulation
float caustics(vec2 uv, float time) {
  vec2 p = mod(uv * 6.28318530718, 6.28318530718) - 250.0;
  vec2 i = vec2(p);
  float c = 1.0;
  float inten = 0.005;

  for (int n = 0; n < 3; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }

  c /= 3.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 6.0), 0.0, 1.0);
}

void main() {
  vec3 viewVector = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewVector)), 2.6);

  // Convection Swirl inside the plasma core, accelerated by momentum
  float swirlSpeed = 0.9 + length(uVelocity) * 0.4;
  float swirl = sin(vEnergy * 4.0 + uTime * swirlSpeed) * 0.5 + 0.5;
  vec3 baseCol = mix(uBaseColor, uAccentColor, clamp(vDisplacement * 0.06 + 0.5, 0.0, 1.0));
  baseCol = mix(baseCol, uAccentColor, swirl * 0.3);

  // Subsurface Caustics Highlight
  float causticsPattern = caustics(vUv * 2.0, uTime * 0.4);
  baseCol += uFresnelColor * causticsPattern * 0.25;

  // Fresnel Rim Light + Volumetric Bloom envelope
  vec3 finalCol = mix(baseCol, uFresnelColor, fresnel * 0.88);
  finalCol += uFresnelColor * uAudioBoost * fresnel * 0.5;

  float alpha = 0.88 + fresnel * 0.12 + uAudioBoost * 0.08;
  gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 1.0));
}
`;

export const ENERGY_PARTICLE_VERTEX = /* glsl */ `
attribute float aSeed;
attribute float aRadius;
attribute float aLifeSpeed;

uniform float uTime;
uniform float uAudioBoost;
uniform float uSpeed;
uniform float uIntensity;
uniform float uRepulsion;
uniform float uAttraction;

varying float vAlpha;
varying float vLife;

${SIMPLEX_NOISE_GLSL}

void main() {
  // 1. Procedural Life Phase (0..1) with non-repeating individual cycle
  float life = fract(uTime * aLifeSpeed * 0.15 + aSeed * 10.0);
  vLife = life;

  // 2. Base Spherical Shell Coordinates
  float theta = aSeed * 6.283185;
  float phi = acos(clamp(2.0 * fract(aSeed * 37.0) - 1.0, -1.0, 1.0));

  // 3. GPU Vector Field Drift (Curl Noise + FBM turbulence)
  vec3 sphereDir = vec3(sin(phi) * cos(theta), sin(phi) * sin(theta), cos(phi));
  vec3 curl = curlNoise(sphereDir * 0.15 + vec3(uTime * 0.05));

  // 4. Attraction & Repulsion Forces
  float radialOffset = (aRadius + sin(uTime * 0.4 + aSeed * 12.0) * 4.0);
  radialOffset += (uRepulsion * 18.0 * life) - (uAttraction * 8.0 * (1.0 - life));
  radialOffset += uAudioBoost * 14.0 * life;

  vec3 pos = sphereDir * radialOffset + curl * (6.0 + life * 12.0);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // 5. Life-dependent Point Size Attenuation
  float fadeInOut = sin(life * 3.14159265);
  float size = (2.4 + aSeed * 3.0) * (1.0 + uAudioBoost * 1.5) * uIntensity * fadeInOut;

  gl_PointSize = size * (280.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;

  vAlpha = fadeInOut * uIntensity * (0.4 + 0.6 * sin(uTime * 2.0 + aSeed * 15.0));
}
`;

export const ENERGY_PARTICLE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vLife;

void main() {
  // Soft Gaussian Radial Glow Point Sprite
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float softEdge = smoothstep(0.5, 0.0, dist);
  float innerCore = smoothstep(0.2, 0.0, dist);

  vec3 col = mix(uColor, vec3(1.0), innerCore * 0.5);
  float opacity = softEdge * vAlpha;

  gl_FragColor = vec4(col, opacity * 0.9);
}
`;

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


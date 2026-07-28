import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AssistantState, AssistantMood } from '../types';

interface Three3DBlobOrbProps {
  state: AssistantState;
  mood: AssistantMood;
  volume?: number;
}

// -----------------------------------------------------------------------------
// Custom GLSL Shaders for 3D Morphing Blob Core
// -----------------------------------------------------------------------------

// 3D Simplex Noise GLSL Functions
const noiseGLSL = `
// Simplex 3D noise by Ian McEwan, Stefan Gustavson
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  // Permutations
  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z);  // mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + vec4(ns.yyyy);
  vec4 y = y_ *ns.x + vec4(ns.yyyy);
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

const vertexShader = `
uniform float uTime;
uniform float uSpeed;
uniform float uNoiseAmp;
uniform float uAudioBoost;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec3 vViewPosition;

${noiseGLSL}

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // Multi-frequency Fractal Noise Displacement
  vec3 pos = position;
  float t = uTime * uSpeed;

  float n1 = snoise(pos * 1.4 + vec3(t * 0.8));
  float n2 = snoise(pos * 3.1 - vec3(t * 1.2)) * 0.5;
  float n3 = snoise(pos * 5.5 + vec3(t * 1.8)) * 0.25;

  float totalNoise = (n1 + n2 + n3) * (uNoiseAmp + uAudioBoost * 0.35);
  vDisplacement = totalNoise;

  vec3 displacedPosition = position + normal * totalNoise;
  vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);

  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uAudioBoost;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel Light Rim Effect
  float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);

  // Dynamic Color Palette Shifting over Time
  float colorTime = uTime * 0.15;
  vec3 colorMix = mix(uColor1, uColor2, 0.5 + 0.5 * sin(colorTime + vDisplacement));
  colorMix = mix(colorMix, uColor3, fresnel * 0.7);

  // Subsurface Scattering & Core Glow
  float coreGlow = smoothstep(-0.2, 0.5, vDisplacement) * 0.5;
  vec3 finalColor = colorMix + vec3(0.1, 0.3, 0.5) * coreGlow + vec3(1.0) * pow(fresnel, 4.0) * (0.8 + uAudioBoost * 0.4);

  float alpha = 0.85 + fresnel * 0.15;
  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const Three3DBlobOrb: React.FC<Three3DBlobOrbProps> = ({
  state,
  volume = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseRef.current.targetX = x * 2.5;
      mouseRef.current.targetY = -y * 2.5;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = container.clientWidth || 520;
    const H = container.clientHeight || 520;

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Custom GLSL Shader Material for 3D Blob
    const uniforms = {
      uTime: { value: 0 },
      uSpeed: { value: 0.6 },
      uNoiseAmp: { value: 0.28 },
      uAudioBoost: { value: 0 },
      uColor1: { value: new THREE.Color(0x4fc3f7) }, // Electric Cyan
      uColor2: { value: new THREE.Color(0xff4d9d) }, // Neon Pink
      uColor3: { value: new THREE.Color(0x9b5de5) }, // Deep Indigo
    };

    const geometry = new THREE.IcosahedronGeometry(1.35, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const blobMesh = new THREE.Mesh(geometry, material);
    scene.add(blobMesh);

    // 3. Internal Energy Core Particle System
    const PARTICLE_COUNT = 350;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleScales = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = Math.random() * 1.1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
      particleScales[i] = 0.02 + Math.random() * 0.04;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('scale', new THREE.BufferAttribute(particleScales, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.04,
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x4fc3f7, 2, 10);
    pointLight.position.set(2, 2, 3);
    scene.add(pointLight);

    // 5. Animation Loop
    let animFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      const normVolume = Math.min(1, volume / 100);

      // AI State Modulations
      const isThinking = state === 'connecting';
      const isSpeaking = state === 'speaking';
      const isListening = state === 'listening';

      const targetSpeed = isThinking ? 1.8 : isSpeaking ? 1.2 : 0.6;
      const targetAmp = isThinking ? 0.45 : isSpeaking ? 0.38 : isListening ? 0.32 : 0.28;
      const audioBoost = isSpeaking ? 0.35 + normVolume * 0.65 : isListening ? 0.15 + normVolume * 0.4 : normVolume * 0.25;

      // Smooth Uniform Interpolation
      uniforms.uTime.value = elapsedTime;
      uniforms.uSpeed.value += (targetSpeed - uniforms.uSpeed.value) * 0.05;
      uniforms.uNoiseAmp.value += (targetAmp - uniforms.uNoiseAmp.value) * 0.05;
      uniforms.uAudioBoost.value += (audioBoost - uniforms.uAudioBoost.value) * 0.1;

      // Mouse Spring Smooth Following
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      blobMesh.rotation.y = elapsedTime * 0.25 + mouseRef.current.x * 0.3;
      blobMesh.rotation.x = Math.sin(elapsedTime * 0.3) * 0.15 + mouseRef.current.y * 0.3;

      particleSystem.rotation.y = -elapsedTime * 0.4;
      particleSystem.rotation.x = elapsedTime * 0.2;

      // Floating Vertical Breathing Motion
      blobMesh.position.y = Math.sin(elapsedTime * 1.5) * 0.08;
      particleSystem.position.y = blobMesh.position.y;

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 6. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 520;
      const newH = container.clientHeight || 520;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [state, volume]);

  return (
    <div className="relative flex items-center justify-center w-[520px] h-[520px] max-w-full select-none">
      {/* Background Typography: Noto Serif Devanagari 30vw opacity 0.05 "शाश्वत" (Positioned slightly above) */}
      <h1 className="bg-typography">
        शाश्वत
      </h1>

      {/* Three.js 3D Morphing Blob Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-none z-10 w-full h-full flex items-center justify-center"
      />
    </div>
  );
};

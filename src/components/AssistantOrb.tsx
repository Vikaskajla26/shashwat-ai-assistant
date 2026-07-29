import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AssistantState, AssistantMood } from '../types';

interface AssistantOrbProps {
  state: AssistantState;
  mood: AssistantMood;
  inputVolume?: number;
  outputVolume?: number;
  volume?: number;
  isMuted?: boolean;
}

// 14 Sacred Maheshwar Sutras (Maheshvara Sutrani - Primal Phonemes of Creation)
const MAHESHWAR_SUTRAS = [
  'अइउण्',
  'ऋऌक्',
  'एओङ्',
  'ऐऔच्',
  'हयवरट्',
  'लण्',
  'ञमङणनम्',
  'झभञ्',
  'घढधष्',
  'जबगडदश्',
  'खफछठथचटत्',
  'कपय्',
  'शषसर्',
  'हल्',
];

/** Create 3D Canvas Texture for a Sanskrit Holographic Text Sprite */
function createSanskritTextTexture(text: string, colorHex: string = '#F59E0B'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Soft Outer Glow
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 24;

  ctx.font = '500 48px "Noto Serif Devanagari", "Rozha One", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const AssistantOrb: React.FC<AssistantOrbProps> = ({
  state,
  volume = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse Spring Physics
  const springRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const relX = (e.clientX / innerWidth - 0.5) * 2;
      const relY = (e.clientY / innerHeight - 0.5) * 2;

      springRef.current.targetX = relX * 22;
      springRef.current.targetY = -relY * 22;
    };

    const handleMouseLeave = () => {
      springRef.current.targetX = 0;
      springRef.current.targetY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = 540;
    const height = 540;

    // 1. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 110;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. 3D Procedural Volumetric Shader Sphere
    const sphereGeometry = new THREE.IcosahedronGeometry(26, 48);

    const customShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAudioBoost: { value: 0 },
        uBaseColor: { value: new THREE.Color('#F59E0B') },
        uAccentColor: { value: new THREE.Color('#F97316') },
        uFresnelColor: { value: new THREE.Color('#FEF08A') },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uAudioBoost;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;

        // 3D Simplex Noise
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

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          float noiseFreq = 0.08;
          float noiseAmp = 4.5 + uAudioBoost * 9.0;
          float displacement = snoise(position * noiseFreq + vec3(uTime * 0.9)) * noiseAmp;
          vDisplacement = displacement;

          vec3 newPos = position + normal * displacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        uniform vec3 uAccentColor;
        uniform vec3 uFresnelColor;
        uniform float uAudioBoost;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;

        void main() {
          vec3 viewVector = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewVector)), 2.8);

          vec3 baseCol = mix(uBaseColor, uAccentColor, vDisplacement * 0.06 + 0.5);
          vec3 finalCol = mix(baseCol, uFresnelColor, fresnel * 0.85);

          float alpha = 0.85 + fresnel * 0.15 + uAudioBoost * 0.1;
          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: true,
    });

    const coreMesh = new THREE.Mesh(sphereGeometry, customShaderMaterial);
    scene.add(coreMesh);

    // 3. Inner Core Sphere (High Brightness Center)
    const innerCoreGeo = new THREE.SphereGeometry(12, 32, 32);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    const innerMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    scene.add(innerMesh);

    // 4. 3D Maheshwar Sutras Holographic Orbiting Ring Group
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const sutraSprites: THREE.Sprite[] = [];
    const sutraCount = MAHESHWAR_SUTRAS.length;
    const orbitRadius = 42;

    MAHESHWAR_SUTRAS.forEach((sutra, idx) => {
      const texture = createSanskritTextTexture(sutra, '#F59E0B');
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(22, 5.5, 1);

      const angle = (idx / sutraCount) * Math.PI * 2;
      sprite.position.x = Math.cos(angle) * orbitRadius;
      sprite.position.z = Math.sin(angle) * orbitRadius;
      sprite.position.y = Math.sin(angle * 3) * 6; // Wave inclination

      orbitGroup.add(sprite);
      sutraSprites.push(sprite);
    });

    orbitGroup.rotation.x = 0.45; // Tilt ring relative to viewer

    // State Colors (Interpolated)
    const curBaseColor = new THREE.Color('#F59E0B');
    const targetBaseColor = new THREE.Color('#F59E0B');

    const curAccentColor = new THREE.Color('#F97316');
    const targetAccentColor = new THREE.Color('#F97316');

    let animFrameId: number;
    let lastT = performance.now();

    const animate = (time: number) => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const t = time * 0.001;

      // Spring Physics for Mouse Magnetic Follow
      const spring = springRef.current;
      const stiffness = 0.08;
      const damping = 0.82;

      const ax = (spring.targetX - spring.x) * stiffness;
      const ay = (spring.targetY - spring.y) * stiffness;
      spring.vx = (spring.vx + ax) * damping;
      spring.vy = (spring.vy + ay) * damping;
      spring.x += spring.vx;
      spring.y += spring.vy;

      // Apply 3D Translation & Tilt
      coreMesh.position.x = spring.x * 0.6;
      coreMesh.position.y = spring.y * 0.6;
      innerMesh.position.x = spring.x * 0.6;
      innerMesh.position.y = spring.y * 0.6;
      orbitGroup.position.x = spring.x * 0.6;
      orbitGroup.position.y = spring.y * 0.6;

      coreMesh.rotation.y = t * 0.2;
      coreMesh.rotation.x = Math.sin(t * 0.15) * 0.15;

      // Audio & State Dynamics
      const normVol = Math.min(1, volume / 100);
      const isSpeaking = state === 'speaking';
      const isListening = state === 'listening';
      const isThinking = state === 'connecting';

      const audioBoost = isSpeaking
        ? 0.35 + normVol * 0.65
        : isListening
        ? 0.2 + normVol * 0.4
        : isThinking
        ? 0.3
        : 0.1;

      customShaderMaterial.uniforms.uTime.value = t;
      customShaderMaterial.uniforms.uAudioBoost.value = audioBoost;

      // State-driven Color Palettes
      if (isListening) {
        targetBaseColor.set('#F43F5E'); // Terracotta Rose
        targetAccentColor.set('#FB7185');
      } else if (isSpeaking) {
        targetBaseColor.set('#F97316'); // Warm Amber
        targetAccentColor.set('#FBBF24');
      } else if (isThinking) {
        targetBaseColor.set('#6366F1'); // Indigo
        targetAccentColor.set('#38BDF8');
      } else {
        targetBaseColor.set('#F59E0B'); // Honey Gold
        targetAccentColor.set('#F97316');
      }

      curBaseColor.lerp(targetBaseColor, 0.05);
      curAccentColor.lerp(targetAccentColor, 0.05);

      customShaderMaterial.uniforms.uBaseColor.value.copy(curBaseColor);
      customShaderMaterial.uniforms.uAccentColor.value.copy(curAccentColor);

      // Orbit Group Motion
      const orbitSpeed = isThinking ? 0.4 : isListening ? 0.25 : 0.12;
      orbitGroup.rotation.y = t * orbitSpeed;

      // Pulse Sanskrit Text Sprites
      sutraSprites.forEach((sprite, idx) => {
        const pulse = Math.sin(t * 2 + idx) * 0.15 + 0.85;
        sprite.material.opacity = (0.65 + audioBoost * 0.25) * pulse;
      });

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sphereGeometry.dispose();
      customShaderMaterial.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      renderer.dispose();
    };
  }, [state, volume]);

  return (
    <div className="relative flex items-center justify-center w-[540px] h-[540px] max-w-full select-none">
      {/* Background Typography: Noto Serif Devanagari "शाश्वत" */}
      <h1 className="bg-typography">
        शाश्वत
      </h1>

      {/* 3D Volumetric Three.js WebGL Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
      />
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import type { AssistantState } from '../types';
import { getStateTheme } from '../theme/aiState';
import { qualityEngine, qualityRef } from '../perf/useRenderQuality';

interface BackgroundCanvasProps {
  /** Live state, read via ref each frame (scene mounts once). */
  state: AssistantState;
}

/* ------------------------- noise/nebula plane shaders ------------------- */

const NEBULA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const NEBULA_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;

// Cheap hash-based value noise (no extra snoise needed here).
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = vUv * 3.0;
  float n = vnoise(uv + uTime * 0.03);
  n += 0.5 * vnoise(uv * 2.0 - uTime * 0.02);
  n = smoothstep(0.3, 0.9, n);
  float vignette = smoothstep(1.0, 0.2, length(vUv - 0.5) * 1.6);
  float a = n * uIntensity * 0.12 * vignette;
  gl_FragColor = vec4(uColor, a);
}
`;

/* ----------------------------- star particles --------------------------- */

const STAR_VERTEX = /* glsl */ `
attribute float aScale;
attribute float aAlpha;
attribute float aTwinkle;   // per-star twinkle phase
attribute float aDepth;     // parallax depth plane 0..1
varying float vAlpha;
uniform float uTime;
uniform float uTwinkle;
void main() {
  vAlpha = aAlpha * (0.6 + 0.4 * sin(uTime * uTwinkle + aTwinkle * 6.28));
  vec3 pos = position;
  pos.y += sin(uTime * 0.5 + pos.x * 0.05) * 1.5;
  pos.x += cos(uTime * 0.3 + pos.y * 0.05) * 1.0;
  vec4 mvPosition = modelViewMatrix * vec4(pos * (0.6 + aDepth * 0.6), 1.0);
  gl_PointSize = aScale * (180.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const STAR_FRAGMENT = /* glsl */ `
varying float vAlpha;
uniform vec3 uColor;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float opacity = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
  gl_FragColor = vec4(uColor, opacity * 0.65);
}
`;

export const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<AssistantState>(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Mouse parallax (gated by quality at runtime).
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const profile = qualityRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: profile.antialias,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatioCap));
    container.appendChild(renderer.domElement);

    /* ---- Starfield / particle dust (twinkle + parallax depth) ---- */
    const particleCount = profile.backgroundParticleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    const twinkles = new Float32Array(particleCount);
    const depths = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 350;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 350;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 250;
      scales[i] = Math.random() * 2.2 + 0.8;
      alphas[i] = Math.random() * 0.7 + 0.2;
      twinkles[i] = Math.random();
      depths[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));
    geometry.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#F59E0B') },
        uTwinkle: { value: 0.9 },
      },
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(geometry, starMaterial);
    scene.add(particles);

    /* ---- Animated nebula / noise plane (cinematic depth) ---- */
    let nebula: THREE.Mesh | null = null;
    let nebulaMat: THREE.ShaderMaterial | null = null;
    if (profile.noise) {
      nebulaMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#F59E0B') },
          uIntensity: { value: 1.0 },
        },
        vertexShader: NEBULA_VERTEX,
        fragmentShader: NEBULA_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      // Large plane pushed behind everything.
      nebula = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), nebulaMat);
      nebula.position.z = -120;
      scene.add(nebula);
    }

    /* ---- Color interpolation state ---- */
    const currentColor = new THREE.Color('#F59E0B');

    let animFrameId = 0;
    let lastT = performance.now();

    const handleResize = () => {
      const p = qualityRef.current;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, p.pixelRatioCap));
    };
    window.addEventListener('resize', handleResize);

    const animate = (time: number) => {
      const now = performance.now();
      const frameDelta = now - lastT;
      lastT = now;
      const t = time * 0.001;

      qualityEngine.reportFrame(frameDelta);

      const theme = getStateTheme(stateRef.current);
      const motion = theme.motionIntensity;
      const useParallax = qualityRef.current.parallax;

      if (useParallax) {
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
        camera.position.x = mouseRef.current.x * 12;
        camera.position.y = -mouseRef.current.y * 12;
        camera.lookAt(scene.position);
      }

      const drift = 0.02 + motion * 0.06;
      particles.rotation.y = t * drift;
      particles.rotation.x = Math.sin(t * 0.015) * 0.05;

      starMaterial.uniforms.uTime.value = t;
      starMaterial.uniforms.uTwinkle.value = 0.6 + motion * 0.8;

      if (nebulaMat) {
        nebulaMat.uniforms.uTime.value = t;
        nebulaMat.uniforms.uIntensity.value = 0.5 + motion * 0.8;
      }

      // State-driven ambient accent color.
      currentColor.lerp(new THREE.Color(theme.bloomColor), 0.04);
      const tinted = currentColor.clone().multiplyScalar(theme.particleBrightness);
      starMaterial.uniforms.uColor.value.copy(tinted);
      if (nebulaMat) nebulaMat.uniforms.uColor.value.copy(currentColor);

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      starMaterial.dispose();
      if (nebula && nebulaMat) {
        nebula.geometry.dispose();
        nebulaMat.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    />
  );
};

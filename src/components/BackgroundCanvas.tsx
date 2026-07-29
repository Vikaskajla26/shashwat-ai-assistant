import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AssistantState } from '../types';

interface BackgroundCanvasProps {
  state: AssistantState;
}

export const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseRef.current.targetX = (e.clientX / innerWidth - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Particle Dust Field (1200 Star Particles)
    const particleCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 350;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 350;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 250;

      scales[i] = Math.random() * 2.2 + 0.8;
      alphas[i] = Math.random() * 0.7 + 0.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // Custom Particle Shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#F59E0B') },
      },
      vertexShader: `
        attribute float scale;
        attribute float alpha;
        varying float vAlpha;
        uniform float uTime;
        void main() {
          vAlpha = alpha;
          vec3 pos = position;
          pos.y += sin(uTime * 0.5 + pos.x * 0.05) * 1.5;
          pos.x += cos(uTime * 0.3 + pos.y * 0.05) * 1.0;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = scale * (180.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform vec3 uColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float opacity = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(uColor, opacity * 0.65);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Color interpolation state
    const currentColor = new THREE.Color('#F59E0B');
    const targetColor = new THREE.Color('#F59E0B');

    let animFrameId: number;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = (time: number) => {
      const t = time * 0.001;

      // Mouse Parallax Spring
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      camera.position.x = mouseRef.current.x * 12;
      camera.position.y = -mouseRef.current.y * 12;
      camera.lookAt(scene.position);

      particles.rotation.y = t * 0.02;
      particles.rotation.x = Math.sin(t * 0.015) * 0.05;

      material.uniforms.uTime.value = t;

      // State-driven Ambient Accent Colors
      if (state === 'listening') {
        targetColor.set('#F43F5E'); // Terracotta Rose
      } else if (state === 'speaking') {
        targetColor.set('#F97316'); // Warm Amber
      } else if (state === 'connecting') {
        targetColor.set('#6366F1'); // Indigo
      } else {
        targetColor.set('#F59E0B'); // Honey Gold
      }

      currentColor.lerp(targetColor, 0.04);
      material.uniforms.uColor.value.copy(currentColor);

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [state]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    />
  );
};

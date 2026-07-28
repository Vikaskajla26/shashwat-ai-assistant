import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbStateType, ORB_STATE_PRESETS, damp } from './OrbState';
import { createBlobMaterial } from './BlobMaterial';
import { createParticleShell } from './ParticleLayer';
import { createSceneLighting } from './Effects';
import { AudioController } from './AudioController';
import { OrbFallback } from './OrbFallback';

export interface OrbProps {
  state?: OrbStateType;
  size?: number;
  audioStream?: MediaStream | null;
  audioElement?: HTMLMediaElement | null;
  onSuccessComplete?: () => void;
}

function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}

export const Orb: React.FC<OrbProps> = ({
  state = 'idle',
  size = 340,
  audioStream,
  audioElement,
  onSuccessComplete,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [supported] = useState<boolean>(() => isWebGL2Supported());
  const audioControllerRef = useRef<AudioController | null>(null);

  // Success timing effect
  useEffect(() => {
    if (state === 'success' && onSuccessComplete) {
      const timer = setTimeout(onSuccessComplete, 1100);
      return () => clearTimeout(timer);
    }
  }, [state, onSuccessComplete]);

  // Audio Stream / Element connection
  useEffect(() => {
    if (!audioControllerRef.current) {
      audioControllerRef.current = new AudioController();
    }

    if (audioStream) {
      audioControllerRef.current.connectStream(audioStream);
    } else if (audioElement) {
      audioControllerRef.current.connectElement(audioElement);
    }

    return () => {
      audioControllerRef.current?.dispose();
      audioControllerRef.current = null;
    };
  }, [audioStream, audioElement]);

  // Three.js Render Loop & Damped State Transitions
  useEffect(() => {
    if (!supported || !mountRef.current) return;

    const width = size;
    const height = size;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3.8;

    createSceneLighting(scene);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    mountRef.current.appendChild(renderer.domElement);

    // Blob Mesh & Particles
    const blobGeo = new THREE.IcosahedronGeometry(1, 6);
    const blobMat = createBlobMaterial();
    const blobMesh = new THREE.Mesh(blobGeo, blobMat);
    scene.add(blobMesh);

    const particleShell = createParticleShell(5000);
    scene.add(particleShell);

    let animFrameId: number;
    let lastTime = performance.now();

    // Current damped state parameters
    let currentNoiseFreq = ORB_STATE_PRESETS[state].noiseFrequency;
    let currentNoiseAmp = ORB_STATE_PRESETS[state].noiseAmplitude;
    let currentRotSpeed = ORB_STATE_PRESETS[state].rotationSpeed;

    const rimColor = new THREE.Color(ORB_STATE_PRESETS[state].rimColor);
    const coreColor = new THREE.Color(ORB_STATE_PRESETS[state].coreColor);

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const targetPreset = ORB_STATE_PRESETS[state] || ORB_STATE_PRESETS.idle;

      // Damp state parameters smoothly
      currentNoiseFreq = damp(currentNoiseFreq, targetPreset.noiseFrequency, 4.0, dt);
      currentNoiseAmp = damp(currentNoiseAmp, targetPreset.noiseAmplitude, 4.0, dt);
      currentRotSpeed = damp(currentRotSpeed, targetPreset.rotationSpeed, 4.0, dt);

      rimColor.lerp(new THREE.Color(targetPreset.rimColor), 0.1);
      coreColor.lerp(new THREE.Color(targetPreset.coreColor), 0.1);

      // Audio level
      const audioLevel = audioControllerRef.current ? audioControllerRef.current.getAudioLevel() : 0;

      // Shader Uniforms update
      blobMat.uniforms.uTime.value = now / 1000;
      blobMat.uniforms.uNoiseFreq.value = currentNoiseFreq;
      blobMat.uniforms.uNoiseAmp.value = currentNoiseAmp;
      blobMat.uniforms.uAudioLevel.value = audioLevel;
      blobMat.uniforms.uRimColor.value = rimColor;
      blobMat.uniforms.uCoreColor.value = coreColor;

      // Rotation & Orbital motion
      blobMesh.rotation.y += currentRotSpeed * dt;
      particleShell.rotation.y -= currentRotSpeed * 0.5 * dt;

      renderer.render(scene, camera);

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      renderer.dispose();
      blobGeo.dispose();
      blobMat.dispose();
      if (mountRef.current && renderer.domElement) {
        try { mountRef.current.removeChild(renderer.domElement); } catch (_) {}
      }
    };
  }, [state, size, supported]);

  if (!supported) {
    return <OrbFallback state={state} size={size} />;
  }

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center select-none"
    />
  );
};

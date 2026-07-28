import * as THREE from 'three';
import { NOISE_GLSL } from './Noise';

export function createBlobMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNoiseFreq: { value: 1.2 },
      uNoiseAmp: { value: 0.15 },
      uAudioLevel: { value: 0 },
      uMousePos: { value: new THREE.Vector2(0, 0) },
      uRimColor: { value: new THREE.Color('#A9FFFF') },
      uCoreColor: { value: new THREE.Color('#63B8FF') },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uNoiseFreq;
      uniform float uNoiseAmp;
      uniform float uAudioLevel;
      uniform vec2 uMousePos;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;

      ${NOISE_GLSL}

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;

        // Multi-octave curl noise displacement
        vec3 noisePos = pos * uNoiseFreq + vec3(uTime * 0.4);
        vec3 displacement = curlNoise(noisePos) * (uNoiseAmp + uAudioLevel * 0.25);

        // Breathing & audio pulse
        float breath = sin(uTime * 1.5) * 0.04;
        pos += normal * (displacement + breath + uAudioLevel * 0.15);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vPosition = pos;
        vViewPosition = -mvPosition.xyz;

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uRimColor;
      uniform vec3 uCoreColor;

      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Fresnel glass rim glow
        float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.5);

        vec3 color = mix(uCoreColor, uRimColor, fresnel * 0.85);
        float alpha = clamp(0.75 + fresnel * 0.25, 0.0, 1.0);

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

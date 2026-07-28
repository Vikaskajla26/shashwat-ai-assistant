import * as THREE from 'three';

export function createParticleShell(count = 5000): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const colorA = new THREE.Color('#63B8FF');
  const colorB = new THREE.Color('#B36CFF');

  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio

  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / phi;
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y)) * (1.15 + Math.random() * 0.35);

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y * 1.3;
    positions[i * 3 + 2] = z;

    const lerpColor = colorA.clone().lerp(colorB, Math.random());
    colors[i * 3] = lerpColor.r;
    colors[i * 3 + 1] = lerpColor.g;
    colors[i * 3 + 2] = lerpColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

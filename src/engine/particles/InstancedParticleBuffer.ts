import * as THREE from 'three';

export interface ParticleAttributeData {
  positions: Float32Array;
  scales: Float32Array;
  alphas: Float32Array;
  colors: Float32Array;
  count: number;
}

/**
 * InstancedParticleBuffer — Manages GPU instanced geometry buffers for high-density,
 * 60fps quantum energy particles without draw call overhead.
 */
export class InstancedParticleBuffer {
  private count: number;
  private dummy = new THREE.Object3D();
  private mesh: THREE.InstancedMesh;

  constructor(count: number, geometry: THREE.BufferGeometry, material: THREE.Material) {
    this.count = count;
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  public getMesh(): THREE.InstancedMesh {
    return this.mesh;
  }

  public updateParticles(
    updater: (index: number, dummy: THREE.Object3D) => { scale?: number; color?: THREE.Color }
  ): void {
    for (let i = 0; i < this.count; i++) {
      const res = updater(i, this.dummy);
      if (res.scale !== undefined) {
        this.dummy.scale.setScalar(res.scale);
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      if (res.color) {
        this.mesh.setColorAt(i, res.color);
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}

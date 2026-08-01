import * as THREE from 'three';

export interface CustomShaderDefinition {
  name: string;
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, THREE.IUniform>;
}

/**
 * ShaderRegistry — Factory and registration cache for GLSL custom materials.
 */
export class ShaderRegistry {
  private static instance: ShaderRegistry | null = null;
  private shaders: Map<string, CustomShaderDefinition> = new Map();
  private materialCache: Map<string, THREE.ShaderMaterial> = new Map();

  public static getInstance(): ShaderRegistry {
    if (!this.instance) {
      this.instance = new ShaderRegistry();
    }
    return this.instance;
  }

  public registerShader(def: CustomShaderDefinition): void {
    this.shaders.set(def.name, def);
  }

  public getMaterial(name: string, overrideUniforms?: Record<string, THREE.IUniform>): THREE.ShaderMaterial | null {
    if (this.materialCache.has(name)) {
      return this.materialCache.get(name)!;
    }

    const def = this.shaders.get(name);
    if (!def) {
      console.warn(`[ShaderRegistry] Shader "${name}" not registered.`);
      return null;
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: def.vertexShader,
      fragmentShader: def.fragmentShader,
      uniforms: { ...def.uniforms, ...(overrideUniforms || {}) },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.materialCache.set(name, material);
    return material;
  }

  public updateUniform(materialName: string, uniformKey: string, value: any): void {
    const mat = this.materialCache.get(materialName);
    if (mat && mat.uniforms[uniformKey]) {
      mat.uniforms[uniformKey].value = value;
    }
  }

  public dispose(): void {
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
  }
}

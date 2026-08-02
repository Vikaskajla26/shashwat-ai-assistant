import * as THREE from 'three';

export const DualPassCompositeShader = {
  uniforms: {
    tBeauty: { value: null },
    tBloom: { value: null },
    uBloomColor: { value: new THREE.Color('#F59E0B') },
    uBloomIntensity: { value: 0.65 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tBeauty;
    uniform sampler2D tBloom;
    uniform vec3 uBloomColor;
    uniform float uBloomIntensity;
    varying vec2 vUv;

    void main() {
      vec4 beauty = texture2D(tBeauty, vUv);
      vec4 bloom = texture2D(tBloom, vUv);

      vec3 bloomRgb = clamp(bloom.rgb, 0.0, 1.0) * uBloomColor * uBloomIntensity;
      vec3 finalColor = clamp(beauty.rgb + bloomRgb, 0.0, 1.0);
      float finalAlpha = clamp(beauty.a + length(bloomRgb) * 0.4, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `,
};

export class PostFXComposite {
  public material: THREE.ShaderMaterial;
  public quadMesh: THREE.Mesh;
  public scene: THREE.Scene;
  public camera: THREE.OrthographicCamera;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DualPassCompositeShader.uniforms),
      vertexShader: DualPassCompositeShader.vertexShader,
      fragmentShader: DualPassCompositeShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene = new THREE.Scene();
    this.scene.add(this.quadMesh);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  public setBloomUniforms(intensity: number, color: THREE.Color) {
    this.material.uniforms.uBloomIntensity.value = intensity;
    if (color && this.material.uniforms.uBloomColor) {
      (this.material.uniforms.uBloomColor.value as THREE.Color).copy(color);
    }
  }

  public dispose() {
    this.material.dispose();
    this.quadMesh.geometry.dispose();
  }
}

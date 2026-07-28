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
  onToggleConnection?: () => void;
  onToggleMute?: () => void;
  previewStateOverride?: string | null;
}

const noiseGLSL = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`;

const ORB_STATES: Record<string, any> = {
  idle: { label: 'Idle', amp: 0.055, freq: 1.15, speed: 0.16, activity: 0.14, ring: 0, active: false },
  listening: { label: 'Listening', amp: 0.075, freq: 1.35, speed: 0.26, activity: 0.30, ring: 1, active: true },
  thinking: { label: 'Thinking', amp: 0.135, freq: 2.15, speed: 0.62, activity: 0.62, ring: 0, active: true },
  speaking: { label: 'Speaking', amp: 0.10, freq: 1.55, speed: 0.42, activity: 0.34, ring: 0, active: true },
  executing: { label: 'Executing', amp: 0.095, freq: 1.85, speed: 0.95, activity: 0.70, ring: 0, active: true },
  memory: { label: 'Recalling', amp: 0.07, freq: 1.30, speed: 0.22, activity: 0.26, ring: 0, active: true, thread: 1 },
  error: { label: 'Attention', amp: 0.04, freq: 1.0, speed: 0.10, activity: 0.10, ring: 0, active: true, err: 1 },
};

export const AssistantOrb: React.FC<AssistantOrbProps> = ({
  state,
  volume = 0,
  previewStateOverride,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let W = container.clientWidth || 500;
    let H = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0, 6.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);

    // Orb Mesh
    const orbGeo = new THREE.IcosahedronGeometry(1.35, 6);
    const orbUniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.055 },
      uFreq: { value: 1.15 },
      uErr: { value: 0 },
      uThread: { value: 0 },
      uColorA: { value: new THREE.Color(0xffffff) },
      uColorB: { value: new THREE.Color(0x6c7ce0) },
      uDark: { value: 1 },
    };

    const orbMat = new THREE.ShaderMaterial({
      uniforms: orbUniforms,
      transparent: true,
      side: THREE.FrontSide,
      vertexShader: `
        varying vec3 vNormal; varying vec3 vPos; varying float vDisp;
        uniform float uTime, uAmp, uFreq;
        ${noiseGLSL}
        void main(){
          vNormal = normalMatrix * normal;
          float n = snoise(normal * uFreq + uTime);
          float n2 = snoise(normal * uFreq * 2.1 - uTime*0.6) * 0.4;
          float disp = (n + n2) * uAmp;
          vDisp = disp;
          vec3 newPos = position + normal * disp;
          vPos = newPos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal; varying vec3 vPos; varying float vDisp;
        uniform vec3 uColorA, uColorB; uniform float uErr, uThread, uDark;
        void main(){
          vec3 viewDir = normalize(-vPos + vec3(0.0,0.0,6.4));
          float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.4);
          vec3 base = mix(uColorA, uColorB, clamp(fresnel*1.3 + vDisp*1.5, 0.0, 1.0));
          float gray = dot(base, vec3(0.299,0.587,0.114));
          base = mix(base, vec3(gray), uErr*0.7);
          float thread = smoothstep(0.35,0.5, sin(vPos.y*14.0 + vPos.x*9.0)) * uThread * fresnel;
          base += vec3(0.85,0.75,0.35) * thread * 0.6;
          float alpha = mix(0.34, 0.85, fresnel) + uDark*0.05;
          gl_FragColor = vec4(base, alpha);
        }
      `,
    });

    const orb = new THREE.Mesh(orbGeo, orbMat);
    scene.add(orb);

    // Listening Ring
    const ringGeo = new THREE.TorusGeometry(1.85, 0.008, 16, 128);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6c7ce0, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.15;
    scene.add(ring);

    // 130 Particles
    const PCOUNT = 130;
    const pPositions = new Float32Array(PCOUNT * 3);
    const pSeeds = new Float32Array(PCOUNT);
    for (let i = 0; i < PCOUNT; i++) {
      const r = 2.1 + Math.random() * 1.7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPositions[i * 3 + 2] = r * Math.cos(phi) * 0.6;
      pSeeds[i] = Math.random() * 100;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeeds, 1));
    const pUniforms = { uTime: { value: 0 }, uActivity: { value: 0.14 }, uColor: { value: new THREE.Color(0x6c7ce0) } };
    const pMat = new THREE.ShaderMaterial({
      uniforms: pUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float aSeed; uniform float uTime, uActivity;
        varying float vA;
        ${noiseGLSL}
        void main(){
          vec3 p = position;
          float t = uTime*0.15 + aSeed;
          p.x += snoise(vec3(aSeed, t, 0.0)) * (0.5 + uActivity*1.2);
          p.y += snoise(vec3(0.0, aSeed, t)) * (0.5 + uActivity*1.2);
          p.z += snoise(vec3(t, 0.0, aSeed)) * (0.3 + uActivity*0.8);
          vA = 0.15 + uActivity*0.85;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          gl_PointSize = (2.2 + uActivity*2.0) * (300.0/-mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vA; uniform vec3 uColor;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if(d>0.5) discard;
          float a = smoothstep(0.5,0.0,d) * vA * 0.55;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });

    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Mouse Parallax
    let mouseX = 0,
      mouseY = 0;
    const handlePointerMove = (e: PointerEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove);

    let currentValues = { amp: 0.055, freq: 1.15, speed: 0.16, activity: 0.14, ring: 0, thread: 0, err: 0 };
    let targetValues = { ...currentValues };

    let animFrameId: number;
    let clock = new THREE.Clock();

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const render = () => {
      animFrameId = requestAnimationFrame(render);
      const t = clock.getElapsedTime();

      // Resolve state key
      let stateKey = previewStateOverride || 'idle';
      if (!previewStateOverride) {
        if (state === 'listening') stateKey = 'listening';
        else if (state === 'connecting') stateKey = 'thinking';
        else if (state === 'speaking') stateKey = 'speaking';
        else stateKey = 'idle';
      }

      const st = ORB_STATES[stateKey] || ORB_STATES.idle;
      targetValues.amp = st.amp + (volume / 100) * 0.06;
      targetValues.freq = st.freq;
      targetValues.speed = st.speed;
      targetValues.activity = st.activity;
      targetValues.ring = st.ring;
      targetValues.thread = st.thread || 0;
      targetValues.err = st.err || 0;

      currentValues.amp = lerp(currentValues.amp, targetValues.amp, 0.045);
      currentValues.freq = lerp(currentValues.freq, targetValues.freq, 0.045);
      currentValues.speed = lerp(currentValues.speed, targetValues.speed, 0.045);
      currentValues.activity = lerp(currentValues.activity, targetValues.activity, 0.045);
      currentValues.ring = lerp(currentValues.ring, targetValues.ring, 0.06);
      currentValues.thread = lerp(currentValues.thread, targetValues.thread, 0.05);
      currentValues.err = lerp(currentValues.err, targetValues.err, 0.08);

      orbUniforms.uTime.value = t * currentValues.speed;
      orbUniforms.uAmp.value = currentValues.amp;
      orbUniforms.uFreq.value = currentValues.freq;
      orbUniforms.uThread.value = currentValues.thread;
      orbUniforms.uErr.value = currentValues.err;

      pUniforms.uTime.value = t;
      pUniforms.uActivity.value = currentValues.activity;

      ringMat.opacity = currentValues.ring * 0.55;
      ring.scale.setScalar(1 + Math.sin(t * 1.4) * 0.02 * currentValues.ring);

      const breathe = 1 + Math.sin(t * 0.7) * 0.02;
      orb.scale.setScalar(breathe);

      const targetRotX = mouseY * 0.06;
      const targetRotY = mouseX * 0.09;
      scene.rotation.x = lerp(scene.rotation.x, targetRotX, 0.03);
      scene.rotation.y = lerp(scene.rotation.y, targetRotY, 0.03) + 0.0006;

      renderer.render(scene, camera);
    };

    render();

    const handleResize = () => {
      if (!container) return;
      W = container.clientWidth || 500;
      H = container.clientHeight || 500;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [state, volume, previewStateOverride]);

  return (
    <div className="relative flex items-center justify-center w-[520px] h-[520px] max-w-full select-none">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};

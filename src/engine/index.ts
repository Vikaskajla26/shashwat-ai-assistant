// ── Rendering Engine ──
export * from './rendering/GPUDetector';
export * from './rendering/FPSMonitor';
export * from './rendering/AdaptiveQualityEngine';
export * from './rendering/ViewportEngine';

// ── Animation Engine ──
export * from './animation/GSAPOrchestrator';
export * from './animation/SpringPhysicsRig';
export * from './animation/UnifiedPhysicsEngine';
export * from './animation/MotionPresets';

// ── Shader Engine ──
export * from './shaders/ShaderRegistry';
export * from './shaders/PlasmaCoreShader';

// ── Particle Engine ──
export * from './particles/InstancedParticleBuffer';

// ── State Engine ──
export * from './state/useAIStateStore';
export * from './state/useQualityStore';
export * from './state/useUIStore';

// ── Voice Engine ──
export * from './voice/AudioContextEngine';

// ── Memory Engine ──
export * from './memory/ContextMemoryEngine';

// ── Command Engine ──
export * from './command/CommandDispatcher';

// ── Plugin Engine ──
export * from './plugins/PluginRegistry';

// ── Providers ──
export * from './providers/EngineProvider';
export * from './providers/ThemeProvider';

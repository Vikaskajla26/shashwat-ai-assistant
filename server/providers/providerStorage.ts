import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter' | 'local';

export interface AIProviderConfig {
  id: AIProviderId;
  name: string;
  enabled: boolean;
  apiKey: string;
  selectedModel: string;
  customEndpoint?: string;
  status: 'valid' | 'invalid' | 'unconfigured' | 'error';
  lastConnectedAt?: string;
  lastError?: string;
}

export interface ClientProviderMeta {
  id: AIProviderId;
  name: string;
  enabled: boolean;
  maskedApiKey: string;
  hasKey: boolean;
  selectedModel: string;
  availableModels: string[];
  customEndpoint?: string;
  status: 'valid' | 'invalid' | 'unconfigured' | 'error';
  lastConnectedAt?: string;
  lastError?: string;
}

export const DEFAULT_PROVIDERS: Record<AIProviderId, { name: string; defaultModel: string; availableModels: string[]; requiresKey: boolean }> = {
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    availableModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    requiresKey: true,
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    requiresKey: true,
  },
  anthropic: {
    name: 'Anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    requiresKey: true,
  },
  groq: {
    name: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    availableModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    requiresKey: true,
  },
  openrouter: {
    name: 'OpenRouter',
    defaultModel: 'auto',
    availableModels: ['auto', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct'],
    requiresKey: true,
  },
  local: {
    name: 'Local AI (Ollama)',
    defaultModel: 'llama3:latest',
    availableModels: ['llama3:latest', 'mistral:latest', 'qwen2.5:latest', 'custom'],
    requiresKey: false,
  },
};

const ALGORITHM = 'aes-256-gcm';

function getDerivedKey(): Buffer {
  const machineId = `${os.hostname()}_${os.userInfo().username}_shashwat_key_salt_2026`;
  return crypto.pbkdf2Sync(machineId, 'shashwat_salt_v1', 100000, 32, 'sha256');
}

function getStoragePath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'ai_providers.enc');
}

function encrypt(text: string): { iv: string; encryptedData: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const key = getDerivedKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    tag,
  };
}

function decrypt(encryptedObj: { iv: string; encryptedData: string; tag: string }): string {
  const key = getDerivedKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encryptedObj.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedObj.tag, 'hex'));
  let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function loadAllProviderConfigs(): Record<AIProviderId, AIProviderConfig> {
  const storagePath = getStoragePath();
  const configs: Record<AIProviderId, AIProviderConfig> = {} as any;

  // Initialize defaults
  (Object.keys(DEFAULT_PROVIDERS) as AIProviderId[]).forEach((id) => {
    const def = DEFAULT_PROVIDERS[id];
    configs[id] = {
      id,
      name: def.name,
      enabled: id === 'gemini', // default Gemini enabled
      apiKey: id === 'gemini' ? (process.env.GEMINI_API_KEY || '') : '',
      selectedModel: def.defaultModel,
      status: (id === 'gemini' && process.env.GEMINI_API_KEY) ? 'valid' : 'unconfigured',
    };
  });

  if (!fs.existsSync(storagePath)) {
    return configs;
  }

  try {
    const raw = fs.readFileSync(storagePath, 'utf8');
    const encryptedObj = JSON.parse(raw);
    const decryptedJson = decrypt(encryptedObj);
    const loadedData: Record<string, Partial<AIProviderConfig>> = JSON.parse(decryptedJson);

    (Object.keys(loadedData) as AIProviderId[]).forEach((id) => {
      if (configs[id] && loadedData[id]) {
        configs[id] = {
          ...configs[id],
          ...loadedData[id],
        };
      }
    });
  } catch (err) {
    console.error('[ProviderStorage] Failed to read/decrypt provider configs:', err);
  }

  return configs;
}

export function saveAllProviderConfigs(configs: Record<AIProviderId, AIProviderConfig>): boolean {
  try {
    const storagePath = getStoragePath();
    const jsonStr = JSON.stringify(configs);
    const encryptedObj = encrypt(jsonStr);
    fs.writeFileSync(storagePath, JSON.stringify(encryptedObj, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[ProviderStorage] Failed to save encrypted configs:', err);
    return false;
  }
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '••••••••';
  return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4);
}

export function getClientProviderMetas(): ClientProviderMeta[] {
  const configs = loadAllProviderConfigs();
  return (Object.keys(DEFAULT_PROVIDERS) as AIProviderId[]).map((id) => {
    const cfg = configs[id];
    const def = DEFAULT_PROVIDERS[id];
    return {
      id,
      name: def.name,
      enabled: cfg.enabled,
      maskedApiKey: maskApiKey(cfg.apiKey),
      hasKey: !!cfg.apiKey.trim(),
      selectedModel: cfg.selectedModel || def.defaultModel,
      availableModels: def.availableModels,
      customEndpoint: cfg.customEndpoint,
      status: cfg.status,
      lastConnectedAt: cfg.lastConnectedAt,
      lastError: cfg.lastError,
    };
  });
}

export function getActiveProvider(): AIProviderConfig | null {
  const configs = loadAllProviderConfigs();
  const enabledList = (Object.values(configs) as AIProviderConfig[]).filter(c => c.enabled);
  
  // Prefer Gemini if enabled and has key, or first valid enabled provider
  const gemini = enabledList.find(c => c.id === 'gemini' && (c.apiKey || !DEFAULT_PROVIDERS.gemini.requiresKey));
  if (gemini) return gemini;

  const validAny = enabledList.find(c => c.apiKey || !DEFAULT_PROVIDERS[c.id].requiresKey);
  return validAny || null;
}

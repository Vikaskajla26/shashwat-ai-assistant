import { GoogleGenAI } from '@google/genai';
import {
  AIProviderId,
  AIProviderConfig,
  loadAllProviderConfigs,
  saveAllProviderConfigs,
  getActiveProvider,
} from './providerStorage';

export interface ValidationResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export class AIProviderManager {
  private static instance: AIProviderManager | null = null;

  public static getInstance(): AIProviderManager {
    if (!this.instance) {
      this.instance = new AIProviderManager();
    }
    return this.instance;
  }

  public getActiveConfig(): AIProviderConfig | null {
    return getActiveProvider();
  }

  public async validateProvider(
    id: AIProviderId,
    apiKey: string,
    model: string,
    customEndpoint?: string
  ): Promise<ValidationResult> {
    const timestamp = new Date().toISOString();
    const cleanKey = (typeof apiKey === 'string' ? apiKey : '').trim();

    try {
      switch (id) {
        case 'gemini': {
          if (!cleanKey) {
            return { success: false, message: 'Gemini API key is required.', timestamp };
          }
          const ai = new GoogleGenAI({ apiKey: cleanKey });
          // Test generation with lightweight prompt
          await ai.models.generateContent({
            model: model || 'gemini-2.0-flash',
            contents: 'ping',
          });
          return { success: true, message: 'Gemini API key validated successfully!', timestamp };
        }

        case 'openai': {
          if (!cleanKey) {
            return { success: false, message: 'OpenAI API key is required.', timestamp };
          }
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${cleanKey}` },
          });
          if (res.ok) {
            return { success: true, message: 'OpenAI API key validated successfully!', timestamp };
          }
          const errData: any = await res.json().catch(() => ({}));
          return {
            success: false,
            message: errData?.error?.message || `OpenAI validation failed (${res.status})`,
            timestamp,
          };
        }

        case 'anthropic': {
          if (!cleanKey) {
            return { success: false, message: 'Anthropic API key is required.', timestamp };
          }
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': cleanKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: model || 'claude-3-5-haiku-20241022',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'ping' }],
            }),
          });
          if (res.ok) {
            return { success: true, message: 'Anthropic API key validated successfully!', timestamp };
          }
          const errData: any = await res.json().catch(() => ({}));
          return {
            success: false,
            message: errData?.error?.message || `Anthropic validation failed (${res.status})`,
            timestamp,
          };
        }

        case 'groq': {
          if (!cleanKey) {
            return { success: false, message: 'Groq API key is required.', timestamp };
          }
          const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${cleanKey}` },
          });
          if (res.ok) {
            return { success: true, message: 'Groq API key validated successfully!', timestamp };
          }
          return { success: false, message: `Groq validation failed (${res.status})`, timestamp };
        }

        case 'openrouter': {
          if (!cleanKey) {
            return { success: false, message: 'OpenRouter API key is required.', timestamp };
          }
          const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { Authorization: `Bearer ${cleanKey}` },
          });
          if (res.ok) {
            return { success: true, message: 'OpenRouter API key validated successfully!', timestamp };
          }
          return { success: false, message: `OpenRouter validation failed (${res.status})`, timestamp };
        }

        case 'local': {
          const endpoint = customEndpoint || 'http://localhost:11434/api/tags';
          const res = await fetch(endpoint).catch(() => null);
          if (res && res.ok) {
            return { success: true, message: 'Local AI endpoint is online and responsive!', timestamp };
          }
          return {
            success: false,
            message: `Could not connect to Local AI at ${endpoint}. Ensure Ollama is running.`,
            timestamp,
          };
        }

        default:
          return { success: false, message: 'Unsupported provider', timestamp };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Network validation error occurred.',
        timestamp,
      };
    }
  }

  public async saveProvider(
    id: AIProviderId,
    apiKey: string,
    selectedModel: string,
    enabled: boolean,
    customEndpoint?: string
  ): Promise<{ success: boolean; message: string; config?: AIProviderConfig }> {
    const configs = loadAllProviderConfigs();
    const existing = configs[id];

    if (!existing) {
      return { success: false, message: `Provider ${id} does not exist.` };
    }

    // If enabled, validate key
    let status: 'valid' | 'invalid' | 'unconfigured' | 'error' = existing.status;
    let lastError: string | undefined = existing.lastError;
    let lastConnectedAt: string | undefined = existing.lastConnectedAt;

    const keyToUse = (typeof apiKey === 'string' && apiKey.trim()) ? apiKey.trim() : existing.apiKey;

    if (enabled && (id !== 'local' && !keyToUse)) {
      return { success: false, message: `API key is required to enable ${existing.name}.` };
    }

    if (keyToUse || id === 'local') {
      const val = await this.validateProvider(id, keyToUse, selectedModel, customEndpoint);
      if (val.success) {
        status = 'valid';
        lastConnectedAt = val.timestamp;
        lastError = undefined;
      } else {
        status = 'invalid';
        lastError = val.message;
      }
    } else {
      status = 'unconfigured';
    }

    configs[id] = {
      ...existing,
      enabled,
      apiKey: keyToUse,
      selectedModel: selectedModel || existing.selectedModel,
      customEndpoint,
      status,
      lastConnectedAt,
      lastError,
    };

    const saved = saveAllProviderConfigs(configs);
    if (!saved) {
      return { success: false, message: 'Failed to write encrypted provider configuration.' };
    }

    return {
      success: status === 'valid' || !enabled,
      message: status === 'valid' ? `${existing.name} saved and validated successfully!` : (lastError || 'Saved provider settings.'),
      config: configs[id],
    };
  }

  public resetProvider(id: AIProviderId): boolean {
    const configs = loadAllProviderConfigs();
    if (configs[id]) {
      configs[id].enabled = false;
      configs[id].apiKey = '';
      configs[id].status = 'unconfigured';
      configs[id].lastError = undefined;
      configs[id].lastConnectedAt = undefined;
      return saveAllProviderConfigs(configs);
    }
    return false;
  }
}

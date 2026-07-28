import { describe, it, expect } from 'vitest';
import { executeTool } from './index';

describe('Server Tool Engine Execution Tests', () => {
  it('should execute getSystemInfo tool cleanly', async () => {
    const res = await executeTool('getSystemInfo', {});
    expect(res.response).toBeDefined();
    expect(res.event).toBeDefined();
  });

  it('should execute get_voice_status tool cleanly', async () => {
    const res = await executeTool('get_voice_status', {});
    expect(res.response).toBeDefined();
  });

  it('should execute system_control tool safely', async () => {
    const res = await executeTool('system_control', { action: 'volume_up' });
    expect(res.response).toBeDefined();
  });
});

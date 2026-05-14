import { PROVIDER_CAPABILITIES } from '../capabilities';
import { SUPPORTED_PROVIDERS } from '../translation-provider.interface';

describe('PROVIDER_CAPABILITIES', () => {
  it('covers every supported provider', () => {
    for (const p of SUPPORTED_PROVIDERS) {
      expect(PROVIDER_CAPABILITIES[p]).toBeDefined();
    }
  });

  it('every defaultModel is also in its own recommendedModels (when defaultModel is non-empty)', () => {
    for (const [provider, cap] of Object.entries(PROVIDER_CAPABILITIES)) {
      if (cap.defaultModel) {
        expect(cap.recommendedModels).toContain(cap.defaultModel);
      }
    }
  });

  it('openai-compatible requires baseUrl, deepl/google-translate do not support tool calling', () => {
    expect(PROVIDER_CAPABILITIES['openai-compatible'].requiresBaseUrl).toBe(true);
    expect(PROVIDER_CAPABILITIES['deepl'].toolCalling).toBe(false);
    expect(PROVIDER_CAPABILITIES['google-translate'].toolCalling).toBe(false);
  });

  it('LLM providers (toolCalling=true) all have a non-empty defaultModel or an empty recommendedModels (openai-compatible)', () => {
    for (const [provider, cap] of Object.entries(PROVIDER_CAPABILITIES)) {
      if (cap.toolCalling && !cap.requiresBaseUrl) {
        expect(cap.defaultModel).not.toBe('');
        expect(cap.recommendedModels.length).toBeGreaterThan(0);
      }
    }
  });
});

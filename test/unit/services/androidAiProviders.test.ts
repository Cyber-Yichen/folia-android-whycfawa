// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readAiSettings, writeAiSettings, DEFAULT_AI_SETTINGS } from '../../../src/services/aiSettings';
import { listAiModels, modelListUrl } from '../../../src/services/ai/modelDiscovery';
import { createAiCompletionFetch } from '../../../src/services/ai/aiCompletionFetch';
import { AI_PROVIDER_PRESETS } from '../../../shared/aiProviderPresets.mjs';

// Provider migration, bounded catalogues and Anthropic conversion share the production network adapter.
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
describe('Android AI providers', () => {
    it('recognises old compatible endpoints without discarding credentials or model', () => {
        localStorage.setItem('foliaAiProviderSettings', JSON.stringify({ provider: 'openai', openaiApiUrl: 'https://api.deepseek.com/v1/chat/completions', openaiApiKey: 'existing-key', openaiApiModel: 'saved-model' }));
        expect(readAiSettings()).toMatchObject({ preset: 'deepseek', openaiApiKey: 'existing-key', openaiApiModel: 'saved-model' });
    });
    it('retains arbitrary custom endpoints and sorts custom last', () => {
        writeAiSettings({ provider: 'openai', openaiApiUrl: 'https://example.test/v1', preset: 'custom' });
        expect(readAiSettings().preset).toBe('custom');
        expect(AI_PROVIDER_PRESETS.at(-1)?.id).toBe('custom');
    });
    it('paginates Gemini models, filters embeddings and never follows a remote URL', async () => {
        const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ models: [{ name: 'models/chat-1', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embed', supportedGenerationMethods: ['embedContent'] }], nextPageToken: 'page2' })))
            .mockResolvedValueOnce(new Response(JSON.stringify({ models: [{ name: 'models/chat-2', supportedGenerationMethods: ['generateContent'] }] })));
        const result = await listAiModels({ ...DEFAULT_AI_SETTINGS, geminiApiKey: 'test-secret' }, request);
        expect(result).toMatchObject({ ok: true, models: [{ id: 'chat-1' }, { id: 'chat-2' }] });
        expect(request.mock.calls[1][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models?pageToken=page2');
        expect(request.mock.calls[0][1].headers).toEqual({ 'x-goog-api-key': 'test-secret' });
    });
    it('rejects repeated catalogue cursors and reflected secrets', async () => {
        const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'test-secret' }], has_more: true, last_id: 'same' })));
        // Return a fresh Response for each page.
        request.mockImplementation(async () => new Response(JSON.stringify({ data: [{ id: 'test-secret' }], has_more: true, last_id: 'same' })));
        expect(await listAiModels({ ...DEFAULT_AI_SETTINGS, provider: 'openai', openaiApiKey: 'test-secret' }, request)).toEqual({ ok: false, errorKind: 'invalid' });
        expect(request).toHaveBeenCalledTimes(2);
    });
    it('provides a manual fallback result on unsupported catalogues and failed auth', async () => {
        const settings = { ...DEFAULT_AI_SETTINGS, provider: 'openai' as const, openaiApiKey: 'key' };
        expect(await listAiModels(settings, vi.fn(async () => new Response('', { status: 404 })))).toEqual({ ok: false, errorKind: 'http', status: 404 });
        expect(await listAiModels(settings, vi.fn(async () => new Response('', { status: 401 })))).toEqual({ ok: false, errorKind: 'auth', status: 401 });
    });
    it('uses the GLM catalogue endpoint', () => {
        expect(modelListUrl({ ...DEFAULT_AI_SETTINGS, provider: 'openai', openaiApiUrl: 'https://open.bigmodel.cn/api/paas/v4' }).pathname).toBe('/api/fine-tuning/model_center/list');
    });
    it('translates theme and segmentation completion requests into native Anthropic messages', async () => {
        const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ model: 'claude-test', content: [{ type: 'text', text: '{"ok":true}' }], stop_reason: 'max_tokens' })));
        vi.stubGlobal('fetch', request);
        const result = await createAiCompletionFetch({ ...DEFAULT_AI_SETTINGS, provider: 'openai', apiProtocol: 'anthropic', openaiApiKey: 'key', openaiApiModel: 'claude-test' })('https://api.anthropic.com/v1/chat/completions', {
            method: 'POST', headers: { Authorization: 'Bearer key' },
            body: JSON.stringify({ model: 'claude-test', messages: [{ role: 'system', content: 'system' }, { role: 'user', content: 'question' }], max_completion_tokens: 100, response_format: { type: 'json_object' } }),
        });
        expect(request.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
        const init = request.mock.calls[0][1]!;
        expect(new Headers(init.headers).get('authorization')).toBeNull();
        expect(new Headers(init.headers).get('x-api-key')).toBe('key');
        expect(JSON.parse(String(init.body))).toEqual({ model: 'claude-test', system: 'system', messages: [{ role: 'user', content: 'question' }], max_tokens: 100 });
        expect(await result.json()).toMatchObject({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'length' }] });
    });
    it('uses the selected Gemini model for all completion callers', async () => {
        const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}')); vi.stubGlobal('fetch', request);
        await createAiCompletionFetch({ ...DEFAULT_AI_SETTINGS, geminiModel: 'gemini-selected' })('https://generativelanguage.googleapis.com/v1beta/models/old:generateContent');
        expect(request.mock.calls[0][0]).toContain('/models/gemini-selected:generateContent');
    });
    it('keeps structured schema requests and native tool responses compatible with segmentation', async () => {
        const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ content: [{ type: 'tool_use', input: { boundaries: [1, 2] } }], stop_reason: 'tool_use' })));
        vi.stubGlobal('fetch', request);
        const settings = { ...DEFAULT_AI_SETTINGS, provider: 'openai' as const, apiProtocol: 'anthropic' as const, openaiApiModel: 'claude-test', openaiApiKey: 'key' };
        const result = await createAiCompletionFetch(settings)('https://api.anthropic.com/v1/chat/completions', { method: 'POST', body: JSON.stringify({ messages: [], response_format: { json_schema: { name: 'lyrics', schema: { type: 'object' } } }, temperature: 2 }) });
        const body = JSON.parse(String(request.mock.calls[0][1]?.body));
        expect(body.tools).toEqual([{ name: 'lyrics', description: 'Return the requested result.', input_schema: { type: 'object' } }]);
        expect(body.tool_choice).toEqual({ type: 'tool', name: 'lyrics' });
        expect(body.temperature).toBe(1);
        expect((await result.json()).choices[0].message.content).toBe('{"boundaries":[1,2]}');
    });
    it('rejects missing or invalid Anthropic models before sending credentials', async () => {
        const request = vi.fn(); vi.stubGlobal('fetch', request);
        for (const model of ['', 'invalid model']) {
            await expect(createAiCompletionFetch({ ...DEFAULT_AI_SETTINGS, provider: 'openai', apiProtocol: 'anthropic', openaiApiModel: model })('https://api.anthropic.com/v1/chat/completions')).rejects.toThrow('Select a valid Anthropic model');
        }
        expect(request).not.toHaveBeenCalled();
    });

});

import { createAiFetch } from '../aiNativeFetch';
import { readAiSettings, type AiSettings } from '../aiSettings';

// Adapt the shared completion contract to the selected native provider for themes and segmentation.
export const createAiCompletionFetch = (settings: AiSettings = readAiSettings()): typeof fetch => {
    const request = createAiFetch();
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
        let url = String(input);
        if (settings.provider === 'gemini' && url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
            url = url.replace(/models\/[^/:]+:generateContent/, 'models/' + settings.geminiModel + ':generateContent');
        }
        if (settings.provider !== 'openai' || settings.apiProtocol !== 'anthropic' || !/\/chat\/completions\/?$/.test(url)) return request(url, init);
        const body = JSON.parse(String(init?.body ?? '{}'));
        const model = settings.openaiApiModel.trim();
        if (!model || model.length > 256 || /[\s\u0000-\u001f]/.test(model)) throw new Error('Select a valid Anthropic model in settings');
        const schema = body.response_format?.json_schema;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const headers = new Headers(init?.headers);
        headers.delete('authorization');
        headers.set('x-api-key', settings.openaiApiKey.trim());
        headers.set('anthropic-version', '2023-06-01');
        const response = await request(url.replace(/\/chat\/completions\/?$/, '/messages'), {
            ...init, headers,
            body: JSON.stringify({
                model,
                max_tokens: body.max_tokens ?? body.max_completion_tokens ?? 8192,
                system: messages.filter((item: { role: string }) => item.role === 'system').map((item: { content: string }) => item.content).join('\n'),
                messages: messages.filter((item: { role: string }) => item.role !== 'system'),
                ...(body.temperature === undefined ? {} : { temperature: Math.max(0, Math.min(1, Number(body.temperature))) }),
                ...(schema?.schema ? {
                    tools: [{ name: schema.name || 'response', description: 'Return the requested result.', input_schema: schema.schema }],
                    tool_choice: { type: 'tool', name: schema.name || 'response' },
                } : {}),
            }),
        });
        if (!response.ok) return response;
        const data = await response.json();
        const content = Array.isArray(data.content) ? data.content : [];
        const tool = content.find((part: { type: string; input?: unknown }) => part.type === 'tool_use' && part.input !== undefined);
        const text = tool ? JSON.stringify(tool.input) : content.filter((part: { type: string }) => part.type === 'text').map((part: { text: string }) => part.text).join('');
        return new Response(JSON.stringify({ model: data.model, choices: [{ message: { content: text }, finish_reason: data.stop_reason === 'max_tokens' ? 'length' : 'stop' }], usage: data.usage }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
};

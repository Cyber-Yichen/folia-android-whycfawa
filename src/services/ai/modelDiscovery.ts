import { createAiFetch } from '../aiNativeFetch';
import { readAiSettings, type AiSettings } from '../aiSettings';

// Bounded catalogues use the same credentials and native network bridge as model requests.
export type AiModel = { id: string; name: string };
export type ModelDiscoveryResult = { ok: true; models: AiModel[] } | { ok: false; errorKind: 'config' | 'auth' | 'http' | 'invalid' | 'empty' | 'network'; status?: number };
export const modelListUrl = (settings: AiSettings): URL => {
    if (settings.provider === 'gemini') return new URL('https://generativelanguage.googleapis.com/v1beta/models');
    const url = new URL(settings.openaiApiUrl || 'https://api.openai.com/v1');
    url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/(?:chat\/completions|messages|models)$/, '') + '/models';
    if (url.hostname === 'open.bigmodel.cn' && url.pathname === '/api/paas/v4/models') {
        url.pathname = '/api/fine-tuning/model_center/list'; url.searchParams.set('pageSize', '100'); url.searchParams.set('pageNum', '1');
    }
    return url;
};
export const listAiModels = async (settings = readAiSettings(), request = createAiFetch(30_000)): Promise<ModelDiscoveryResult> => {
    const key = (settings.provider === 'gemini' ? settings.geminiApiKey : settings.openaiApiKey).trim();
    if (!key) return { ok: false, errorKind: 'config' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
        const url = modelListUrl(settings);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return { ok: false, errorKind: 'invalid' };
        const headers: Record<string, string> = settings.provider === 'gemini' ? { 'x-goog-api-key': key } : settings.apiProtocol === 'anthropic'
            ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' } : { Authorization: 'Bearer ' + key };
        const models = new Map<string, AiModel>(), cursors = new Set<string>();
        for (let page = 0; page < 20; page += 1) {
            const response = await request(url.toString(), { method: 'GET', headers, redirect: 'error', signal: controller.signal });
            if (controller.signal.aborted) return { ok: false, errorKind: 'network' };
            if (!response.ok) return { ok: false, errorKind: response.status === 401 || response.status === 403 ? 'auth' : 'http', status: response.status };
            const text = await response.text();
            if (text.length > 2_000_000) return { ok: false, errorKind: 'invalid' };
            const data = JSON.parse(text);
            const rows = settings.provider === 'gemini' ? data.models : data.data ?? data.rows;
            if (!Array.isArray(rows)) return { ok: false, errorKind: 'invalid' };
            for (const row of rows) {
                if (!row || typeof row !== 'object') continue;
                if (settings.provider === 'gemini' && (!Array.isArray(row.supportedGenerationMethods) || !row.supportedGenerationMethods.includes('generateContent'))) continue;
                const rawId = settings.provider === 'gemini' ? row.name : row.id ?? row.modelCode;
                const id = typeof rawId === 'string' ? rawId.replace(/^models\//, '').trim() : '';
                if (!id || id.length > 256 || /[\u0000-\u001f]/.test(id) || id.includes(key)) continue;
                if (settings.provider === 'gemini' && !/^[\w.-]+$/.test(id)) continue;
                const label = row.display_name ?? row.displayName ?? row.modelName ?? id;
                models.set(id, { id, name: typeof label === 'string' ? label.split(key).join('***').slice(0, 256) : id });
                if (models.size > 2000) return { ok: false, errorKind: 'invalid' };
            }
            let cursor: string | null = null;
            if (settings.provider === 'gemini' && data.nextPageToken) { cursor = String(data.nextPageToken); url.searchParams.set('pageToken', cursor); }
            else if (data.has_more === true) { cursor = data.last_id ?? rows.at(-1)?.id; if (!cursor || typeof cursor !== 'string') return { ok: false, errorKind: 'invalid' }; url.searchParams.set(settings.apiProtocol === 'anthropic' ? 'after_id' : 'after', cursor); }
            else if (Array.isArray(data.rows) && Number.isFinite(data.total) && (page + 1) * 100 < data.total) { cursor = String(page + 2); url.searchParams.set('pageNum', cursor); }
            if (cursor === null) return models.size ? { ok: true, models: [...models.values()] } : { ok: false, errorKind: 'empty' };
            if (cursors.has(cursor)) return { ok: false, errorKind: 'invalid' };
            cursors.add(cursor);
        }
        return { ok: false, errorKind: 'invalid' };
    } catch (error) { return { ok: false, errorKind: error instanceof SyntaxError ? 'invalid' : 'network' }; }
    finally { clearTimeout(timer); }
};

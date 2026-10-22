import { appDatabase, type CacheBudgetRecord, type StoredCacheEntry } from '../appDatabase';
import { removeCoverAsset, writeCoverAsset, pruneCoverAssets } from '../binaryAssetStore';
import { isAndroidNativeRuntime } from '../../utils/platform';
import { useAudioSettingsStore } from '../../stores/useAudioSettingsStore';

// src/services/repositories/androidCacheBudget.ts
// Keeps rebuildable Android caches within one LRU budget, including OPFS cover bytes.
const TABLES = ['api_cache', 'user_cache', 'media_cache', 'metadata_cache'];
let tail: Promise<unknown> = Promise.resolve();
let initialized = false;
export const isBudgetedCacheKey = (key: string): boolean => (
    ['user_playlists', 'user_liked_songs', 'user_cloud_playlist'].includes(key)
    || /^(audio_|cover_|lyric_|replayGain_|automix_profile_|playlist_)/.test(key)
    || (key.startsWith('online_provider_') && (key.includes('_playlist') || key.endsWith('_user_home_snapshot')))
);
export const cacheEntryBytes = (data: unknown): number => {
    if (typeof Blob !== 'undefined' && data instanceof Blob) return data.size;
    const encoded = new TextEncoder().encode(JSON.stringify(data) ?? '').byteLength;
    const descriptor = data as { backend?: string; size?: number } | null;
    const external = descriptor && ['opfs', 'electron'].includes(descriptor.backend ?? '')
        && Number.isFinite(descriptor.size) ? Math.max(0, descriptor.size!) : 0;
    return encoded + external;
};
const serialized = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
};
const limitBytes = () => useAudioSettingsStore.getState().mediaCacheLimitGb * 1024 ** 3;

// Old installations are indexed once; subsequent writes only scan small accounting records.
const initialize = async () => {
    if (initialized) return;
    await appDatabase.transaction('rw', [...TABLES, 'cache_budget'], async () => {
        const previous = new Map((await appDatabase.cache_budget.toArray()).map(entry => [entry.key, entry]));
        await appDatabase.cache_budget.clear();
        for (const table of TABLES) {
            const keys = (await appDatabase.table(table).toCollection().primaryKeys()).map(String).filter(isBudgetedCacheKey);
            const known = keys.map(key => previous.get(key)).filter((entry): entry is CacheBudgetRecord =>
                Boolean(entry && entry.table === table && Number.isFinite(entry.bytes) && entry.bytes >= 0));
            await appDatabase.cache_budget.bulkPut(known);
            const knownKeys = new Set(known.map(entry => entry.key));
            const unknown = keys.filter(key => !knownKeys.has(key));
            for (let offset = 0; offset < unknown.length; offset += 8) {
                const entries = await appDatabase.table<StoredCacheEntry>(table).bulkGet(unknown.slice(offset, offset + 8));
                const records: CacheBudgetRecord[] = entries.filter((entry): entry is StoredCacheEntry => Boolean(entry))
                    .map(entry => ({ key: entry.key, table, bytes: cacheEntryBytes(entry.data), accessedAt: previous.get(entry.key)?.accessedAt ?? entry.timestamp }));
                await appDatabase.cache_budget.bulkPut(records);
            }
        }
    });
    const covers = (await appDatabase.media_cache.toCollection().primaryKeys()).map(String).filter(key => key.startsWith('cover_'));
    await pruneCoverAssets(covers);
    initialized = true;
};

// OPFS work stays outside Dexie transactions; serialized cover writes prevent replacement races.
const trim = async (ceiling: number, reserve = 0, replacingKey?: string): Promise<void> => {
    if (!ceiling) return;
    const removed: string[] = [];
    await appDatabase.transaction('rw', [...TABLES, 'cache_budget'], async () => {
        const records = await appDatabase.cache_budget.toArray();
        const existing = new Map<string, Set<string>>();
        for (const table of TABLES) existing.set(table, new Set((await appDatabase.table(table).toCollection().primaryKeys()).map(String)));
        const live: CacheBudgetRecord[] = [];
        for (const record of records) {
            if (existing.get(record.table)?.has(record.key)) live.push(record);
            else await appDatabase.cache_budget.delete(record.key);
        }
        const candidates = live.filter(entry => entry.key !== replacingKey);
        let total = candidates.reduce((sum, entry) => sum + entry.bytes, 0);
        candidates.sort((a, b) => a.accessedAt - b.accessedAt || a.key.localeCompare(b.key));
        for (const record of candidates) {
            if (total + reserve <= ceiling) break;
            await appDatabase.table(record.table).delete(record.key);
            await appDatabase.cache_budget.delete(record.key);
            total -= record.bytes;
            if (record.key.startsWith('cover_')) removed.push(record.key);
        }
    });
    for (const key of removed) await removeCoverAsset(key);
};
const put = async (table: string, key: string, data: unknown): Promise<void> => {
    const bytes = cacheEntryBytes(data);
    const ceiling = limitBytes();
    if (ceiling && bytes > ceiling) {
        if (key.startsWith('cover_')) {
            await appDatabase.table(table).delete(key);
            await appDatabase.cache_budget.delete(key);
            await removeCoverAsset(key);
        }
        return;
    }
    await trim(ceiling, bytes, key);
    const now = Date.now();
    await appDatabase.transaction('rw', [table, 'cache_budget'], async () => {
        await appDatabase.table(table).put({ key, data, timestamp: now });
        await appDatabase.cache_budget.put({ key, table, bytes, accessedAt: now });
    });
    await trim(ceiling);
};
export const putAndroidCacheEntry = (table: string, key: string, data: unknown): Promise<void> => serialized(async () => {
    await initialize();
    await put(table, key, data);
});
export const putAndroidCover = (key: string, blob: Blob): Promise<void> => serialized(async () => {
    await initialize();
    const ceiling = limitBytes();
    if (ceiling && blob.size > ceiling) return;
    await trim(ceiling, blob.size + 256, key);
    const data = await writeCoverAsset(key, blob).catch(() => null) ?? blob;
    try {
        await put('media_cache', key, data);
    } catch (error) {
        await appDatabase.media_cache.delete(key);
        await appDatabase.cache_budget.delete(key);
        await removeCoverAsset(key);
        throw error;
    }
});
export const touchAndroidCacheEntry = (key: string): Promise<void> => serialized(async () => {
    await initialize();
    const entry = await appDatabase.cache_budget.get(key);
    if (entry && Date.now() - entry.accessedAt > 1000) await appDatabase.cache_budget.update(key, { accessedAt: Date.now() });
});
export const enforceAndroidCacheBudget = (): Promise<void> => serialized(async () => {
    await initialize();
    await trim(limitBytes());
});
export function installAndroidCacheBudget(): () => void {
    if (!isAndroidNativeRuntime()) return () => undefined;
    const enforce = () => void enforceAndroidCacheBudget().catch(error => console.warn('[CacheBudget] Cache cleanup failed', error));
    enforce();
    return useAudioSettingsStore.subscribe((state, previous) => {
        if (state.mediaCacheLimitGb !== previous.mediaCacheLimitGb) enforce();
    });
}

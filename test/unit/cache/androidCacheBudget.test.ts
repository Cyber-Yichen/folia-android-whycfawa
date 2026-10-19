import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appDatabase } from '@/services/appDatabase';
import { useAudioSettingsStore } from '@/stores/useAudioSettingsStore';
import { cacheEntryBytes, enforceAndroidCacheBudget, isBudgetedCacheKey, putAndroidCacheEntry, putAndroidCover, touchAndroidCacheEntry } from '@/services/repositories/androidCacheBudget';
import { removeCoverAsset } from '@/services/binaryAssetStore';

vi.mock('@/services/binaryAssetStore', () => ({
    removeCoverAsset: vi.fn().mockResolvedValue(undefined),
    pruneCoverAssets: vi.fn().mockResolvedValue(undefined),
    writeCoverAsset: vi.fn(async (_key: string, blob: Blob) => ({ backend: 'opfs', mimeType: blob.type, size: blob.size, updatedAt: 1 })),
}));

// test/unit/cache/androidCacheBudget.test.ts
// Real IndexedDB transactions cover shared ceilings, recency, migration and external cover cleanup.
const setBytes = (bytes: number) => useAudioSettingsStore.setState({ mediaCacheLimitGb: bytes / 1024 ** 3 });
const write = (key: string, bytes: number) => putAndroidCacheEntry('media_cache', key, new Blob([new Uint8Array(bytes)]));
const keys = async () => (await appDatabase.media_cache.toCollection().primaryKeys()).sort();

beforeEach(async () => {
    for (const table of ['api_cache', 'user_cache', 'media_cache', 'metadata_cache', 'cache_budget']) await appDatabase.table(table).clear();
    vi.clearAllMocks();
    setBytes(1000);
});
afterEach(() => vi.restoreAllMocks());

describe('Android shared cache ceiling', () => {
    it('counts UTF-8 metadata and cover files but protects user-selected assets and account data', () => {
        expect(cacheEntryBytes('中')).toBe(5);
        expect(cacheEntryBytes({ backend: 'opfs', size: 500 })).toBeGreaterThan(500);
        for (const key of ['audio_x', 'cover_x', 'lyric_x', 'automix_profile_x', 'user_playlists']) expect(isBudgetedCacheKey(key)).toBe(true);
        for (const key of ['user_profile', 'video_layer_local_file', 'theme_x', 'dual_theme_x', 'local_playlists', 'uploaded_lyrics_font', 'last_song']) expect(isBudgetedCacheKey(key)).toBe(false);
    });
    it('indexes legacy caches on startup, retains access history and protects local content', async () => {
        setBytes(500);
        await appDatabase.media_cache.bulkPut([
            { key: 'audio_a', data: new Blob([new Uint8Array(400)]), timestamp: 1 },
            { key: 'audio_b', data: new Blob([new Uint8Array(400)]), timestamp: 2 },
        ]);
        await appDatabase.cache_budget.put({ key: 'audio_a', table: 'media_cache', bytes: 400, accessedAt: 4 });
        await appDatabase.metadata_cache.put({ key: 'lyric_a', data: 'lyrics', timestamp: 5 });
        await appDatabase.api_cache.put({ key: 'video_layer_local_file', data: new Blob(['personal']), timestamp: 0 });
        await enforceAndroidCacheBudget();
        expect(await keys()).toEqual(['audio_a']);
        expect(await appDatabase.metadata_cache.get('lyric_a')).toBeDefined();
        expect(await appDatabase.api_cache.get('video_layer_local_file')).toBeDefined();
    });
    it('serializes concurrent writers so the combined cache stays bounded', async () => {
        await Promise.all([write('audio_a', 600), write('audio_b', 600), write('audio_c', 600)]);
        expect(await keys()).toEqual(['audio_c']);
    });
    it('uses reads for LRU and trims immediately after lowering the limit', async () => {
        const clock = vi.spyOn(Date, 'now');
        clock.mockReturnValue(1000); await write('audio_a', 400);
        clock.mockReturnValue(2000); await write('audio_b', 400);
        clock.mockReturnValue(4000); await touchAndroidCacheEntry('audio_a');
        clock.mockReturnValue(5000); await write('audio_c', 400);
        expect(await keys()).toEqual(['audio_a', 'audio_c']);
        setBytes(400); await enforceAndroidCacheBudget();
        expect(await keys()).toEqual(['audio_c']);
    });
    it('accepts unlimited caching, skips oversize files and counts replacements once', async () => {
        await write('audio_a', 600);
        await write('audio_a', 900);
        expect((await appDatabase.cache_budget.get('audio_a'))?.bytes).toBe(900);
        await write('audio_oversize', 1200);
        expect(await keys()).toEqual(['audio_a']);
        setBytes(0);
        await write('audio_large', 2000);
        expect(await keys()).toEqual(['audio_a', 'audio_large']);
    });
    it('evicts physical cover files together with descriptors while preserving user content', async () => {
        await appDatabase.api_cache.put({ key: 'video_layer_local_file', data: new Blob(['user video']), timestamp: 0 });
        await putAndroidCover('cover_a', new Blob([new Uint8Array(700)]));
        await write('audio_b', 800);
        expect(await keys()).toEqual(['audio_b']);
        expect(removeCoverAsset).toHaveBeenCalledWith('cover_a');
        expect(await appDatabase.api_cache.get('video_layer_local_file')).toBeDefined();
    });
    it('does not hold deleted entries against the next write', async () => {
        await write('audio_a', 600);
        await appDatabase.media_cache.delete('audio_a');
        await write('audio_b', 600);
        expect(await keys()).toEqual(['audio_b']);
    });
    it('propagates failed cache writes instead of claiming success', async () => {
        const put = vi.spyOn(appDatabase, 'transaction').mockRejectedValueOnce(new DOMException('Full', 'QuotaExceededError'));
        await expect(write('audio_a', 500)).rejects.toThrow('Full');
        put.mockRestore();
        await write('audio_b', 600);
        expect(await keys()).toEqual(['audio_b']);
    });
});

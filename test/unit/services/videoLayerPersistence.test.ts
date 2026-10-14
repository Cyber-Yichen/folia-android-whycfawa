import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { appDatabase } from '@/services/appDatabase';
import {
    VIDEO_LAYER_FILE_BLOB_KEY,
    clearCacheTables,
    putCacheEntry,
    readCacheEntry,
} from '@/services/repositories/cacheRepository';
import {
    MAX_VIDEO_LAYER_FILE_BYTES,
    clearVideoLayerFileBlob,
    loadVideoLayerFileBlob,
    saveVideoLayerFileBlob,
} from '@/services/videoLayerFile';

// test/unit/services/videoLayerPersistence.test.ts
// 安卓 WebView 没有 File System Access API，视频层的本地视频改存 IndexedDB 的整份 Blob。
// 它是用户显式选的资源而不是可重建的缓存，所以「清除缓存」必须跳过它。

const clearAll = () => Promise.all([
    appDatabase.api_cache.clear(),
    appDatabase.media_cache.clear(),
    appDatabase.metadata_cache.clear(),
    appDatabase.user_cache.clear(),
]);

describe('video layer local file persistence', () => {
    beforeEach(clearAll);

    it('round-trips the picked video through IndexedDB', async () => {
        const file = new File(['video-bytes'], 'loop.mp4', { type: 'video/mp4' });

        await expect(saveVideoLayerFileBlob(file)).resolves.toBe(true);

        const restored = await loadVideoLayerFileBlob();
        expect(restored?.name).toBe('loop.mp4');
        expect(restored?.type).toBe('video/mp4');
        expect(restored ? await restored.text() : null).toBe('video-bytes');

        await clearVideoLayerFileBlob();
        await expect(loadVideoLayerFileBlob()).resolves.toBeNull();
    });

    it('survives the clear-cache button', async () => {
        await putCacheEntry('lyric_some-track', { lines: [] });
        await putCacheEntry(VIDEO_LAYER_FILE_BLOB_KEY, new File(['x'], 'loop.mp4', { type: 'video/mp4' }));

        await clearCacheTables();

        // 普通缓存被清掉，用户选的视频留下。
        expect(await readCacheEntry('lyric_some-track')).toBeNull();
        expect(await loadVideoLayerFileBlob()).not.toBeNull();
    });

    it('caps a pick at 200MB', () => {
        expect(MAX_VIDEO_LAYER_FILE_BYTES).toBe(200 * 1024 * 1024);
    });
});

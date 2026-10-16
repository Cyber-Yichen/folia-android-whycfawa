import { afterEach, describe, expect, it, vi } from 'vitest';

// test/unit/nativeBridge/qqSongLike.test.ts
//
// 现场「收藏添加失败」：桥只回 __foliaBridgeError，因为写入路径全被 catch (_) {} 吞掉、
// 而且发的是网页 comm（客户端模块只认 android comm，电台那条已经验证过）。
// 这里按参考实现的次序锁住：身份核对 → 读关系 → 写 → 再读确认，并检查线上形态。

const COOKIE = [
    'uin=o002774749',
    'qqmusic_uin=o002774749',
    'str_musicid=3379082',
    'qm_keyst=MUSICKEY',
    'qqmusic_key=MUSICKEY',
    'login_type=1',
].join('; ');

const SONG_ID = 123456;
const SONG_MID = 'SONGMID';

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
});

type StubOptions = {
    /** 写入是否被上游接受（retCode 非 0 表示拒绝）。 */
    acceptWrite?: boolean;
    /** 若给出，则写入后关系读数停在这个值，用来模拟「写了但没生效」。 */
    stuckAt?: boolean;
    /** 账号真实的「我喜欢」目录号（不填表示 GetPlaylistByUin 没给出来）。 */
    likedDirId?: number;
};

const installFetchStub = (options: StubOptions = {}) => {
    const calls: Array<{ module: string; method: string; comm: Record<string, unknown>; param: Record<string, unknown>; cookie: string; ua: string }> = [];
    let liked = false;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
        const payload = JSON.parse(String(init?.body || '{}'));
        const module = String(payload?.req_0?.module || '');
        const method = String(payload?.req_0?.method || '');
        const headers = (init?.headers || {}) as Record<string, string>;
        calls.push({ module, method, comm: payload.comm || {}, param: payload?.req_0?.param || {}, cookie: headers.Cookie || '', ua: headers['User-Agent'] || '' });

        if (module === 'music.pf_song_detail_svr') {
            return jsonResponse({ code: 0, req_0: { code: 0, data: { track_info: { id: SONG_ID, mid: SONG_MID } } } });
        }
        if (module === 'music.getSession.session') {
            return jsonResponse({ code: 0, req_0: { code: 0, data: { session: { uid: 'DEVICE-UID', sid: 'DEVICE-SID', vkey: 0 } } } });
        }
        if (module === 'music.musicasset.PlaylistBaseRead') {
            return jsonResponse({
                code: 0,
                req_0: { code: 0, data: { v_playlist: options.likedDirId ? [{ dirId: options.likedDirId, dirName: '我喜欢' }] : [] } },
            });
        }
        if (module === 'music.musicasset.SongFavRead') {
            return jsonResponse({ code: 0, req_0: { code: 0, data: { m_fan: { [SONG_MID]: liked } } } });
        }
        if (module === 'music.musicasset.PlaylistDetailWrite') {
            if (options.acceptWrite !== false && !options.stuckAt) liked = method === 'AddSonglist';
            return jsonResponse({
                code: 0,
                req_0: {
                    code: 0,
                    data: options.acceptWrite === false
                        ? { retCode: -1 }
                        : { retCode: 0, result: { dirId: 201, tid: 1 } },
                },
            });
        }
        return jsonResponse({ code: 0, req_0: { code: 0, data: {} } });
    }));
    // 登录态探测（VIP 查询、资料页）也会走 fetch，断言只看这次改动的写入链路。
    const relevant = () => calls.filter(call => (
        call.module === 'music.pf_song_detail_svr'
        || call.module === 'music.musicasset.SongFavRead'
        || call.module === 'music.musicasset.PlaylistDetailWrite'
        || call.module === 'music.musicasset.PlaylistBaseRead'
        || call.module === 'music.getSession.session'
    ));
    return relevant;
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
});

const loadHandler = async () => (await import('@/nativeBridge/api/qq.js')).handleQQSongLike;

describe('QQ song like', () => {
    it('follows identity → read → write → verify', async () => {
        const calls = installFetchStub();
        const like = await loadHandler();
        const result = await like(SONG_ID, SONG_MID, true, COOKIE);

        expect(result).toMatchObject({ loggedIn: true, liked: true, via: 'PlaylistDetailWrite' });
        expect(calls().map(call => `${call.module}.${call.method}`)).toEqual([
            'music.pf_song_detail_svr.get_song_detail_yqq',
            'music.musicasset.SongFavRead.IsSongFanByMid',
            // 写入前先问账号真实的「我喜欢」目录号。
            'music.musicasset.PlaylistBaseRead.GetPlaylistByUin',
            // 再取 android 会话（参考实现的 refreshAndroidSession）。
            'music.getSession.session.GetSession',
            'music.musicasset.PlaylistDetailWrite.AddSonglist',
            'music.musicasset.SongFavRead.IsSongFanByMid',
        ]);
    });

    // 歌单写入一直是查账号真实目录号再写的，唯独红心写死 201；两者不一致时按账号的来。
    it('writes to the account own liked dir when it is not 201', async () => {
        const calls = installFetchStub({ likedDirId: 5 });
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        const writes = calls().filter(call => call.module === 'music.musicasset.PlaylistDetailWrite');
        expect(writes.length).toBeGreaterThan(0);
        expect(writes[0].param.dirId).toBe(5);
    });

    it('falls back to 201 when the account does not report a liked dir', async () => {
        const calls = installFetchStub();
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        const writes = calls().filter(call => call.module === 'music.musicasset.PlaylistDetailWrite');
        expect(writes[0].param.dirId).toBe(201);
    });

    // 现场报告里 identity 与 read 都是 code=0，只有 write 回 500026 —— 参考实现是带着
    // android 会话（GetSession 拿到的 uid/sid）发写入的，我们以前两个都没有。
    it('opens the android session before the write and sends uid/sid with it', async () => {
        const calls = installFetchStub();
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        const sessionIndex = calls().findIndex(call => call.module === 'music.getSession.session');
        const writeIndex = calls().findIndex(call => call.module === 'music.musicasset.PlaylistDetailWrite');
        expect(sessionIndex).toBeGreaterThanOrEqual(0);
        expect(writeIndex).toBeGreaterThan(sessionIndex);

        const write = calls()[writeIndex];
        expect(write.comm.uid).toBe('DEVICE-UID');
        expect(write.comm.sid).toBe('DEVICE-SID');
        // 取会话那一步是匿名 comm：不带凭据、也不带 tmeLoginType。
        const sessionCall = calls()[sessionIndex];
        expect(sessionCall.param).toEqual({ uid: '', vkey: 0, caller: 0 });
        expect(sessionCall.comm.authst).toBeUndefined();
        expect(sessionCall.comm.tmeLoginType).toBeUndefined();
    });

    it('sends the android comm, the QQMusic UA and the rebuilt credential cookie', async () => {
        const calls = installFetchStub();
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        // 取会话那一步是匿名 comm（下面单独断言），这里只看带凭据的调用。
        const credentialCalls = calls().filter(call => call.module !== 'music.getSession.session');
        expect(credentialCalls.length).toBeGreaterThan(0);
        for (const call of credentialCalls) {
            expect(call.comm.ct).toBe(11);
            expect(call.comm.tmeAppID).toBe('qqmusic');
            expect(call.comm.qq).toBe('3379082');
            expect(call.comm.uin).toBeUndefined();
            expect(call.ua).toBe('QQMusic 14090008(android 10)');
            expect(call.cookie).toBe('uin=3379082; qqmusic_uin=3379082; qm_keyst=MUSICKEY; qqmusic_key=MUSICKEY');
        }
    });

    it('does not write when the song is already in the wanted state', async () => {
        const calls = installFetchStub();
        const like = await loadHandler();
        // 先收藏（写入生效），再收藏一次：第二次读完就该直接返回。
        await like(SONG_ID, SONG_MID, true, COOKIE);
        const afterFirst = calls().length;
        const result = await like(SONG_ID, SONG_MID, true, COOKIE);

        expect(result).toMatchObject({ liked: true, via: 'already' });
        expect(calls().slice(afterFirst).map(call => call.module)).toEqual([
            'music.pf_song_detail_svr',
            'music.musicasset.SongFavRead',
        ]);
    });

    it('reports the failing step when the upstream rejects the write', async () => {
        installFetchStub({ acceptWrite: false });
        const like = await loadHandler();
        const result = await like(SONG_ID, SONG_MID, true, COOKIE);

        expect(result).toMatchObject({ loggedIn: true, liked: false });
        expect(result.error).toBe('QQ_LIKE_FAILED');
        // 关键：不再是「不知道卡在哪」——步骤与上游形态都带出来了。
        expect(result.step).toBe('write-rejected');
        expect(result.retCode).toBe(-1);
    });

    it('does not claim success when the write did not change the relation', async () => {
        installFetchStub({ stuckAt: true });
        const like = await loadHandler();
        const result = await like(SONG_ID, SONG_MID, true, COOKIE);

        expect(result.liked).toBe(false);
        expect(result.step).toBe('verify-mismatch');
    });

    it('refuses a mid that does not match the numeric id', async () => {
        const calls = installFetchStub();
        const like = await loadHandler();
        const result = await like(SONG_ID, 'OTHERMID', true, COOKIE);

        expect(result.step).toBe('identity-mismatch');
        // 对不上就不写。
        expect(calls().map(call => call.module)).toEqual(['music.pf_song_detail_svr']);
    });

    it('requires a session', async () => {
        const like = await loadHandler();
        const result = await like(SONG_ID, SONG_MID, true, 'str_musicid=3379082');
        expect(result).toMatchObject({ error: 'LOGIN_REQUIRED', loggedIn: false });
    });
});

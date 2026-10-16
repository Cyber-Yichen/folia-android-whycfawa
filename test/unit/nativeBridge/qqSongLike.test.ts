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
    const calls: Array<{ url: string; module: string; method: string; comm: Record<string, unknown>; param: Record<string, unknown>; cookie: string; ua: string }> = [];
    let liked = false;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
        const payload = JSON.parse(String(init?.body || '{}'));
        const module = String(payload?.req_0?.module || '');
        const method = String(payload?.req_0?.method || '');
        const headers = (init?.headers || {}) as Record<string, string>;
        calls.push({ url: String(url), module, method, comm: payload.comm || {}, param: payload?.req_0?.param || {}, cookie: headers.Cookie || '', ua: headers['User-Agent'] || '' });

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
            // 读当前关系
            'music.musicasset.SongFavRead.IsSongFanByMid',
            // 先问账号真实的「我喜欢」目录号，再写（legacy CGI 现在是最后才试）
            'music.musicasset.PlaylistBaseRead.GetPlaylistByUin',
            'music.musicasset.PlaylistDetailWrite.AddSonglist',
            // 写完再读确认
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

    // 现场报告里 identity 与 read 都是 code=0，只有 write 回 500026；而一个**现代可用**的
    // 公开实现（baoozak/qqmusic-mcp）写入时带的是 g_tk（放 query 里）+ 网页形态的 comm
    // {ct:24, cv:0, uin}。这两样我们以前一个都没有 —— 尤其是写入从没带过 g_tk。
    it('sends the write with g_tk in the query and the web comm', async () => {
        const calls = installFetchStub();
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        const write = calls().find(call => call.module === 'music.musicasset.PlaylistDetailWrite');
        expect(write).toBeDefined();
        expect(write!.url).toContain('format=json');
        expect(write!.url).toContain('g_tk=5381');   // 会话里没有 skey/p_skey 时就是这个值
        expect(write!.comm).toMatchObject({ ct: 24, cv: 0, uin: '2774749' });
        // 网页 comm 不带 android 那套设备/tmeAppID 字段。
        expect(write!.comm.tmeAppID).toBeUndefined();
        expect(write!.comm.QIMEI).toBeUndefined();
    });

    // g_tk 是 QQ 网页 CGI 的 CSRF token，算法只认 skey/p_skey。以前拿 musickey（qm_keyst）
    // 去算，得到的是错的 g_tk，CGI 直接回 403；没有 skey 时该用 5381（公开实现就固定用它）。
    it('sends the legacy CGI with g_tk=5381 when the session has no skey', async () => {
        // legacy 现在是最后一步：两个 musicasset 端点都被拒之后才走到它。
        installFetchStub({ acceptWrite: false });
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        // legacy 走 c.y.qq.com（不在 relevant 过滤里），直接看 fetch 的实参。
        const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
        const legacy = urls.find(url => url.includes('fcg_music_add2songdir'));
        expect(legacy).toBeDefined();
        expect(legacy).toContain('g_tk=5381');
        expect(legacy).toContain('hostUin=0');
        expect(legacy).toContain('typelist=13');
    });

    // 写入的 Cookie 头是完整会话（网页 comm 靠它认证，不是靠 comm.authst）。
    it('sends the QQMusic UA and the full session cookie on writes', async () => {
        const calls = installFetchStub();
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        const write = calls().find(call => call.module === 'music.musicasset.PlaylistDetailWrite');
        expect(write).toBeDefined();
        expect(write!.ua).toContain('Chrome/124');
        expect(write!.cookie).toContain('qm_keyst=MUSICKEY');
        expect(write!.cookie).toContain('uin=');
        expect(write!.comm.authst).toBeUndefined();
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

    // 80105 已经把「字段缺失」排除掉了（凭证、设备、g_tk、网页 comm 全部对齐过），
    // 剩下的可能只有「不同实现形状不同」。所以加收藏失败时一次把余下候选形状全试完，
    // 用户点一次红心，报告里就带上所有原始回码 —— 不再一轮装一个包试一种。
    it('sweeps the remaining write shapes when the like is rejected', async () => {
        installFetchStub({ acceptWrite: false });
        const { getLibraryTraceLines } = await import('@/nativeBridge/api/libraryTrace.js');
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        const sweeps = getLibraryTraceLines().filter(line => line.includes('sweep:attempt'));
        expect(sweeps.length).toBe(5);
        // 每个形状都要带上游回码，否则这一趟等于白跑。
        for (const line of sweeps) expect(line).toMatch(/code=/);
    });

    // 每个会话只跑一次，避免用户连点几下就变成几十次写入。
    it('runs the sweep at most once per session', async () => {
        installFetchStub({ acceptWrite: false });
        const { getLibraryTraceLines, resetLibraryTrace } = await import('@/nativeBridge/api/libraryTrace.js');
        const like = await loadHandler();
        await like(SONG_ID, SONG_MID, true, COOKIE);
        resetLibraryTrace();
        await like(SONG_ID, SONG_MID, true, COOKIE);

        expect(getLibraryTraceLines().filter(line => line.includes('sweep:attempt')).length).toBe(0);
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

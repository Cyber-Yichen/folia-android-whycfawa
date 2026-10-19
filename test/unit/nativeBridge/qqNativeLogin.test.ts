import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// test/unit/nativeBridge/qqNativeLogin.test.ts
const mocks = vi.hoisted(() => ({ call: vi.fn(), listener: vi.fn(), save: vi.fn(), write: vi.fn(), close: vi.fn() }));
vi.mock('@/nativeBridge/api/qq.js', () => ({ qqAnonymousMusicuCall: mocks.call }));
vi.mock('@/nativeBridge/api/qq-mqtt.js', () => ({ createQrMqttListener: mocks.listener }));
vi.mock('@/nativeBridge/api/cookies.js', () => ({ saveProviderCookie: mocks.save }));
vi.mock('@/nativeBridge/api/qq-login-qr.js', () => ({
    buildLoginSession: (cookie: string) => ({ cookie, cookieList: cookie.split('; ') }),
    writeSessionCookies: mocks.write,
}));
vi.mock('@/nativeBridge/api/qrLoginTrace.js', () => ({ noteQrLoginStep: vi.fn() }));
import { qqNativeCreateLoginQr, qqNativeCheckLoginQr, qqNativeCancelLoginQr } from '@/nativeBridge/api/qq-native-login.js';

let emit: (event: unknown) => void;
const authorize = (type = '6') => emit({ type: 'cookies', payload: { cookies: {
    qqmusic_uin: { value: '1234567890123456789' }, qqmusic_key: { value: 'token' }, tmeLoginType: { value: type },
} } });
beforeEach(() => {
    vi.clearAllMocks();
    mocks.call.mockImplementation(async (_module: string, method: string) => method === 'CreateQRCode'
        ? { ok: true, data: { qrcodeID: 'qr-id', qrcode: 'png' } }
        : { ok: true, data: { musickey: 'key', str_musicid: '1234567890123456789' } });
    mocks.listener.mockImplementation((_id, callback) => {
        emit = callback;
        return { ready: Promise.resolve(), done: Promise.resolve(), close: mocks.close };
    });
});
afterEach(() => qqNativeCancelLoginQr('qr-id'));
describe('native unified login', () => {
    it.each([['6', 'login_type=1'], ['1', 'login_type=2']])('persists account type %s after a real exchange', async (type, expected) => {
        await qqNativeCreateLoginQr('qqmusic');
        authorize(type);
        await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
        const cookie = mocks.save.mock.calls[0][1];
        expect(cookie).toContain(expected);
        expect(cookie).toContain('str_musicid=1234567890123456789');
        expect(cookie.includes('wxuin=')).toBe(type === '1');
        expect(mocks.call).toHaveBeenLastCalledWith('music.login.LoginServer', 'Login',
            { musicid: '1234567890123456789', qrCodeID: 'qr-id', token: 'token' }, { tmeLoginType: 6 }, { exactLogin: true });
        expect(await qqNativeCheckLoginQr('qr-id')).toMatchObject({ isOk: true, loggedIn: true });
        expect(mocks.close).toHaveBeenCalled();
    });
    it('uses the exact callback ID when exchange ID placeholders are zero', async () => {
        await qqNativeCreateLoginQr('qqmusic');
        mocks.call.mockResolvedValueOnce({ ok: true, data: { musickey: 'key', str_musicid: '0', musicid: 0, loginType: 1 } });
        authorize('1');
        await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
        expect(mocks.save.mock.calls[0][1]).toContain('wxuin=1234567890123456789');
    });
    it('does not exchange or persist the same authorization twice', async () => {
        await qqNativeCreateLoginQr('qqmusic');
        authorize(); authorize();
        await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
        expect(mocks.call).toHaveBeenCalledTimes(2);
    });
    it('discards an exchange that finishes after cancellation', async () => {
        let finish: (result: unknown) => void = () => {};
        await qqNativeCreateLoginQr('qqmusic');
        mocks.call.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        authorize(); qqNativeCancelLoginQr('qr-id');
        finish({ ok: true, data: { musickey: 'late' } });
        await Promise.resolve(); await Promise.resolve();
        expect(mocks.save).not.toHaveBeenCalled();
        expect(mocks.write).not.toHaveBeenCalled();
        expect(await qqNativeCheckLoginQr('qr-id')).toMatchObject({ refresh: true });
    });
    it('closes and removes a session when subscription fails', async () => {
        mocks.listener.mockReturnValue({ ready: Promise.reject(new Error('offline')), done: Promise.resolve(), close: mocks.close });
        await expect(qqNativeCreateLoginQr('qqmusic')).rejects.toThrow('offline');
        expect(mocks.close).toHaveBeenCalled();
        expect(await qqNativeCheckLoginQr('qr-id')).toMatchObject({ refresh: true });
    });
    it('does not report a failed credential exchange as success', async () => {
        await qqNativeCreateLoginQr('qqmusic');
        mocks.call.mockResolvedValueOnce({ ok: false, code: 50006 });
        authorize();
        await vi.waitFor(async () => expect(await qqNativeCheckLoginQr('qr-id')).toMatchObject({ status: 'error' }));
        expect(mocks.save).not.toHaveBeenCalled();
    });
});

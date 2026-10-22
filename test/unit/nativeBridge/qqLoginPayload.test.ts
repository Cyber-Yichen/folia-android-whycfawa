import { describe, expect, it } from 'vitest';
import { parseLoginResponse, stringifyLoginPayload } from '@/nativeBridge/api/qq-login-payload.js';

// test/unit/nativeBridge/qqLoginPayload.test.ts
describe('QQ login account precision', () => {
    it('sends a 19-digit ID as an exact JSON integer, not a quoted or rounded value', () => {
        const body = stringifyLoginPayload({ comm: {}, req_0: { module: 'auth', method: 'Login',
            param: { musicid: '1234567890123456789', token: 'a"b', qrCodeID: 'id' } } });
        expect(body).toContain('"musicid":1234567890123456789');
        expect(JSON.parse(body).req_0.param.token).toBe('a"b');
    });
    it('rejects invalid account IDs instead of injecting JSON', () => {
        for (const musicid of ['1,"token":"x"', '0', '-1', '1e19', '12345678901234567890']) {
            expect(() => stringifyLoginPayload({ comm: {}, req_0: { param: { musicid } } })).toThrow();
        }
    });
    it('preserves unsafe response integers and leaves strings and other JSON numbers intact', () => {
        const value = parseLoginResponse('{"musicid":1234567890123456789,"literal":"musicid:1234567890123456789","safe":42,"float":1.25,"exponent":1e3}');
        expect(value).toEqual({ musicid: '1234567890123456789', literal: 'musicid:1234567890123456789',
            safe: 42, float: 1.25, exponent: 1000 });
    });
});

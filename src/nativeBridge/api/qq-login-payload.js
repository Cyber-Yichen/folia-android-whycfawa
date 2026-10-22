// src/nativeBridge/api/qq-login-payload.js
// QQ Music accepts account IDs as JSON integers, including 19-digit WeChat IDs.
export function stringifyLoginPayload(payload) {
  const request = payload.req_0;
  const id = String(request.param.musicid);
  if (!/^[1-9]\d{0,18}$/.test(id)) throw new Error('Invalid music account ID');
  const fields = Object.entries(request.param).map(([key, value]) =>
    JSON.stringify(key) + ':' + (key === 'musicid' ? id : JSON.stringify(value)));
  return '{"comm":' + JSON.stringify(payload.comm) + ',"req_0":{"module":' +
    JSON.stringify(request.module) + ',"method":' + JSON.stringify(request.method) +
    ',"param":{' + fields.join(',') + '}}}';
}

export function parseLoginResponse(text) {
  // Match whole strings first, so digits inside quoted values are never rewritten.
  const safe = text.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token => {
    if (/^-?\d{16,}$/.test(token) && !Number.isSafeInteger(Number(token))) return JSON.stringify(token);
    return token;
  });
  return JSON.parse(safe);
}

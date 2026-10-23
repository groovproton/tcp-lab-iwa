// Browser-native IWA TCP probe. A socket is never opened automatically.
export function capabilities() {
  return {
    TCPSocket: typeof globalThis.TCPSocket,
    UDPSocket: typeof globalThis.UDPSocket,
    crossOriginIsolated: String(globalThis.crossOriginIsolated),
    secureContext: String(globalThis.isSecureContext),
    origin: globalThis.location?.origin ?? 'unknown',
  };
}

export function validateEndpoint(host, port) {
  const hostname = String(host).trim();
  const p = Number(port);
  if (!hostname || /[\s/:]/.test(hostname)) throw new Error('Enter a hostname or IPv4 address without scheme or port');
  if (!Number.isInteger(p) || p < 1 || p > 65535) throw new Error('Port must be 1–65535');
  return { hostname, port: p };
}

export async function probeTcp(host, port, timeoutMs = 7000) {
  const endpoint = validateEndpoint(host, port);
  if (typeof globalThis.TCPSocket !== 'function') throw new Error('TCPSocket is unavailable in this context');
  const started = performance.now();
  let socket;
  let timeout;
  try {
    socket = new globalThis.TCPSocket(endpoint.hostname, endpoint.port);
    const opened = socket.opened;
    // Timeout rejects the UI operation; close the socket even if open later resolves.
    const result = await Promise.race([
      opened,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(`TCP timeout after ${timeoutMs} ms`)), timeoutMs); }),
    ]);
    return { endpoint, elapsedMs: Math.round(performance.now() - started), details: Object.keys(result || {}) };
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    if (socket) {
      try { await socket.close(); } catch { /* Close best effort, including failed opens. */ }
    }
  }
}

const HTTP_REQUEST_LIMIT = 4096;
const HTTP_RESPONSE_LIMIT = 64 * 1024;
const HTTP_PREVIEW_LIMIT = 2048;

function withDeadline(promise, deadline, message) {
  const remaining = Math.max(0, deadline - performance.now());
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), remaining); }),
  ]).finally(() => clearTimeout(timer));
}

export async function httpRoundTrip(host, port, timeoutMs = 7000) {
  const endpoint = validateEndpoint(host, port);
  if (typeof globalThis.TCPSocket !== 'function') throw new Error('TCPSocket is unavailable in this context');
  const request = `GET / HTTP/1.1\r\nHost: ${endpoint.hostname}\r\nConnection: close\r\n\r\n`;
  const requestBytes = new TextEncoder().encode(request);
  if (requestBytes.byteLength > HTTP_REQUEST_LIMIT) throw new Error('HTTP request exceeds safety limit');
  const started = performance.now();
  const deadline = started + timeoutMs;
  let socket;
  let reader;
  let writer;
  const chunks = [];
  let totalBytes = 0;
  try {
    socket = new globalThis.TCPSocket(endpoint.hostname, endpoint.port);
    const { readable, writable } = await withDeadline(socket.opened, deadline, `HTTP connect timeout after ${timeoutMs} ms`);
    writer = writable.getWriter();
    await withDeadline(writer.write(requestBytes), deadline, `HTTP write timeout after ${timeoutMs} ms`);
    writer.releaseLock();
    writer = undefined;
    reader = readable.getReader();
    while (totalBytes < HTTP_RESPONSE_LIMIT) {
      const { value, done } = await withDeadline(reader.read(), deadline, `HTTP read timeout after ${timeoutMs} ms`);
      if (done) break;
      if (!value?.byteLength) continue;
      const remaining = HTTP_RESPONSE_LIMIT - totalBytes;
      const chunk = value.slice(0, remaining);
      chunks.push(chunk);
      totalBytes += chunk.byteLength;
    }
    const responseBytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) { responseBytes.set(chunk, offset); offset += chunk.byteLength; }
    const preview = new TextDecoder('utf-8', { fatal: false }).decode(responseBytes).slice(0, HTTP_PREVIEW_LIMIT);
    const statusLine = preview.split(/\r?\n/, 1)[0] || '(no HTTP status line)';
    return { endpoint, statusLine, bytesRead: totalBytes, elapsedMs: Math.round(performance.now() - started), preview };
  } finally {
    if (reader) {
      try { await reader.cancel(); } catch { /* best effort */ }
      try { reader.releaseLock(); } catch { /* already released */ }
    }
    if (writer) {
      try { writer.releaseLock(); } catch { /* already released */ }
    }
    if (socket) {
      try { await socket.close(); } catch { /* best effort */ }
    }
  }
}

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

// Phase 3A opt-in adapter. This module is intentionally not imported by the
// default UI until the engine has passed installed-IWA testing.
import { makeTLSClient, setCryptoImplementation, webcryptoCrypto } from './tls-engine.js';
import { validateEndpoint } from './tcp.js';

const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_PREVIEW_BYTES = 2048;

function deadline(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
}

export async function httpsRoundTrip(host = 'example.com', port = 443, timeoutMs = 10000) {
  const endpoint = validateEndpoint(host, port);
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto is unavailable; TLS engine cannot start');
  setCryptoImplementation(webcryptoCrypto);
  const started = performance.now();
  const socket = new globalThis.TCPSocket(endpoint.hostname, endpoint.port);
  let reader;
  let writer;
  let tls;
  let totalBytes = 0;
  const response = [];
  let responseResolve;
  let responseReject;
  const responseReady = new Promise((resolve, reject) => { responseResolve = resolve; responseReject = reject; });
  try {
    const { readable, writable } = await deadline(socket.opened, timeoutMs, 'TLS connect timeout');
    writer = writable.getWriter();
    reader = readable.getReader();
    tls = makeTLSClient({
      host: endpoint.hostname,
      verifyServerCertificate: true,
      async write({ header, content }) {
        await writer.write(header);
        if (content?.byteLength) await writer.write(content);
      },
      onHandshake() {
        const request = `GET / HTTP/1.1\r\nHost: ${endpoint.hostname}\r\nConnection: close\r\n\r\n`;
        tls.write(new TextEncoder().encode(request));
      },
      onApplicationData(bytes) {
        if (totalBytes >= MAX_RESPONSE_BYTES) return;
        const chunk = bytes.slice(0, MAX_RESPONSE_BYTES - totalBytes);
        response.push(chunk);
        totalBytes += chunk.byteLength;
        const preview = new TextDecoder().decode(Uint8Array.from(response.flatMap((part) => [...part]))).slice(0, MAX_PREVIEW_BYTES);
        if (/^HTTP\/\d(?:\.\d)? \d{3} /m.test(preview)) responseResolve({ preview, bytesRead: totalBytes });
      },
      onTlsEnd(error) { if (error) responseReject(error); },
    });
    const pump = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value?.byteLength) tls.handleReceivedBytes(value);
      }
    })();
    pump.catch(responseReject);
    const result = await deadline(responseReady, timeoutMs, 'TLS handshake/read timeout');
    return { endpoint, statusLine: result.preview.split(/\r?\n/, 1)[0], bytesRead: result.bytesRead, elapsedMs: Math.round(performance.now() - started), tls: 'TLS 1.2/1.3 engine; negotiated version reported by engine callback' };
  } finally {
    if (reader) { try { await reader.cancel(); } catch {} try { reader.releaseLock(); } catch {} }
    if (writer) { try { writer.releaseLock(); } catch {} }
    try { await socket.close(); } catch {}
  }
}

import assert from 'node:assert/strict';
import { httpRoundTrip } from '../app/js/tcp.js';

const enc = new TextEncoder();
const sockets = [];

class FakeTCPSocket {
  constructor(host, port, chunks = [], pending = false) {
    this.host = host;
    this.port = port;
    this.closed = false;
    this.writes = [];
    this.readCancelled = false;
    const queue = [...chunks];
    this.readable = new ReadableStream({
      pull: (controller) => {
        if (queue.length) controller.enqueue(queue.shift());
        else if (!pending) controller.close();
      },
      cancel: () => { this.readCancelled = true; },
    });
    this.writable = new WritableStream({ write: (value) => this.writes.push(new Uint8Array(value)) });
    this.opened = Promise.resolve({ readable: this.readable, writable: this.writable });
    sockets.push(this);
  }
  async close() { this.closed = true; }
}

function install(chunks, pending = false) {
  globalThis.TCPSocket = class extends FakeTCPSocket {
    constructor(host, port) { super(host, port, chunks, pending); }
  };
  sockets.length = 0;
}

install([enc.encode('HTTP/1.1 200 OK\r\nContent-Length: 5\r\n'), enc.encode('\r\nhello')]);
const fragmented = await httpRoundTrip('example.com', 80, 200);
assert.equal(fragmented.statusLine, 'HTTP/1.1 200 OK');
assert.equal(fragmented.bytesRead, 43);
assert.equal(sockets[0].writes.length, 1);
assert.match(new TextDecoder().decode(sockets[0].writes[0]), /^GET \/ HTTP\/1\.1\r\nHost: example\.com\r\n/);
assert.equal(sockets[0].closed, true);

install([enc.encode('HTTP/1.1 200 OK\r\n\r\n')], true);
await assert.rejects(() => httpRoundTrip('example.com', 80, 20), /HTTP read timeout/);
assert.equal(sockets[0].closed, true);
assert.equal(sockets[0].readCancelled, true);

install([new Uint8Array(70 * 1024)]);
const bounded = await httpRoundTrip('example.com', 80, 200);
assert.equal(bounded.bytesRead, 64 * 1024);
assert.equal(sockets[0].closed, true);

install([]);
const closed = await httpRoundTrip('example.com', 80, 200);
assert.equal(closed.bytesRead, 0);
assert.equal(closed.statusLine, '(no HTTP status line)');
assert.equal(sockets[0].closed, true);

console.log('test_tcp.mjs: 4 HTTP round-trip scenarios passed');

import http from 'node:http';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import worker from '../dist/server/index.js';
import { openDatabase } from './sqlite-adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(root, 'data'), { recursive: true });
const database = openDatabase(path.join(root, 'data', 'hotel.sqlite'), path.join(root, 'drizzle'));
const env = { DB: database.DB, HOTEL_MANAGER_EMAIL: 'owner@local.invalid' };
const server = http.createServer(async (req, res) => {
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const requestOrigin = req.headers.origin;
    if (requestOrigin && requestOrigin !== base) { res.writeHead(403); res.end('Open the hotel from ' + base); return; }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value && !key.startsWith('oai-')) headers.set(key, String(value));
    // This loopback-only edition belongs to its local operator.
    headers.set('oai-authenticated-user-id', 'local-owner');
    headers.set('oai-authenticated-user-email', env.HOTEL_MANAGER_EMAIL);
    const chunks = []; let length = 0;
    for await (const chunk of req) { length += chunk.length; if (length > 16000) { res.writeHead(413); res.end('Request too large'); return; } chunks.push(chunk); }
    const method = req.method || 'GET';
    const body = method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks);
    const response = await worker.fetch(new Request(new URL(req.url, base), { method, headers, body }), env, {});
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error.message); if (!res.headersSent) res.writeHead(500); res.end('Unable to complete this request.'); }
});
server.on('error', error => { console.error('Could not start the hotel:', error.message); database.close(); process.exitCode = 1; });
server.listen(Number(process.env.SOLENE_PORT || 4173), '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + server.address().port;
  console.log('\nSolène House is running: ' + url + '\nKeep this window open. Press Ctrl+C to stop.\nReservations are stored in data/hotel.sqlite.\n');
  if (process.argv.includes('--open')) {
    const command = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore' }); child.on('error', () => {}); child.unref();
  }
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { database.close(); process.exit(0); }));

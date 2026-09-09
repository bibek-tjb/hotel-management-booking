import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { handleApi, dayNow, validateStay, quoteStay } from '../server/hotel.js';
import { openDatabase } from '../server/sqlite-adapter.mjs';
const migrations = fileURLToPath(new URL('../drizzle', import.meta.url));
const day = n => new Date(Date.parse(dayNow()) + n * 86400000).toISOString().slice(0, 10);
const input = (changes = {}) => ({ roomType: 'deluxe', checkIn: day(1), checkOut: day(3), guests: 2, breakfast: true, guestName: 'Alex Demo', guestEmail: 'alex@example.com', guestPhone: '+91 98765 43210', requests: 'Late arrival', agree: true, requestKey: crypto.randomUUID(), ...changes });
function setup(t) {
  const database = openDatabase(':memory:', migrations); t.after(() => database.close());
  const env = { DB: database.DB, HOTEL_MANAGER_EMAIL: 'manager@example.com' };
  return { database, env, async call(path, body, user = 'guest-a', method = body ? 'POST' : 'GET', email = user === 'manager' ? 'manager@example.com' : user + '@example.com') {
    const headers = { 'content-type': 'application/json', origin: 'https://hotel.test' };
    if (user) { headers['oai-authenticated-user-id'] = user; headers['oai-authenticated-user-email'] = email; }
    const response = await handleApi(new Request('https://hotel.test' + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
    return { status: response.status, data: await response.json() };
  } };
}
test('dates, capacity and room prices are validated on the server', () => {
  assert.match(dayNow(), /^\d{4}-\d{2}-\d{2}$/);
  for (const overrides of [{ checkIn: day(-1) }, { checkOut: day(1) }, { checkOut: day(35) }, { guests: 0 }, { checkIn: '2027-02-30' }]) assert.throws(() => validateStay(input(overrides)));
  assert.throws(() => quoteStay(input({ guests: 3 })));
  const quote = quoteStay(input({ total: 1, nightlyPrice: 1 })); assert.equal(quote.total, 15600); assert.equal(quote.nightlyPrice, 6500);
});
test('confirmation is a saved record and retries cannot create duplicates', async t => {
  const { call, database } = setup(t); const payload = input({ total: 1 });
  const first = await call('/api/bookings', payload); assert.equal(first.status, 201); assert.equal(first.data.booking.total, 15600);
  assert.equal(first.data.booking.status, 'confirmed'); assert.match(first.data.booking.reference, /^SLN-[0-9A-F]{10}$/);
  const retry = await call('/api/bookings', payload); assert.equal(retry.status, 200); assert.equal(retry.data.booking.id, first.data.booking.id);
  assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM hotel_bookings').get().n, 1);
  assert.equal((await call('/api/bookings', { ...payload, guestName: 'Another person' })).status, 409);
  const list = await call('/api/bookings'); assert.equal(list.data.bookings[0].reference, first.data.booking.reference); assert.equal('user_id' in list.data.bookings[0], false);
});
test('overlapping requests cannot oversell inventory and adjacent stays can reuse rooms', async t => {
  const { call } = setup(t);
  const results = await Promise.all(Array.from({ length: 7 }, (_, i) => call('/api/bookings', input({ roomType: 'suite', guests: 3 }), 'guest-' + i)));
  assert.equal(results.filter(r => r.status === 201).length, 4); assert.equal(results.filter(r => r.status === 409).length, 3);
  assert.equal(new Set(results.filter(r => r.status === 201).map(r => r.data.booking.roomNumber)).size, 4);
  const available = await call('/api/availability?' + new URLSearchParams({ checkIn: day(1), checkOut: day(3), guests: 2 })); assert.equal(available.data.rooms.find(r => r.id === 'suite').available, 0);
  assert.equal((await call('/api/bookings', input({ roomType: 'suite', checkIn: day(3), checkOut: day(5) }))).status, 201);
});
test('ownership, management permissions and cancellation protect and release rooms', async t => {
  const { call } = setup(t); const reservation = (await call('/api/bookings', input())).data.booking;
  assert.equal((await call('/api/bookings', undefined, 'guest-b')).data.bookings.length, 0);
  assert.equal((await call('/api/management')).status, 403);
  assert.equal((await call('/api/bookings/' + reservation.id, { status: 'cancelled' }, 'guest-b', 'PATCH')).status, 404);
  assert.equal((await call('/api/bookings/' + reservation.id, { status: 'checked_in' }, 'guest-a', 'PATCH')).status, 403);
  assert.equal((await call('/api/bookings/' + reservation.id, { status: 'cancelled' }, 'guest-a', 'PATCH')).status, 200);
  const available = await call('/api/availability?' + new URLSearchParams({ checkIn: day(1), checkOut: day(3), guests: 2 })); assert.equal(available.data.rooms.find(r => r.id === 'deluxe').available, 12);
  const management = await call('/api/management', undefined, 'manager'); assert.equal(management.status, 200); assert.equal(management.data.summary.active_bookings, 0);
});
test('check-in and checkout follow the reservation lifecycle', async t => {
  const { call } = setup(t); const future = (await call('/api/bookings', input())).data.booking;
  assert.equal((await call('/api/bookings/' + future.id, { status: 'checked_in' }, 'manager', 'PATCH')).status, 409);
  const arrival = (await call('/api/bookings', input({ checkIn: day(0), checkOut: day(1) }))).data.booking;
  assert.equal((await call('/api/bookings/' + arrival.id, { status: 'cancelled' }, 'guest-a', 'PATCH')).status, 409);
  assert.equal((await call('/api/bookings/' + arrival.id, { status: 'checked_in' }, 'manager', 'PATCH')).data.booking.status, 'checked_in');
  assert.equal((await call('/api/bookings/' + arrival.id, { status: 'checked_out' }, 'manager', 'PATCH')).data.booking.status, 'checked_out');
  assert.equal((await call('/api/bookings/' + arrival.id, { status: 'checked_in' }, 'manager', 'PATCH')).status, 409);
});
test('missing authentication, missing database and unsafe origins never confirm a booking', async t => {
  const { call, env } = setup(t); assert.equal((await call('/api/bookings', input(), '')).status, 401);
  const headers = { 'content-type': 'application/json', 'oai-authenticated-user-id': 'guest-a' };
  const missing = await handleApi(new Request('https://hotel.test/api/bookings', { method: 'POST', headers, body: JSON.stringify(input()) }), {}); assert.equal(missing.status, 503); assert.equal((await missing.json()).booking, undefined);
  const unsafe = await handleApi(new Request('https://hotel.test/api/bookings', { method: 'POST', headers: { ...headers, origin: 'https://elsewhere.test' }, body: JSON.stringify(input()) }), env); assert.equal(unsafe.status, 403);
  const malformed = await handleApi(new Request('https://hotel.test/api/bookings', { method: 'POST', headers, body: 'null' }), env); assert.equal(malformed.status, 400);
});
test('verified owner can book with email-only dispatch; missing or unlisted identities stay blocked', async t => {
  const { env, database } = setup(t);
  async function request(path, email, payload, userId) {
    const headers = { 'content-type': 'application/json', origin: 'https://hotel.test' };
    if (email) headers['oai-authenticated-user-email'] = email;
    if (userId) headers['oai-authenticated-user-id'] = userId;
    return handleApi(new Request('https://hotel.test' + path, { method: payload ? 'POST' : 'GET', headers, ...(payload ? { body: JSON.stringify(payload) } : {}) }), env);
  }
  const session = await request('/api/session', 'manager@example.com');
  assert.equal(session.status, 200); assert.equal((await session.json()).isManager, true);
  const payload = input();
  const created = await request('/api/bookings', 'manager@example.com', payload); assert.equal(created.status, 201);
  const saved = (await created.json()).booking;
  const retry = await request('/api/bookings', 'manager@example.com', payload, 'platform-owner');
  assert.equal(retry.status, 200); assert.equal((await retry.json()).booking.id, saved.id);
  const history = await request('/api/bookings', 'manager@example.com', undefined, 'platform-owner');
  assert.equal((await history.json()).bookings[0].id, saved.id);
  assert.equal((await request('/api/management', 'manager@example.com')).status, 200);
  assert.equal((await request('/api/bookings', 'visitor@example.com', input())).status, 401);
  assert.equal((await request('/api/bookings', '', input({ guestEmail: 'manager@example.com' }))).status, 401);
  assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM hotel_bookings').get().n, 1);
});

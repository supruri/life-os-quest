// tests/firebaseDocShape.test.js
// Pins the Firestore document shapes against two external consumers that cannot be imported here:
//   - firebase/firestore.rules      (aigrow-ai-service) — what the browser is ALLOWED to write
//   - aigrow_ai/queue_client.py     (aigrow-ai-service) — what the worker READS back
// A drift in either direction (an extra key, a snake_case name, a raw object instead of a JSON
// string) fails here instead of failing as permission-denied in production.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CorruptUserStateError,
  aiPlanRequestDoc,
  parseUserStateDoc,
  readAiPlanDoc,
  serializeUserState,
  toSession,
} from '../src/firebase/docShape.js'

// --- user_states -------------------------------------------------------------------------------

test('user state round-trips through the JSON-string encoding', () => {
  const state = { completed: { 'v1|w1|mon|reading': true }, memos: {}, profile: { goals: ['exercise'] } }
  const encoded = serializeUserState(state)
  assert.equal(typeof encoded, 'string') // rules: `state is string`
  assert.deepEqual(parseUserStateDoc({ state: encoded }), state)
})

test('user state survives the nested arrays Firestore itself rejects', () => {
  // The reason the blob is a string at all: Firestore forbids directly-nested arrays.
  const state = { schedules: { 'v1|w1': { mon: ['reading', 'workout'] } } }
  assert.deepEqual(parseUserStateDoc({ state: serializeUserState(state) }), state)
})

test('missing document or missing state field reads as "no remote state yet"', () => {
  assert.equal(parseUserStateDoc(null), null)
  assert.equal(parseUserStateDoc(undefined), null)
  assert.equal(parseUserStateDoc({}), null)
})

test('a non-string state field is not treated as state (old map-shaped document)', () => {
  // Guards the snake_case/map-shaped Supabase-era document from being read as valid.
  assert.equal(parseUserStateDoc({ state: { completed: {} } }), null)
})

test('a corrupt blob throws instead of reporting "no remote state" (which would overwrite it)', () => {
  assert.throws(() => parseUserStateDoc({ state: '{not json' }), CorruptUserStateError)
})

// --- ai_plans ----------------------------------------------------------------------------------

const RULE_ALLOWED_KEYS = ['request', 'status', 'result', 'error', 'requestedAt', 'completedAt']
const RULE_REQUIRED_KEYS = ['request', 'status', 'requestedAt']

test('enqueue payload matches the rules key allowlist exactly', () => {
  const doc = aiPlanRequestDoc({ goals: ['exercise'] }, 'SERVER_TS')
  // rules: keys().hasOnly([...]) — no extra key may be present
  for (const key of Object.keys(doc)) assert.ok(RULE_ALLOWED_KEYS.includes(key), `unexpected key: ${key}`)
  // rules: keys().hasAll([...]) — these must be present
  for (const key of RULE_REQUIRED_KEYS) assert.ok(key in doc, `missing required key: ${key}`)
})

test('enqueue payload cannot forge a finished plan', () => {
  const doc = aiPlanRequestDoc({ goals: ['exercise'] }, 'SERVER_TS')
  assert.equal(doc.status, 'pending') // rules: status == 'pending'
  assert.equal(doc.result, null) // rules: get('result', null) == null
  assert.equal(doc.error, null)
  assert.equal(doc.completedAt, null)
})

test('enqueue carries the request map and the injected server timestamp (the worker fence token)', () => {
  const request = { goals: ['exercise'], duration: '6개월' }
  const doc = aiPlanRequestDoc(request, 'SERVER_TS')
  assert.deepEqual(doc.request, request)
  assert.equal(doc.requestedAt, 'SERVER_TS')
})

test('enqueue never sends a user_id field — the document id carries identity', () => {
  // queue_client.fetch_pending reconstructs user_id from doc.id; a user_id key would also break
  // the rules' hasOnly allowlist.
  assert.ok(!('user_id' in aiPlanRequestDoc({}, 'SERVER_TS')))
  assert.ok(!('userId' in aiPlanRequestDoc({}, 'SERVER_TS')))
})

test('enqueue rejects a non-map request instead of failing as permission-denied', () => {
  // rules: request is map
  assert.throws(() => aiPlanRequestDoc(null, 'SERVER_TS'), TypeError)
  assert.throws(() => aiPlanRequestDoc([1, 2], 'SERVER_TS'), TypeError)
  assert.throws(() => aiPlanRequestDoc('goals', 'SERVER_TS'), TypeError)
})

test('reading a plan yields the { status, result, error } row the AI flow consumes', () => {
  const row = readAiPlanDoc({ status: 'done', result: { weeks: [] }, error: null, requestedAt: 1 })
  assert.deepEqual(row, { status: 'done', result: { weeks: [] }, error: null })
})

test('a worker error row carries its message through', () => {
  assert.deepEqual(readAiPlanDoc({ status: 'error', error: 'model_timeout' }), {
    status: 'error',
    result: null,
    error: 'model_timeout',
  })
})

test('no ai_plans document reads as null (no row yet), not as an error row', () => {
  // Replaces the Supabase PGRST116 "no rows" special case; deriveRehydrateAction(null) === 'none'.
  assert.equal(readAiPlanDoc(null), null)
})

// --- session adapter ---------------------------------------------------------------------------

test('a Firebase user is adapted to the { user: { id, email } } shape the UI speaks', () => {
  assert.deepEqual(toSession({ uid: 'abc123', email: 'a@b.com' }), {
    user: { id: 'abc123', email: 'a@b.com' },
  })
})

test('a signed-out user is null, and a user without email still yields a usable id', () => {
  assert.equal(toSession(null), null)
  assert.deepEqual(toSession({ uid: 'abc123' }), { user: { id: 'abc123', email: '' } })
})

// tests/firebaseWithTimeout.test.js
// The AI flow only reacts to a SETTLED enqueue promise: resolve starts the poll, reject shows the
// retry chip. Firestore writes do neither while the backend is unreachable, so this bound is what
// keeps an offline onboarding from stranding the user with no plan and no way to ask for one.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TimeoutError, withTimeout } from '../src/firebase/withTimeout.js'

test('a promise that settles in time passes its value through untouched', async () => {
  assert.equal(await withTimeout(Promise.resolve('ok'), 1000, 'nope'), 'ok')
})

test('a rejection passes through as itself, not as a timeout', async () => {
  const boom = new Error('permission-denied')
  await assert.rejects(() => withTimeout(Promise.reject(boom), 1000, 'nope'), (err) => err === boom)
})

test('a promise that never settles rejects as TimeoutError (the offline-write case)', async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 10, 'enqueue did not reach Firestore'),
    (err) => err instanceof TimeoutError && /did not reach Firestore/.test(err.message),
  )
})

test('the timer is cleared on success, so no pending handle keeps the process alive', async () => {
  // A leaked 60s timer would hang `node --test` well past this assertion.
  await withTimeout(Promise.resolve('ok'), 60000, 'nope')
  assert.ok(true)
})

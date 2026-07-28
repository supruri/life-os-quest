// Pure document shaping for the Firestore boundary. No Firebase imports live here, so every rule
// the security rules enforce is unit-testable without an emulator or a project.
//
// The shapes below are pinned by two things that must not drift:
//   1. firebase/firestore.rules in the aigrow-ai-service repo (what the browser is ALLOWED to write)
//   2. aigrow_ai/queue_client.py in the same repo (what the worker READS back)
// Identity is carried by the document id (the auth uid). There is no `user_id` field — the worker
// reconstructs it from doc.id — and field names are camelCase, not the old snake_case.

/** Firestore rejects directly-nested arrays, and the state blob has plenty. It is opaque to both
 *  the rules and the worker, so it crosses the boundary as a JSON string. */
export function serializeUserState(state) {
  return JSON.stringify(state)
}

export class CorruptUserStateError extends Error {
  constructor(cause) {
    super('user_states.state is not valid JSON')
    this.name = 'CorruptUserStateError'
    this.cause = cause
  }
}

/**
 * @returns the parsed state blob, or null when the user simply has no remote state yet.
 * @throws  CorruptUserStateError when a document exists but its blob cannot be parsed.
 *
 * The null/throw split matters: App treats null as "new user" and upserts local state over the
 * remote document, so returning null for a corrupt blob would silently destroy recoverable data.
 * Throwing routes it to App's catch, which keeps local state without claiming the remote was empty.
 */
export function parseUserStateDoc(data) {
  if (!data || typeof data.state !== 'string') return null
  try {
    return JSON.parse(data.state)
  } catch (err) {
    throw new CorruptUserStateError(err)
  }
}

/**
 * The enqueue payload. `timestamp` is injected (serverTimestamp() in production) so this stays pure.
 *
 * Every field is required by the rules: `hasOnly` bounds the key set, `hasAll` pins request/status/
 * requestedAt, and result/error/completedAt must be null so a browser cannot forge a finished plan.
 * Writing all six keys with setDoc (not merge) is also what resets a previous run's result, which is
 * what makes a re-request a clean re-enqueue rather than a half-updated row.
 */
export function aiPlanRequestDoc(request, timestamp) {
  if (!isPlainObject(request)) throw new TypeError('ai_plans.request must be a plain object')
  return {
    request,
    status: 'pending',
    result: null,
    error: null,
    requestedAt: timestamp, // also the worker's fence token against a superseded generation
    completedAt: null,
  }
}

/** Narrow the stored document to the three fields the AI flow consumes. */
export function readAiPlanDoc(data) {
  if (!data) return null
  return {
    status: data.status ?? null,
    result: data.result ?? null,
    error: data.error ?? null,
  }
}

/** Adapt a Firebase User to the `{ user: { id, email } }` session shape the UI already speaks
 *  (and that previewMode.js fakes), so no component needs to learn Firebase's `uid`. */
export function toSession(user) {
  if (!user) return null
  return { user: { id: user.uid, email: user.email ?? '' } }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

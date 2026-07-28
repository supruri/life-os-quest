// Cloud Firestore data access: the app's state blob and the AI-plan queue.
//
// Both collections are one document per user, keyed by the auth uid — which is what the security
// rules match on (`signedInAs(userId)`), replacing the old `auth.uid()::text = user_id` RLS
// predicate. Because identity IS the document id, every access here is a document get/set; there
// are no queries, and therefore no composite indexes to declare.

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from './app.js'
import { aiPlanRequestDoc, parseUserStateDoc, readAiPlanDoc, serializeUserState } from './docShape.js'
import { FirebaseNotConfiguredError } from './auth.js'
import { withTimeout } from './withTimeout.js'
import { isPreview, previewAiRow, previewUserState } from '../previewMode.js'

const USER_STATES = 'user_states'
const AI_PLANS = 'ai_plans'

// The enqueue is the one write the UI blocks on: App only starts the poll and shows the generation
// cover after it resolves, and only shows the retry chip if it rejects. An offline Firestore write
// would do neither, stranding the user on the dashboard with no plan and no way to ask for one.
const ENQUEUE_TIMEOUT_MS = 15000

export async function fetchUserState(userId) {
  if (isPreview()) return previewUserState()
  if (!db) return null

  const snapshot = await getDoc(doc(db, USER_STATES, userId))
  return parseUserStateDoc(snapshot.exists() ? snapshot.data() : null)
}

export async function upsertUserState(userId, state) {
  if (isPreview()) return // preview is read-only — never persist fixture state
  if (!db) return

  // setDoc without merge: the rules allow exactly { state, updatedAt }, and a whole-blob replace is
  // what the contract assigns to the app (the worker never writes user_states, so there is no
  // clobber race to merge around).
  await setDoc(doc(db, USER_STATES, userId), {
    state: serializeUserState(state),
    updatedAt: serverTimestamp(),
  })
}

export async function requestAiPlan(userId, request) {
  if (isPreview()) return // preview shows a fixture; never enqueue a real job
  if (!db) throw new FirebaseNotConfiguredError()

  // A full replace, not a merge: it resets result/error/completedAt from any previous run and
  // stamps a fresh requestedAt. That timestamp is the worker's fence token — a generation already
  // in flight for the superseded request is dropped instead of overwriting this one.
  //
  // Timed out is reported as failed, not silently swallowed. If the write does land later the row
  // is a valid pending request, so the worker still fulfils it and the next mount rehydrates it
  // (useAiFlow's 'resume' path) — a timeout costs the user a retry button, never the plan.
  await withTimeout(
    setDoc(doc(db, AI_PLANS, userId), aiPlanRequestDoc(request, serverTimestamp())),
    ENQUEUE_TIMEOUT_MS,
    'ai_plans enqueue did not reach Firestore in time',
  )
}

export async function fetchAiPlan(userId) {
  if (isPreview()) return previewAiRow()
  if (!db) return null

  const snapshot = await getDoc(doc(db, AI_PLANS, userId))
  return readAiPlanDoc(snapshot.exists() ? snapshot.data() : null)
}

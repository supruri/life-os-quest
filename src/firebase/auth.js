// Firebase Authentication (email/password), adapted to the session shape the UI already speaks.
//
// Every export tolerates an unconfigured project (auth === null) so the app degrades to local-only
// mode instead of crashing, and short-circuits in DEV preview mode so `?preview=<name>` renders the
// real UI with no sign-in at all.

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'

import { auth } from './app.js'
import { toSession } from './docShape.js'
import { isPreview, PREVIEW_SESSION } from '../previewMode.js'

// App gates its whole render on getSession() settling (`authReady`). onAuthStateChanged delivers
// its first callback off an internal initialisation promise, and if that promise rejects neither
// the next- nor the error-observer runs — the subscription simply goes quiet. Without a deadline
// that is an unrecoverable spinner, so a silent auth layer is treated as "signed out" and the user
// gets the sign-in screen instead of a dead app.
const AUTH_READY_TIMEOUT_MS = 10000

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super('Firebase is not configured')
    this.name = 'FirebaseNotConfiguredError'
  }
}

export async function signUp(email, password) {
  if (!auth) throw new FirebaseNotConfiguredError()
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  // Unlike Supabase's opt-in email confirmation, Firebase signs the new user in immediately, so a
  // session always exists here. The caller still checks for it rather than assuming.
  return { session: toSession(credential.user) }
}

export async function signIn(email, password) {
  if (!auth) throw new FirebaseNotConfiguredError()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return { session: toSession(credential.user) }
}

export async function signOut() {
  if (!auth) return
  await firebaseSignOut(auth)
}

/**
 * Resolve the session once, after Firebase has restored any persisted login.
 *
 * Firebase has no synchronous getSession(): reading `auth.currentUser` immediately after load
 * returns null even for a signed-in user, because the SDK is still rehydrating from IndexedDB.
 * The first onAuthStateChanged callback is that "ready" signal, so we take it and unsubscribe.
 */
export function getSession() {
  if (isPreview()) return Promise.resolve(PREVIEW_SESSION)
  if (!auth) return Promise.resolve(null)

  return new Promise((resolve) => {
    // `unsubscribe` is assigned only after onAuthStateChanged returns. Declaring it up front (and
    // null-checking below) keeps a synchronous first callback from hitting the temporal dead zone;
    // the trailing call covers that same case, where finish() ran before there was a handle to release.
    let unsubscribe = null
    let settled = false

    const finish = (session) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (unsubscribe) unsubscribe()
      resolve(session)
    }

    const timer = setTimeout(() => finish(null), AUTH_READY_TIMEOUT_MS)

    unsubscribe = onAuthStateChanged(
      auth,
      (user) => finish(toSession(user)),
      (error) => {
        // Value-free: an auth error object can carry the attempted identifier.
        console.warn('[firebase] auth state could not be resolved:', error?.code ?? error?.name)
        finish(null)
      },
    )

    if (settled) unsubscribe()
  })
}

export function onAuthChange(callback) {
  if (isPreview()) {
    callback(PREVIEW_SESSION)
    return () => {}
  }
  if (!auth) return () => {}
  return onAuthStateChanged(auth, (user) => callback(toSession(user)))
}

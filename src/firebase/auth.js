// Firebase Authentication (email/password), adapted to the session shape the UI already speaks.
//
// Every export tolerates an unconfigured project (auth === null) so the app degrades to local-only
// mode instead of crashing, and short-circuits in DEV preview mode so `?preview=<name>` renders the
// real UI with no sign-in at all.

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'

import { auth } from './app.js'
import { toSession } from './docShape.js'
import { POPUP_FALLBACK_CODES, REDIRECTING, isUserCancelledAuth, prefersRedirect } from './providerFlow.js'
import { isPreview, PREVIEW_SESSION } from '../previewMode.js'

export { isUserCancelledAuth, prefersRedirect } from './providerFlow.js'

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

// --- Google ---------------------------------------------------------------------------------

export async function signInWithGoogle() {
  if (!auth) throw new FirebaseNotConfiguredError()
  const provider = new GoogleAuthProvider()
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent

  if (prefersRedirect(ua)) {
    await signInWithRedirect(auth, provider)
    return REDIRECTING
  }

  try {
    const credential = await signInWithPopup(auth, provider)
    return { session: toSession(credential.user), redirecting: false }
  } catch (error) {
    // A blocked or environmentally-unsupported popup is not a failure the user can act on —
    // fall through to redirect rather than showing them an error they cannot fix.
    if (POPUP_FALLBACK_CODES.has(error?.code)) {
      await signInWithRedirect(auth, provider)
      return REDIRECTING
    }
    throw error
  }
}

/**
 * Completes a redirect sign-in after the browser comes back.
 *
 * onAuthStateChanged already restores the session, so this exists to surface an *error* from the
 * redirect leg (unauthorized domain, account collision) that would otherwise vanish silently.
 */
export async function consumeRedirectResult() {
  if (!auth || isPreview()) return null
  const result = await getRedirectResult(auth)
  return result ? toSession(result.user) : null
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

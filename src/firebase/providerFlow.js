// Pure decisions for provider (Google / Apple) sign-in.
//
// Kept free of Firebase and of `import.meta.env` so it runs under plain node:test — the same
// boundary docShape.js and runGuide.js follow. auth.js consumes these; nothing here touches a
// browser, a network, or the SDK.

/**
 * Popup or redirect?
 *
 * Mobile and in-app browsers either block popups outright or open them in a detached context the
 * SDK can never read back, which strands the user on a blank screen with no error. Redirect is the
 * only reliable flow there. Desktop keeps the popup so the user never loses the page they were on.
 */
export function prefersRedirect(userAgent) {
  if (typeof userAgent !== 'string' || !userAgent) return false
  return /Android|iPhone|iPad|iPod|Mobile|KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(userAgent)
}

/**
 * Popup failures the user cannot act on. These fall through to redirect rather than surfacing an
 * error message that offers them nothing to do.
 */
export const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/cancelled-popup-request',
])

/** Deliberate user cancellation — the caller should quietly reset, not display an error. */
export function isUserCancelledAuth(error) {
  return error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/user-cancelled'
}

/** Signals the caller that a full-page redirect is under way, so it must not render an error. */
export const REDIRECTING = Object.freeze({ redirecting: true, session: null })

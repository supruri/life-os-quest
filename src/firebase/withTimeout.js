// Bounds a promise that may never settle.
//
// Firestore write promises do not reject when the client cannot reach the backend: per the SDK's
// own docs, the promise "is not rejected until the remote Firestore backend reports an error" and
// while offline it "will not resolve for a potentially-long time". The Supabase `fetch` this
// replaced rejected promptly, and the UI is built on that contract — a settled promise is what
// starts the poll or shows the retry chip. Restoring the contract belongs at this boundary rather
// than in the components, which should not have to know the SDK's settlement semantics.

export class TimeoutError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * @param promise the operation to bound
 * @param ms      how long to wait before giving up
 * @param message error message when the deadline passes
 *
 * The timer is always cleared, so a resolved promise never leaves a pending handle behind (which
 * would keep a test runner or a Node process alive).
 */
export function withTimeout(promise, ms, message) {
  let timer
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms)
  })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}

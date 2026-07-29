// Public surface of the Firebase boundary. UI code imports from here only, so swapping the backend
// again would touch this folder and nothing else — the same role src/supabase.js used to play.

export { isFirebaseConfigured, missingConfigKeys } from './app.js'
export {
  FirebaseNotConfiguredError,
  consumeRedirectResult,
  getSession,
  isUserCancelledAuth,
  onAuthChange,
  prefersRedirect,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from './auth.js'
export { fetchAiPlan, fetchUserState, requestAiPlan, upsertUserState } from './store.js'

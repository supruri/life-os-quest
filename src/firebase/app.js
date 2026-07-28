// Firebase app initialisation and the "is the cloud configured?" guard.
//
// Config comes from VITE_FIREBASE_* env vars only — never from source. All of these values are
// public by design (they identify the project, they do not authorise anything); the access
// boundary is Firestore security rules + Firebase Auth, not secrecy of this config. A service
// account / Admin credential must never appear in a browser build: the AI worker holds that,
// server-side, in the aigrow-ai-service repo.

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// storageBucket / messagingSenderId are intentionally absent: this app uses neither Storage nor
// FCM, so requiring them would fail startup over config it never reads.
const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId']

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const missingConfigKeys = REQUIRED_KEYS.filter((key) => !config[key])
export const isFirebaseConfigured = missingConfigKeys.length === 0

// Only initialise when fully configured. Without this guard initializeApp/getAuth throw at module
// load and blank-page the whole app — the same failure the Supabase client guarded against.
//
// Unconfigured does NOT mean "runs offline": App renders the sign-in screen whenever there is no
// session, and sign-in cannot succeed without a project. What the guard buys is a readable failure
// (a named warning and a working sign-in screen) instead of a white page, plus a DEV `?preview=`
// harness that still runs because it bypasses auth entirely.
function createApp() {
  if (!isFirebaseConfigured) return null
  return getApps().length ? getApp() : initializeApp(config)
}

const app = createApp()

export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null

if (!isFirebaseConfigured) {
  console.warn(
    `[firebase] missing ${missingConfigKeys.map((k) => `VITE_FIREBASE_${camelToEnv(k)}`).join(', ')}` +
      ' — sign-in and cloud sync are unavailable until these are set in .env.local.',
  )
}

function camelToEnv(key) {
  return key.replace(/[A-Z]/g, (ch) => `_${ch}`).toUpperCase()
}

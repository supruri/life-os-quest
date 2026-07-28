# Firebase setup

The frontend talks to Firebase Authentication (email/password) and Cloud Firestore. This replaces
the former Supabase client; see `architecture-decisions.md` for why.

## Environment variables

Copy `.env.example` to `.env.local` (git-ignored) and fill in the four required values from
**Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration**.

| Variable | Source field |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

`storageBucket` and `messagingSenderId` are deliberately not read — the app uses neither Storage
nor FCM.

If any of the four is missing the app does not crash — it logs exactly which variables are absent
and still renders — but it **stops at the sign-in screen**, because signing in requires a project.
There is no offline/local-only mode. What the guard buys is a readable failure instead of a blank
page, and a DEV `?preview=<name>` harness that still runs because it bypasses auth entirely.

### What must never go in a `VITE_*` variable

Everything prefixed `VITE_` is inlined into the browser bundle and is readable by anyone. The four
values above are public identifiers — they identify the project, they do not authorise anything, and
the actual boundary is Firebase Auth plus the Firestore security rules.

A **service account / Admin SDK credential must never appear here** (the analogue of the old
Supabase `service_role` key). The AI worker holds that server-side, in the `aigrow-ai-service` repo.

## Firestore data model

One document per user in each collection; **the document id is the Firebase Auth uid**. That is what
the security rules match on, replacing the old `auth.uid()::text = user_id` RLS predicate — so there
is no `user_id` field any more, and field names are camelCase rather than snake_case.

| Collection | Written by | Shape |
|---|---|---|
| `user_states/{uid}` | browser only | `{ state: <JSON string>, updatedAt: <timestamp> }` |
| `ai_plans/{uid}` | browser enqueues, worker fulfils | `{ request, status, result, error, requestedAt, completedAt }` |

Two constraints are easy to get wrong and are enforced by the rules:

- **`state` is a JSON string, not a map.** Firestore rejects directly-nested arrays and the state
  blob is full of them (`schedules['v1|w1'].mon = ['reading', ...]`). Nothing queries inside it.
- **The browser may only enqueue.** `status` must be `'pending'` and `result` / `error` /
  `completedAt` must be null, so a client cannot forge a finished plan. Only the worker (Admin SDK,
  which bypasses rules) writes `done`/`error`.

`requestedAt` doubles as the worker's fence token: re-requesting stamps a new timestamp, so a
generation still in flight for a superseded request is dropped rather than overwriting the new one.

## Security rules and indexes

The rules are **not duplicated in this repo** — they are one artifact shared with the worker and live
at `aigrow-ai-service/firebase/firestore.rules`, together with their emulator test suite
(`npm test` in that directory). Forking them here would create two sources of truth for one
deployed resource.

**No composite indexes are required.** Every access from this client is a document get by id; the
only query in the system is the worker's single-field `status == 'pending'`, which Firestore's
automatic single-field index already serves. `firestore.indexes.json` is correspondingly empty.

## Console prerequisites

- Authentication → Sign-in method → **Email/Password enabled**.
- Cloud Firestore database created, with the rules above deployed.
- Anonymous sign-in should stay disabled. The rules reject anonymous sessions regardless
  (`sign_in_provider != 'anonymous'`), so enabling it cannot silently widen access.

## Verifying a change to the data layer

```bash
npm test     # includes tests/firebaseDocShape.test.js, which pins the document shapes
npm run lint
npm run build
```

`tests/firebaseDocShape.test.js` encodes the rules' key allowlist and the worker's expected row
shape, so a drift (an extra key, a snake_case name, a raw object instead of a JSON string) fails
locally instead of failing as `permission-denied` in production.

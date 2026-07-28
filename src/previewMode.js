// DEV-ONLY plan preview. `?preview=<name>` renders the real UI with a generated
// ai_plans result fixture from public/previews/<name>.json, bypassing Firebase auth/Firestore.
// Every seam is guarded by import.meta.env.DEV, so this is dead code in production builds.

function params() {
  return new URLSearchParams(window.location.search)
}

export function isPreview() {
  return Boolean(import.meta.env.DEV) && params().has('preview')
}

export function previewName() {
  return params().get('preview') || 'default'
}

export const PREVIEW_SESSION = { user: { id: 'preview-user', email: 'preview@local' } }

// Minimal state so App skips Onboarding and enables personalization surfaces.
// Merged over createDefaultState() by the caller, so only the overrides are needed.
export function previewUserState() {
  return {
    onboarded: true,
    lang: 'ko',
    profile: {
      goals: ['exercise'],
      dream: 'preview',
      currentState: {},
      pattern: {},
      duration: '6개월',
    },
  }
}

export async function previewAiRow() {
  try {
    const res = await fetch(`/previews/${previewName()}.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const result = await res.json()
    return { status: 'done', result, error: null }
  } catch (err) {
    console.warn('[preview] failed to load fixture', err)
    return null
  }
}

// Deterministic, no-LLM Couch-to-5K fallback.
//
// Why this exists: personalization is produced by an offline worker. When it is unavailable the
// user keeps the generic catalog workout, which carries no `resourceRef` — so the c25k session
// guide is unreachable for exactly the people who asked for a 5K. This module builds the same
// overlay shape the model path produces, from fixed data, with no network and no model.
//
// Content rule: the session below is the c25k week-1 text this repo already ships in
// public/previews/*.json — every fixture there uses unitIndex 0 and this same unitLabel. Later
// c25k weeks are NOT invented here: fabricating a progression would be inventing training advice.
// A real multi-week catalog belongs to the worker, and its overlay replaces this one when it lands.

import { slotKey, slotsFor } from './aiPlan.js'

/** The one c25k session with sourced text. Shaped as an overlay slot (see aiPlan.js `fill`). */
export const C25K_WEEK1_SLOT = {
  title: '카우치 투 5K',
  subtitle: 'NHS 9주 걷기→달리기 입문',
  resourceRef: 'run:c25k',
  unitLabel: '1주 — 5분 걷기 후 60초 달리기/90초 걷기 반복 (주 3회)',
  estimatedMinutes: 25,
  objectiveKo:
    '주 3회 달리기 계획을 세우고, 5분 빠르게 걷고 60초 달리기·90초 걷기를 반복하세요. 달리는 내내 한 문장을 여유 있게 말할 만큼 천천히 — 숨차면 더 느리게.',
  objectiveEn:
    'Plan to run three times a week: walk briskly for 5 minutes, then repeat 60 seconds running and 90 seconds walking. Keep it slow enough to speak a full sentence.',
}

// c25k is a three-sessions-per-week programme, which the unitLabel itself states ("주 3회").
export const C25K_SESSIONS_PER_WEEK = 3

// Matches an explicit running/5K intent in free text or a goal id.
const RUN_INTENT = /(\b5\s*k\b|5\s*km|5킬|오킬|러닝|달리기|마라톤|조깅|running|run\b|jog)/i

/**
 * Does this profile describe a running / 5K goal?
 *
 * The `exercise` goal id alone deliberately does NOT qualify. It is the umbrella option covering
 * gym, walking and cycling too, so treating it as running would replace the generic workout for
 * users who never asked for one — the explicit non-goal of this change. Detection requires either
 * the running sport selection or running intent stated in words.
 */
export function detectsRunningGoal(profile) {
  if (!profile || typeof profile !== 'object') return false
  if (profile.sport === 'running') return true

  const goals = Array.isArray(profile.goals) ? profile.goals : []
  if (goals.some((goal) => typeof goal === 'string' && RUN_INTENT.test(goal))) return true

  // `dream` is the onboarding free-text goal ("3개월 후에 5km 완주하고 싶어요").
  return typeof profile.dream === 'string' && RUN_INTENT.test(profile.dream)
}

/** The programme a running user starts on when nothing more specific is known. */
export const DEFAULT_RUN_PROGRAM = 'c25k'

/**
 * Natural-language target distance in km, or null when the user never stated one.
 *
 * Kept because it is free signal that costs no UI, but it is deliberately NOT a gate: a running
 * user who never mentions a distance still gets a programme. There is no distance-choice screen
 * and none is needed.
 */
export function parseTargetDistanceKm(profile) {
  if (!profile || typeof profile !== 'object') return null
  const goals = Array.isArray(profile.goals) ? profile.goals : []
  const text = [profile.dream, ...goals].filter((part) => typeof part === 'string').join(' ')
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:km|k\b|킬로미터|킬로|킬)/i)
  return match ? Number(match[1]) : null
}

/**
 * Which running programme this profile starts on, or null when the user is not on the running
 * path at all (in which case nothing about their plan changes).
 *
 * The product decision this encodes: a missing distance DEFAULTS, it does not block. C25K is the
 * beginner on-ramp, so it is also the right starting point for someone aiming beyond 5K — a 10K
 * goal begins by being able to run 5K. When a second programme is actually implemented, this is
 * the single function that has to learn to choose between them.
 */
export function resolveRunProgram(profile) {
  if (!detectsRunningGoal(profile)) return null
  return DEFAULT_RUN_PROGRAM
}

/**
 * Build the fallback overlay, or null when the profile is not a running goal (caller then leaves
 * the generic plan completely untouched).
 *
 * Schedule handling: the returned schedule is the FULL default week, not just the running days.
 * The overlay replaces `state.schedules[week]` wholesale, so returning only workout days would
 * silently drop that week's reading missions. This fallback adds running detail to the workout
 * slots; it does not rewrite the week. Because the schedule is exactly what
 * getDefaultWeekSchedule() produced, sanitizeWeekSchedule's required-count check is satisfied by
 * construction and no mission can exceed its allowance.
 */
export function buildC25kFallbackOverlay({ profile, version, week, defaultWeekSchedule }) {
  // Routed through resolveRunProgram so "which programme" is one decision in one place, and so a
  // running user is never turned away for not having named a distance.
  if (resolveRunProgram(profile) !== DEFAULT_RUN_PROGRAM) return null
  if (!defaultWeekSchedule) return null

  const workoutDays = slotsFor(defaultWeekSchedule, 'workout')
  if (workoutDays.length === 0) return null

  const runDays = workoutDays.slice(0, C25K_SESSIONS_PER_WEEK)
  const slots = {}
  for (const day of runDays) {
    slots[slotKey(day, 'workout')] = { ...C25K_WEEK1_SLOT }
  }

  return {
    version,
    week,
    // Distinct from the model overlay's 'model'. Never claim a model produced this.
    source: 'fallback-c25k',
    goalSummary: null,
    summaryLines: [],
    slots,
    schedule: defaultWeekSchedule,
    // Nothing is dropped: workout days beyond the three simply keep their generic content, so a
    // "dropped quests" warning here would be false.
    dropped: { reading: 0, workout: 0 },
  }
}

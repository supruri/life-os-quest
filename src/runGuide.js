// Pure derivation for the running-session guide. No React imports, so it is unit-testable the
// same way aiPlan.js / runningTrail.js are.
//
// Hard rule inherited from runningTrail.parseWalkRun: never invent numbers. Every minute figure
// here is either present in the plan data or arithmetic over figures that are. When a value cannot
// be derived it is null and the UI omits it, rather than showing a confident guess about how long
// somebody should run.

// Reuses runningTrail's parser so the guide and the trail can never drift to two different
// interpretations of the same interval text.
import { parseWalkRun } from './runningTrail.js'

export const RUN_REF_PREFIX = 'run:'

/** True for `run:c25k` and any future `run:*` programme. */
export function isRunSession(resourceRef) {
  return typeof resourceRef === 'string' && resourceRef.startsWith(RUN_REF_PREFIX)
}

/**
 * The session a "start today's workout" action should open the guide for.
 *
 * Returns the first run session of the day, or null when the day has none — in which case the
 * caller keeps its previous behaviour (navigate to the quest board) instead of opening a guide for
 * a mission that is not a run. Extracted from the click handlers so this decision is testable
 * without a browser, and so desktop and mobile cannot answer it differently.
 */
export function pickRunSession(sessions) {
  if (!Array.isArray(sessions)) return null
  return sessions.find((session) => isRunSession(session?.resourceRef)) ?? null
}

// The leading walk in a C25K-style objective ("5분 빠르게 걷고 …" / "5분 걷기 후 …").
// Anchored to the START of the text so a later "90초 걷기" interval half can never be read as
// the warm-up.
function parseWarmupMinutes(text) {
  if (typeof text !== 'string') return null
  const m = text.match(/^[^.。]{0,20}?(\d+)\s*분\s*(?:빠르게\s*)?걷/)
  return m ? Number(m[1]) : null
}

/**
 * @returns null when the session is not a run, so callers keep their existing behaviour untouched.
 *
 * Labels are returned as {ko,en} pairs (the repo's `tr()` shape) rather than resolved strings, so
 * this stays presentation-free and testable without a language context.
 */
export function deriveRunGuide(session) {
  if (!session || !isRunSession(session.resourceRef)) return null

  const objectiveKo = session.objectiveKo ?? session.objective?.ko ?? ''
  const objectiveEn = session.objectiveEn ?? session.objective?.en ?? ''
  const unitLabel = session.unitLabel ?? null
  const total = Number.isFinite(session.estimatedMinutes) ? session.estimatedMinutes : null

  // Prefer the per-session objective over the catalog unitLabel — the same precedence
  // runningTrail.js documents, so the guide headline matches the card the user tapped.
  const interval = parseWalkRun(objectiveKo || unitLabel || '')

  const warmupMinutes = parseWarmupMinutes(objectiveKo)
  // The cool-down mirrors the warm-up. That is an inference, not plan data, so it is only made
  // when the warm-up itself was found in the text — never conjured from nothing.
  const cooldownMinutes = warmupMinutes
  const bookends = warmupMinutes == null ? null : warmupMinutes + cooldownMinutes
  const intervalMinutes =
    total != null && bookends != null && total - bookends > 0 ? total - bookends : null

  return {
    title: session.title ?? null,
    subtitle: session.subtitle ?? null,
    unitLabel,
    objective: { ko: objectiveKo, en: objectiveEn },
    estimatedMinutes: total,
    interval,
    steps: [
      {
        id: 'warmup',
        minutes: warmupMinutes,
        label: { ko: '워밍업', en: 'Warm-up' },
        detail: { ko: '빠르게 걷기로 몸을 데웁니다.', en: 'Brisk walk to warm up.' },
      },
      {
        id: 'interval',
        minutes: intervalMinutes,
        label: { ko: '본 운동', en: 'Intervals' },
        detail: interval
          ? {
              ko: `${interval.run.n}${interval.run.unit} 달리기 → ${interval.walk.n}${interval.walk.unit} 걷기를 반복합니다.`,
              en: `Repeat: run ${interval.run.n}${interval.run.unit === '분' ? ' min' : ' sec'}, walk ${interval.walk.n}${interval.walk.unit === '분' ? ' min' : ' sec'}.`,
            }
          : // No parseable interval (a continuous run, or prose) — show the plan's own words
            // instead of inventing a structure it never specified.
            { ko: objectiveKo, en: objectiveEn },
      },
      {
        id: 'cooldown',
        minutes: cooldownMinutes,
        label: { ko: '쿨다운', en: 'Cool-down' },
        detail: { ko: '천천히 걸으며 호흡을 정리합니다.', en: 'Easy walk to bring your breathing down.' },
      },
    ],
    safety: {
      ko: '통증이 있으면 그 자리에서 멈추세요. 무릎·정강이 통증, 어지러움, 가슴 통증이 있으면 오늘 세션을 끝내고 회복 후 다시 시작하세요.',
      en: 'Stop if it hurts. End the session for today if you feel knee or shin pain, dizziness, or chest pain, and resume once recovered.',
    },
  }
}

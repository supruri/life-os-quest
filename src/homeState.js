// Adapter: App's real state (week schedule + per-(day,mission) completion) -> the shape
// runningTrail.js already consumes. Kept pure and DOM-free so it can be unit-tested, and
// kept separate from App.jsx so the mobile home and the DEV fixture harness can share it.
//
// RunningPlanView.jsx feeds runningTrail from static /previews/*.json fixtures. This module
// is the production equivalent; the trail/summary logic itself is unchanged.

import { DAYS } from './runningTrail.js'

// Completion in App is keyed per (day, mission) — the SAME mission id can be scheduled on
// several days. buildWeekTrail's doneMap is keyed by quest id alone, so a mission-only id
// would leak Monday's completion onto Wednesday. Namespacing by day keeps them distinct.
export const questId = (dayId, missionId) => `${dayId}|${missionId}`

/**
 * @param schedule    {mon: [missionId, ...], ...} — App's current week schedule
 * @param missionMap  {missionId: mission}
 * @param resolve     (i18nValue) => string  (App passes a bound `tr`)
 * @param overlayFor  (dayId, missionId) => aiPlan slot | null | undefined
 */
export function buildHomeQuests({ schedule = {}, missionMap = {}, resolve = (v) => v, overlayFor }) {
  const quests = []
  const weekSchedule = {}

  for (const [dayKey] of DAYS) {
    weekSchedule[dayKey] = []
    for (const missionId of schedule[dayKey] ?? []) {
      const mission = missionMap[missionId]
      // Guard: a schedule entry with no matching mission is a ghost id. Drop it so the day
      // reads as rest rather than becoming a phantom session (same rule runningTrail uses).
      if (!mission) continue

      const overlay = overlayFor?.(dayKey, missionId)
      const id = questId(dayKey, missionId)
      weekSchedule[dayKey].push(id)

      // Prefer the AI overlay objective over the catalog detail — it is what the card shows,
      // so the WALK/RUN headline can never contradict the description beneath it.
      const objectiveKo = overlay?.objectiveKo ?? resolve(mission.detail)

      quests.push({
        id,
        missionId,
        dayKey,
        title: resolve(mission.ko),
        category: mission.id === 'workout' ? 'workout' : mission.id,
        resourceRef: overlay?.resourceRef ?? '',
        objective: { ko: objectiveKo, en: objectiveKo },
        unitLabel: overlay?.unitLabel ?? '',
        meta: { xp: mission.xp ?? 0, statRewards: mission.statRewards ?? {} },
      })
    }
  }

  return { quests, weekSchedule }
}

/**
 * Build buildWeekTrail's doneMap from App's completion predicate.
 * @param isDone (dayId, missionId) => boolean
 */
export function buildDoneMap(quests = [], isDone = () => false) {
  const doneMap = {}
  for (const quest of quests) {
    doneMap[quest.id] = Boolean(isDone(quest.dayKey, quest.missionId))
  }
  return doneMap
}

// Session progress for the L-2 header, which shows sessions instead of level/XP.
// Derived from the same trail nodes the user sees, so the header and the trail agree.
export function sessionProgressPercent({ done = 0, total = 0 }) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

// Pure domain logic for the AI personalization overlay (Plan B-2).
// No React / Firebase / weeklyMissionPlans imports — the caller passes the default
// week schedule in, so this module stays unit-testable with node:test.

const READING_CATEGORIES = ['reading', 'video'] // video folds into the reading slots
const SYSTEM_QUEST_ID = 'weekend-review'
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function mapProfileToRequest(profile) {
  return {
    schemaVersion: '2.0',
    profile: {
      goals: Array.isArray(profile?.goals) ? profile.goals : [],
      goalText: typeof profile?.dream === 'string' ? profile.dream : '',
      currentState:
        profile?.currentState && typeof profile.currentState === 'object' ? profile.currentState : {},
      pattern: profile?.pattern && typeof profile.pattern === 'object' ? profile.pattern : {},
      duration: typeof profile?.duration === 'string' ? profile.duration : '',
    },
  }
}

export function isPersonalizable(profile) {
  return Boolean(
    profile &&
      Array.isArray(profile.goals) &&
      profile.goals.length > 0 &&
      typeof profile.dream === 'string' &&
      profile.dream.trim().length > 0 &&
      profile.currentState &&
      typeof profile.currentState === 'object' &&
      profile.pattern &&
      typeof profile.pattern === 'object' &&
      typeof profile.duration === 'string' &&
      profile.duration.trim().length > 0,
  )
}

export function slotKey(day, missionId) {
  return `${day}|${missionId}`
}

// Ordered (day) list where the default plan places `missionId`, in mon->sun order.
function slotsFor(defaultWeekSchedule, missionId) {
  const out = []
  for (const day of DAYS) {
    for (const id of defaultWeekSchedule[day] ?? []) {
      if (id === missionId) out.push(day)
    }
  }
  return out
}

// AI quests in weekSchedule day-order (mon->sun, first occurrence wins).
function orderedQuests(result) {
  const byId = Object.fromEntries((result.quests ?? []).map((q) => [q.id, q]))
  const seen = new Set()
  const ordered = []
  for (const day of DAYS) {
    for (const id of result.weekSchedule?.[day] ?? []) {
      if (seen.has(id)) continue
      seen.add(id)
      const q = byId[id]
      if (q) ordered.push(q)
    }
  }
  return ordered
}

// Returns null unless this is a real model plan; a 'default' plan adds no personalization
// (its objectives are generic), so the app keeps its own default text.
export function buildAiOverlay(result, version, week, defaultWeekSchedule) {
  if (!result || result.planMeta?.source !== 'model') return null
  const quests = orderedQuests(result)
  const readingQ = quests.filter((q) => q.id !== SYSTEM_QUEST_ID && READING_CATEGORIES.includes(q.category))
  const workoutQ = quests.filter((q) => q.category === 'workout')
  const readingSlots = slotsFor(defaultWeekSchedule, 'reading')
  const workoutSlots = slotsFor(defaultWeekSchedule, 'workout')

  const slots = {}
  const schedule = {} // day -> [missionId]: places the mission so the empty week renders a card
  const fill = (bucket, slotDays, missionId) => {
    const n = Math.min(bucket.length, slotDays.length)
    for (let i = 0; i < n; i++) {
      const q = bucket[i]
      const day = slotDays[i]
      slots[slotKey(day, missionId)] = {
        objectiveKo: q.objective?.ko ?? '',
        objectiveEn: q.objective?.en ?? '',
        title: q.title ?? null,
        subtitle: q.subtitle ?? null,
        unitLabel: q.unitLabel ?? null,
        resourceRef: q.resourceRef ?? null,
        // Carried through for the running-session guide, which reports the session length rather
        // than estimating one. Null when the plan omits it — the guide then shows no total.
        estimatedMinutes: Number.isFinite(q.estimatedMinutes) ? q.estimatedMinutes : null,
      }
      schedule[day] = [...(schedule[day] ?? []), missionId]
    }
    return Math.max(0, bucket.length - slotDays.length) // dropped count (no silent cap)
  }

  const droppedReading = fill(readingQ, readingSlots, 'reading')
  const droppedWorkout = fill(workoutQ, workoutSlots, 'workout')

  return {
    version,
    week,
    source: 'model',
    goalSummary: result.planMeta?.goalSummary ?? null,
    summaryLines: Array.isArray(result.planMeta?.summaryLines) ? result.planMeta.summaryLines : [],
    slots,
    schedule,
    dropped: { reading: droppedReading, workout: droppedWorkout },
  }
}

export function aiSlotFor(aiPlan, version, week, day, missionId) {
  if (!aiPlan || aiPlan.version !== version || aiPlan.week !== week) return null
  return aiPlan.slots?.[slotKey(day, missionId)] ?? null
}

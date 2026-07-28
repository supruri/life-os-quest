import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildHomeQuests, buildDoneMap, questId, sessionProgressPercent } from '../src/homeState.js'
import { buildWeekTrail, weekProgress, weeklySummary } from '../src/runningTrail.js'

const missionMap = {
  workout: { id: 'workout', ko: { ko: '운동', en: 'Workout' }, xp: 20, statRewards: { vitality: 10 }, detail: { ko: '30-45분 걷기', en: 'walk 30-45m' } },
  reading: { id: 'reading', ko: { ko: '독서', en: 'Reading' }, xp: 15, statRewards: { intelligence: 10 }, detail: { ko: '30분 읽기', en: 'read 30m' } },
}
const resolve = (v) => (typeof v === 'string' ? v : v?.ko ?? '')

test('quest ids are namespaced by day so the same mission on two days stays independent', () => {
  const { quests, weekSchedule } = buildHomeQuests({
    schedule: { mon: ['workout'], wed: ['workout'] },
    missionMap,
    resolve,
  })

  assert.equal(quests.length, 2)
  assert.notEqual(quests[0].id, quests[1].id)
  assert.deepEqual(weekSchedule.mon, [questId('mon', 'workout')])
  assert.deepEqual(weekSchedule.wed, [questId('wed', 'workout')])

  // Completing Monday must NOT mark Wednesday done — the bug a mission-only id would cause.
  const doneMap = buildDoneMap(quests, (dayId) => dayId === 'mon')
  const { nodes } = buildWeekTrail({ weekSchedule, quests, today: 'mon', doneMap })
  const mon = nodes.find((n) => n.dayKey === 'mon')
  const wed = nodes.find((n) => n.dayKey === 'wed')
  assert.equal(mon.isDone, true)
  assert.equal(wed.isDone, false)
  assert.deepEqual(weekProgress(nodes), { done: 1, total: 2 })
})

test('a schedule id with no matching mission is dropped, leaving the day as rest', () => {
  const { quests, weekSchedule } = buildHomeQuests({
    schedule: { mon: ['ghost'], tue: ['reading'] },
    missionMap,
    resolve,
  })

  assert.deepEqual(weekSchedule.mon, [])
  assert.equal(quests.length, 1)

  const { nodes } = buildWeekTrail({ weekSchedule, quests, today: 'mon', doneMap: {} })
  assert.equal(nodes.find((n) => n.dayKey === 'mon').kind, 'rest')
  assert.equal(nodes.find((n) => n.dayKey === 'tue').kind, 'session')
})

test('every weekday is present in weekSchedule even when nothing is scheduled', () => {
  const { weekSchedule } = buildHomeQuests({ schedule: {}, missionMap, resolve })
  assert.deepEqual(Object.keys(weekSchedule), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
  assert.ok(Object.values(weekSchedule).every((ids) => ids.length === 0))
})

test('AI overlay objective wins over the catalog detail, and is what feeds the headline', () => {
  const { quests } = buildHomeQuests({
    schedule: { mon: ['workout'] },
    missionMap,
    resolve,
    overlayFor: (dayId, missionId) =>
      dayId === 'mon' && missionId === 'workout'
        ? { objectiveKo: '1분 달리기 · 2분 걷기 반복', unitLabel: 'ignored', resourceRef: 'run:w1' }
        : null,
  })

  assert.equal(quests[0].objective.ko, '1분 달리기 · 2분 걷기 반복')
  assert.equal(quests[0].resourceRef, 'run:w1')
})

test('meta carries real xp and stat rewards so weeklySummary stays truthful', () => {
  const { quests } = buildHomeQuests({
    schedule: { mon: ['workout'], tue: ['reading'] },
    missionMap,
    resolve,
  })
  const doneMap = buildDoneMap(quests, (dayId) => dayId === 'mon')

  assert.deepEqual(weeklySummary(quests, doneMap), { xpEarned: 20, xpTotal: 35, vitalityDelta: 10 })
})

test('buildDoneMap marks nothing done by default and covers every quest', () => {
  const { quests } = buildHomeQuests({ schedule: { mon: ['workout'] }, missionMap, resolve })
  const doneMap = buildDoneMap(quests)
  assert.deepEqual(doneMap, { [questId('mon', 'workout')]: false })
})

test('passing today=null marks no day as today (used when the selected week is not the current one)', () => {
  const { quests, weekSchedule } = buildHomeQuests({
    schedule: { mon: ['workout'], wed: ['reading'] },
    missionMap,
    resolve,
  })
  const { nodes } = buildWeekTrail({ weekSchedule, quests, today: null, doneMap: {} })
  assert.equal(nodes.some((n) => n.isToday), false)

  // ...and a real day key still marks exactly one.
  const marked = buildWeekTrail({ weekSchedule, quests, today: 'wed', doneMap: {} })
  assert.deepEqual(marked.nodes.filter((n) => n.isToday).map((n) => n.dayKey), ['wed'])
})

test('sessionProgressPercent is zero-safe and rounds', () => {
  assert.equal(sessionProgressPercent({ done: 0, total: 0 }), 0)
  assert.equal(sessionProgressPercent({ done: 3, total: 5 }), 60)
  assert.equal(sessionProgressPercent({ done: 1, total: 3 }), 33)
})

// tests/c25kFallback.test.js
// Two risks drive these tests:
//  1. The fallback must reach 5K users (the guide is unreachable without it), and
//  2. it must NOT hijack the plan of anyone who did not ask to run.
// The last block wires the produced slot into deriveRunGuide + aiSlotFor, so "the guide actually
// opens from this overlay" is asserted, not assumed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  C25K_SESSIONS_PER_WEEK,
  C25K_WEEK1_SLOT,
  DEFAULT_RUN_PROGRAM,
  buildC25kFallbackOverlay,
  detectsRunningGoal,
  parseTargetDistanceKm,
  resolveRunProgram,
} from '../src/c25kFallback.js'
import { aiSlotFor } from '../src/aiPlan.js'
import { deriveRunGuide } from '../src/runGuide.js'

// Shape mirrors getDefaultWeekSchedule(): reading most days, workout mon/wed/fri/sun.
const DEFAULT_WEEK = {
  mon: ['reading', 'workout', 'parent-talk'],
  tue: ['reading'],
  wed: ['reading', 'workout', 'parent-talk'],
  thu: ['reading'],
  fri: ['reading', 'workout', 'parent-talk'],
  sat: [],
  sun: ['weekend-review', 'workout', 'parent-talk'],
}

const build = (profile) =>
  buildC25kFallbackOverlay({ profile, version: 'v1', week: 1, defaultWeekSchedule: DEFAULT_WEEK })

// --- detection ----------------------------------------------------------------------------------

test('the running sport selection is a running goal', () => {
  assert.equal(detectsRunningGoal({ sport: 'running', goals: ['exercise'] }), true)
})

test('a 5K stated in the free-text goal is a running goal', () => {
  assert.equal(detectsRunningGoal({ goals: ['exercise'], dream: '3개월 후에 5km 완주하고 싶어요' }), true)
  assert.equal(detectsRunningGoal({ goals: ['exercise'], dream: '5K 대회 나가고 싶어요' }), true)
  assert.equal(detectsRunningGoal({ goals: ['exercise'], dream: '러닝을 습관으로 만들고 싶다' }), true)
  assert.equal(detectsRunningGoal({ goals: ['exercise'], dream: 'I want to run a 5k' }), true)
})

test('the generic exercise goal ALONE is not running — non-runners keep their workout', () => {
  // The regression this whole change must not cause.
  assert.equal(detectsRunningGoal({ goals: ['exercise'] }), false)
  assert.equal(detectsRunningGoal({ goals: ['exercise'], dream: '헬스장에서 벤치프레스 100kg 들기' }), false)
  assert.equal(detectsRunningGoal({ goals: ['exercise'], sport: 'gym', dream: '근육을 키우고 싶어요' }), false)
})

test('detection is safe on absent or malformed profiles', () => {
  for (const bad of [null, undefined, {}, { goals: null }, { dream: 42 }, 'nope']) {
    assert.equal(detectsRunningGoal(bad), false)
  }
})

// --- distance is signal, never a gate -----------------------------------------------------------

test('a stated distance is still read from natural language', () => {
  assert.equal(parseTargetDistanceKm({ dream: '3개월 후에 5km 완주하고 싶어요' }), 5)
  assert.equal(parseTargetDistanceKm({ dream: '10K 대회 목표' }), 10)
  assert.equal(parseTargetDistanceKm({ dream: '21.1킬로 하프' }), 21.1)
  assert.equal(parseTargetDistanceKm({ goals: ['5km 달리기'] }), 5)
})

test('no stated distance is null, not an error', () => {
  assert.equal(parseTargetDistanceKm({ sport: 'running', dream: '꾸준히 달리고 싶어요' }), null)
  assert.equal(parseTargetDistanceKm({}), null)
  assert.equal(parseTargetDistanceKm(null), null)
})

test('a running user with NO distance still gets a programme — the default, not a block', () => {
  // The product decision: absence of a distance must never deny access to the guide.
  assert.equal(resolveRunProgram({ sport: 'running' }), DEFAULT_RUN_PROGRAM)
  assert.equal(resolveRunProgram({ sport: 'running', dream: '건강해지고 싶어요' }), DEFAULT_RUN_PROGRAM)
  const overlay = build({ sport: 'running', dream: '건강해지고 싶어요' })
  assert.ok(overlay, 'a distance-less running profile must still receive c25k')
  assert.equal(overlay.slots['mon|workout'].resourceRef, 'run:c25k')
})

test('a beyond-5K goal still starts on c25k rather than being turned away', () => {
  // C25K is the on-ramp; a 10K goal begins by being able to run 5K.
  assert.equal(resolveRunProgram({ sport: 'running', dream: '10km 완주' }), DEFAULT_RUN_PROGRAM)
})

test('resolveRunProgram returns null for non-running profiles, changing nothing for them', () => {
  assert.equal(resolveRunProgram({ goals: ['exercise'] }), null)
  assert.equal(resolveRunProgram({ goals: ['exercise'], dream: '벤치프레스 100kg' }), null)
  assert.equal(resolveRunProgram(null), null)
})

// --- overlay construction -----------------------------------------------------------------------

test('no overlay is produced for a non-running profile', () => {
  assert.equal(build({ goals: ['exercise'], dream: '벤치프레스 100kg' }), null)
  assert.equal(build(null), null)
})

test('a running profile gets c25k on the first three workout days', () => {
  const overlay = build({ sport: 'running' })
  assert.deepEqual(Object.keys(overlay.slots).sort(), ['fri|workout', 'mon|workout', 'wed|workout'])
  assert.equal(Object.keys(overlay.slots).length, C25K_SESSIONS_PER_WEEK)
})

test('the fourth workout day keeps its generic content', () => {
  // sun is a workout day in DEFAULT_WEEK but is the 4th, so c25k must not claim it.
  assert.equal(build({ sport: 'running' }).slots['sun|workout'], undefined)
})

test('each slot carries the run:c25k guide data the session guide needs', () => {
  const slot = build({ sport: 'running' }).slots['mon|workout']
  assert.equal(slot.resourceRef, 'run:c25k')
  assert.equal(slot.unitLabel, C25K_WEEK1_SLOT.unitLabel)
  assert.equal(slot.estimatedMinutes, 25)
  assert.ok(slot.objectiveKo.length > 0)
})

test('the overlay never claims to be a model plan', () => {
  assert.equal(build({ sport: 'running' }).source, 'fallback-c25k')
})

// --- schedule safety ----------------------------------------------------------------------------

test('the whole default week is preserved, so reading missions are not dropped', () => {
  // The overlay replaces state.schedules[week] wholesale; returning only run days would delete
  // that week's reading/parent-talk missions.
  const overlay = build({ sport: 'running' })
  assert.deepEqual(overlay.schedule, DEFAULT_WEEK)
  assert.deepEqual(overlay.schedule.tue, ['reading'])
  assert.deepEqual(overlay.schedule.sun, ['weekend-review', 'workout', 'parent-talk'])
})

test('no mission is scheduled beyond its default allowance', () => {
  const overlay = build({ sport: 'running' })
  const count = (sched, id) => Object.values(sched).flat().filter((m) => m === id).length
  for (const id of ['reading', 'workout', 'parent-talk', 'weekend-review']) {
    assert.equal(count(overlay.schedule, id), count(DEFAULT_WEEK, id), `${id} count changed`)
  }
})

test('nothing is reported as dropped, so no false capacity warning is logged', () => {
  assert.deepEqual(build({ sport: 'running' }).dropped, { reading: 0, workout: 0 })
})

test('a week with no workout slots yields no overlay rather than a broken one', () => {
  const overlay = buildC25kFallbackOverlay({
    profile: { sport: 'running' },
    version: 'v1',
    week: 1,
    defaultWeekSchedule: { mon: ['reading'], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
  })
  assert.equal(overlay, null)
})

// --- end-to-end: the guide actually opens from this overlay --------------------------------------

test('aiSlotFor + deriveRunGuide produce a real guide from the fallback overlay', () => {
  const overlay = build({ goals: ['exercise'], dream: '3개월 후에 5km 완주하고 싶어요' })
  const slot = aiSlotFor(overlay, 'v1', 1, 'mon', 'workout')
  assert.ok(slot, 'the overlay must be readable through the app\'s own slot lookup')

  const guide = deriveRunGuide(slot)
  assert.ok(guide, 'a run guide must be derivable — otherwise the guide stays unreachable')
  assert.equal(guide.estimatedMinutes, 25)
  assert.deepEqual(guide.interval, { run: { n: 60, unit: '초' }, walk: { n: 90, unit: '초' } })
  assert.equal(guide.steps.find((s) => s.id === 'warmup').minutes, 5)
  assert.equal(guide.steps.find((s) => s.id === 'interval').minutes, 15)
  assert.match(guide.safety.ko, /통증/)
})

test('a non-running day in the same overlay yields no guide', () => {
  const overlay = build({ sport: 'running' })
  assert.equal(deriveRunGuide(aiSlotFor(overlay, 'v1', 1, 'tue', 'reading')), null)
})

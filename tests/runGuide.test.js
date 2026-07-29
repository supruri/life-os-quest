// tests/runGuide.test.js
// The guide's whole risk is fabricated coaching numbers: a made-up warm-up or interval length is
// advice about someone's body, not a cosmetic defect. These tests pin that every minute figure is
// either present in the plan data or arithmetic over figures that are.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveRunGuide, isRunSession, pickRunSession } from '../src/runGuide.js'

// The real c25k week-1 session from public/previews/p5_running_5k.json.
const C25K = {
  title: '카우치 투 5K',
  subtitle: 'NHS 9주 걷기→달리기 입문',
  resourceRef: 'run:c25k',
  estimatedMinutes: 25,
  unitLabel: '1주 — 5분 걷기 후 60초 달리기/90초 걷기 반복 (주 3회)',
  objectiveKo:
    '주 3회 달리기 계획을 세우고, 5분 빠르게 걷고 60초 달리기·90초 걷기를 반복하세요. 달리는 내내 한 문장을 여유 있게 말할 만큼 천천히 — 숨차면 더 느리게.',
  objectiveEn: 'Plan to run three times a week...',
}

const stepById = (guide, id) => guide.steps.find((s) => s.id === id)

// --- gating -------------------------------------------------------------------------------------

test('isRunSession matches the run: prefix, including run:c25k', () => {
  assert.equal(isRunSession('run:c25k'), true)
  assert.equal(isRunSession('run:anything-else'), true)
  assert.equal(isRunSession('strength:runner-prehab'), false)
  assert.equal(isRunSession(null), false)
  assert.equal(isRunSession(undefined), false)
  assert.equal(isRunSession(''), false)
})

test('a non-running session derives no guide, so existing behaviour is untouched', () => {
  assert.equal(deriveRunGuide({ resourceRef: 'strength:runner-prehab', estimatedMinutes: 20 }), null)
  assert.equal(deriveRunGuide({ resourceRef: null }), null)
  assert.equal(deriveRunGuide(null), null)
})

// --- the real c25k session ----------------------------------------------------------------------

test('c25k guide keeps the plan\'s own unitLabel and objective verbatim', () => {
  const g = deriveRunGuide(C25K)
  assert.equal(g.unitLabel, C25K.unitLabel)
  assert.equal(g.objective.ko, C25K.objectiveKo)
  assert.equal(g.estimatedMinutes, 25)
})

test('c25k guide exposes warm-up, interval and cool-down in that order', () => {
  const g = deriveRunGuide(C25K)
  assert.deepEqual(g.steps.map((s) => s.id), ['warmup', 'interval', 'cooldown'])
})

test('warm-up minutes come from the objective text, not a default', () => {
  // "5분 빠르게 걷고" -> 5
  assert.equal(stepById(deriveRunGuide(C25K), 'warmup').minutes, 5)
})

test('the interval step reflects the parsed run/walk pattern', () => {
  const g = deriveRunGuide(C25K)
  assert.deepEqual(g.interval, { run: { n: 60, unit: '초' }, walk: { n: 90, unit: '초' } })
  assert.match(stepById(g, 'interval').detail.ko, /60초 달리기/)
  assert.match(stepById(g, 'interval').detail.ko, /90초 걷기/)
})

test('interval minutes are total minus the two bookends, never guessed', () => {
  // 25 total - 5 warm-up - 5 cool-down = 15
  assert.equal(stepById(deriveRunGuide(C25K), 'interval').minutes, 15)
})

// --- the no-fabrication guarantees --------------------------------------------------------------

test('without a warm-up in the text, warm-up and cool-down minutes stay null', () => {
  const g = deriveRunGuide({ resourceRef: 'run:c25k', estimatedMinutes: 30, objectiveKo: '편하게 30분 달리기' })
  assert.equal(stepById(g, 'warmup').minutes, null)
  assert.equal(stepById(g, 'cooldown').minutes, null)
  // and with no bookends to subtract, the interval length is not invented either
  assert.equal(stepById(g, 'interval').minutes, null)
})

test('without estimatedMinutes the interval length is null even when the warm-up is known', () => {
  const g = deriveRunGuide({ resourceRef: 'run:c25k', objectiveKo: '5분 빠르게 걷고 60초 달리기·90초 걷기 반복' })
  assert.equal(stepById(g, 'warmup').minutes, 5)
  assert.equal(stepById(g, 'interval').minutes, null)
  assert.equal(g.estimatedMinutes, null)
})

test('a later interval walk is never mistaken for the warm-up', () => {
  // No leading walk clause: "90초 걷기" appears only as the interval half.
  const g = deriveRunGuide({ resourceRef: 'run:c25k', objectiveKo: '60초 달리기·90초 걷기를 반복하세요.' })
  assert.equal(stepById(g, 'warmup').minutes, null)
})

test('bookends longer than the session do not produce a zero or negative interval', () => {
  const g = deriveRunGuide({ resourceRef: 'run:c25k', estimatedMinutes: 10, objectiveKo: '5분 걷기 후 시작' })
  assert.equal(stepById(g, 'interval').minutes, null)
})

test('a continuous run falls back to the plan\'s own wording instead of a fake structure', () => {
  const objectiveKo = '20분 동안 편하게 이어서 달리세요.'
  const g = deriveRunGuide({ resourceRef: 'run:c25k', objectiveKo, estimatedMinutes: 20 })
  assert.equal(g.interval, null)
  assert.equal(stepById(g, 'interval').detail.ko, objectiveKo)
})

// --- "start today's workout" target selection ---------------------------------------------------

test('pickRunSession returns the day\'s run session so Home can open its guide', () => {
  const run = { missionId: 'workout', dayKey: 'mon', resourceRef: 'run:c25k' }
  const sessions = [{ missionId: 'reading', resourceRef: '' }, run]
  assert.equal(pickRunSession(sessions), run)
})

test('pickRunSession takes the FIRST run session when a day has several', () => {
  const first = { id: 'a', resourceRef: 'run:c25k' }
  assert.equal(pickRunSession([first, { id: 'b', resourceRef: 'run:c25k' }]), first)
})

test('pickRunSession returns null for a day with no run, so Home keeps its old behaviour', () => {
  assert.equal(pickRunSession([{ resourceRef: 'strength:runner-prehab' }, { resourceRef: '' }]), null)
  assert.equal(pickRunSession([]), null)
  assert.equal(pickRunSession(undefined), null)
  assert.equal(pickRunSession(null), null)
})

// --- safety -------------------------------------------------------------------------------------

test('every run guide carries a stop-if-pain note in both languages', () => {
  for (const session of [C25K, { resourceRef: 'run:c25k', objectiveKo: '' }]) {
    const g = deriveRunGuide(session)
    assert.match(g.safety.ko, /통증/)
    assert.match(g.safety.en, /Stop if it hurts/)
  }
})

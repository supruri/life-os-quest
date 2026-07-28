// tests/firebaseAuthErrors.test.js
// The sign-in screen must never render a raw Firebase SDK string, and must not blame the user's
// credentials for a project-configuration mistake.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translateAuthError } from '../src/firebase/authErrors.js'

const FALLBACK = '문제가 발생했어요. 다시 시도해 주세요.'

test('wrong credentials map to one message across the modern and legacy codes', () => {
  const expected = '이메일 또는 비밀번호가 올바르지 않아요. 처음이시라면 회원가입을 먼저 해주세요.'
  assert.equal(translateAuthError({ code: 'auth/invalid-credential' }), expected)
  assert.equal(translateAuthError({ code: 'auth/wrong-password' }), expected)
  assert.equal(translateAuthError({ code: 'auth/user-not-found' }), expected)
})

test('the failed-login message points at signup, since old accounts were not carried over', () => {
  // Firebase collapses "no such account" into auth/invalid-credential, and after the clean-boundary
  // decision that is the likeliest cause — the copy must not send those users to a password reset.
  assert.match(translateAuthError({ code: 'auth/invalid-credential' }), /회원가입/)
})

test('a duplicate signup points the user at logging in', () => {
  assert.equal(translateAuthError({ code: 'auth/email-already-in-use' }), '이미 가입된 이메일이에요. 로그인해 주세요.')
})

test('provider-not-enabled reads as a setup problem, not a bad password', () => {
  // Firebase returns this when Email/Password sign-in was never enabled in the console.
  assert.match(translateAuthError({ code: 'auth/operation-not-allowed' }), /활성화/)
})

test('an unconfigured project is reported as a server setup problem', () => {
  assert.match(translateAuthError({ name: 'FirebaseNotConfiguredError' }), /서버 설정/)
})

test('an unknown or missing error falls back without leaking the SDK message', () => {
  const raw = { code: 'auth/internal-error', message: 'Firebase: Error (auth/internal-error).' }
  assert.equal(translateAuthError(raw), FALLBACK)
  assert.equal(translateAuthError(null), FALLBACK)
  assert.equal(translateAuthError(undefined), FALLBACK)
  // the raw English SDK text must never reach the screen
  assert.ok(!translateAuthError(raw).includes('Firebase'))
})

// tests/firebaseProviderAuth.test.js
// The popup-vs-redirect choice decides whether mobile users can sign in at all: a popup on a
// mobile or in-app browser is blocked or opened in a tab the SDK can never read back, stranding
// the user on a blank screen. It is pure so it can be pinned without a browser.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isUserCancelledAuth, prefersRedirect } from '../src/firebase/providerFlow.js'
import { translateAuthError } from '../src/firebase/authErrors.js'

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

test('mobile browsers get the redirect flow', () => {
  assert.equal(prefersRedirect(IOS), true)
  assert.equal(prefersRedirect(ANDROID), true)
})

test('in-app webviews get the redirect flow too — popups are unusable there', () => {
  assert.equal(prefersRedirect('Mozilla/5.0 (iPhone) KAKAOTALK 10.4.0'), true)
  assert.equal(prefersRedirect('Mozilla/5.0 (Linux; Android 13) Instagram 300.0'), true)
  assert.equal(prefersRedirect('Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/440]'), true)
  assert.equal(prefersRedirect('Mozilla/5.0 (iPhone) Line/13.0.0'), true)
})

test('desktop keeps the popup, so the user never loses the page', () => {
  assert.equal(prefersRedirect(DESKTOP), false)
  assert.equal(prefersRedirect(MAC), false)
})

test('a missing user agent falls back to the popup rather than throwing', () => {
  assert.equal(prefersRedirect(undefined), false)
  assert.equal(prefersRedirect(''), false)
  assert.equal(prefersRedirect(null), false)
})

test('deliberate cancellation is recognised so it is never shown as an error', () => {
  assert.equal(isUserCancelledAuth({ code: 'auth/popup-closed-by-user' }), true)
  assert.equal(isUserCancelledAuth({ code: 'auth/user-cancelled' }), true)
  assert.equal(isUserCancelledAuth({ code: 'auth/popup-blocked' }), false)
  assert.equal(isUserCancelledAuth(null), false)
})

test('provider failures map to actionable Korean copy, never raw SDK text', () => {
  const collision = translateAuthError({ code: 'auth/account-exists-with-different-credential' })
  assert.match(collision, /다른 방법으로 이미 가입/)
  // A domain misconfiguration is a setup fault — it must not read as the user's mistake.
  assert.match(translateAuthError({ code: 'auth/unauthorized-domain' }), /관리자/)
  assert.match(translateAuthError({ code: 'auth/popup-blocked' }), /팝업/)
  for (const code of [
    'auth/account-exists-with-different-credential',
    'auth/unauthorized-domain',
    'auth/popup-blocked',
  ]) {
    assert.ok(!translateAuthError({ code }).includes('Firebase'))
  }
})

// Firebase Auth error codes -> Korean user-facing copy.
//
// Firebase reports failures as `err.code` ('auth/invalid-credential'); the raw `err.message` is an
// English SDK string like "Firebase: Error (auth/invalid-credential)." Matching on the code keeps
// that internal text off the screen and out of the UI's control flow.

const MESSAGES = {
  // Modern Firebase collapses wrong-password / unknown-account into one code when email
  // enumeration protection is on, so this one string has to serve both. Since accounts from the
  // previous build were not carried over, "no such account" is the likelier case for now — hence
  // the nudge to sign up, which would otherwise leave returning users resetting a password for an
  // account that does not exist. The legacy pair is mapped too, for projects with protection off.
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않아요. 처음이시라면 회원가입을 먼저 해주세요.',
  'auth/wrong-password': '이메일 또는 비밀번호가 올바르지 않아요. 처음이시라면 회원가입을 먼저 해주세요.',
  'auth/user-not-found': '이메일 또는 비밀번호가 올바르지 않아요. 처음이시라면 회원가입을 먼저 해주세요.',
  'auth/invalid-email': '이메일 형식이 올바르지 않아요.',
  'auth/user-disabled': '사용이 중지된 계정이에요.',
  'auth/email-already-in-use': '이미 가입된 이메일이에요. 로그인해 주세요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
  'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 시도해 주세요.',
  'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
  // Surfaced when Email/Password sign-in has not been enabled in the Firebase console — a setup
  // mistake, not a user mistake, so it says so instead of blaming the credentials.
  'auth/operation-not-allowed': '이메일 로그인이 아직 활성화되지 않았어요. 관리자에게 문의해 주세요.',
  // --- provider (Google / Apple) sign-in ---
  // Same email already registered another way. Tell the user which way, not "unknown error".
  'auth/account-exists-with-different-credential':
    '이 이메일은 다른 방법으로 이미 가입되어 있어요. 기존 방법으로 로그인해 주세요.',
  // The serving domain is not in Firebase Auth's authorised list — a setup mistake, not a user one.
  'auth/unauthorized-domain': '이 주소에서는 소셜 로그인을 사용할 수 없어요. 관리자에게 문의해 주세요.',
  'auth/popup-blocked': '팝업이 차단되어 있어요. 차단을 해제하거나 다시 시도해 주세요.',
  'auth/credential-already-in-use': '이미 다른 계정에 연결된 로그인이에요.',
}

const FALLBACK = '문제가 발생했어요. 다시 시도해 주세요.'

export function translateAuthError(error) {
  if (!error) return FALLBACK
  if (error.name === 'FirebaseNotConfiguredError') {
    return '서버 설정이 완료되지 않았어요. 관리자에게 문의해 주세요.'
  }
  return MESSAGES[error.code] ?? FALLBACK
}

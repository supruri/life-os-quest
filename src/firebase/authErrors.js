// Firebase Auth error codes -> Korean user-facing copy.
//
// Firebase reports failures as `err.code` ('auth/invalid-credential'); the raw `err.message` is an
// English SDK string like "Firebase: Error (auth/invalid-credential)." Matching on the code keeps
// that internal text off the screen and out of the UI's control flow.

const MESSAGES = {
  // Modern Firebase collapses wrong-password / unknown-account into one code when email
  // enumeration protection is on. The legacy pair is mapped too, for projects with it off.
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않아요.',
  'auth/wrong-password': '이메일 또는 비밀번호가 올바르지 않아요.',
  'auth/user-not-found': '이메일 또는 비밀번호가 올바르지 않아요.',
  'auth/invalid-email': '이메일 형식이 올바르지 않아요.',
  'auth/user-disabled': '사용이 중지된 계정이에요.',
  'auth/email-already-in-use': '이미 가입된 이메일이에요. 로그인해 주세요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
  'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 시도해 주세요.',
  'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
  // Surfaced when Email/Password sign-in has not been enabled in the Firebase console — a setup
  // mistake, not a user mistake, so it says so instead of blaming the credentials.
  'auth/operation-not-allowed': '이메일 로그인이 아직 활성화되지 않았어요. 관리자에게 문의해 주세요.',
}

const FALLBACK = '문제가 발생했어요. 다시 시도해 주세요.'

export function translateAuthError(error) {
  if (!error) return FALLBACK
  if (error.name === 'FirebaseNotConfiguredError') {
    return '서버 설정이 완료되지 않았어요. 관리자에게 문의해 주세요.'
  }
  return MESSAGES[error.code] ?? FALLBACK
}

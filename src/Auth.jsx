import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { consumeRedirectResult, isUserCancelledAuth, signIn, signInWithGoogle, signUp } from './firebase/index.js'
import { translateAuthError } from './firebase/authErrors.js'

// Google's mark, inlined rather than fetched: the CSP on the deployed site blocks external images,
// and a sign-in button that renders without its logo looks broken.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [providerBusy, setProviderBusy] = useState(false)

  // The redirect leg finishes here. onAuthStateChanged already restores the session, so this
  // exists only to surface an error (unauthorised domain, account collision) that would otherwise
  // disappear when the browser navigated away and back.
  useEffect(() => {
    let active = true
    consumeRedirectResult().catch((err) => {
      if (!active || isUserCancelledAuth(err)) return
      setError(translateAuthError(err))
    })
    return () => {
      active = false
    }
  }, [])

  const startGoogle = async () => {
    setError('')
    setInfo('')
    setProviderBusy(true)
    try {
      const result = await signInWithGoogle()
      // On the redirect path the browser is navigating away; keep the button disabled rather than
      // flashing it back to idle mid-navigation.
      if (result?.redirecting) return
    } catch (err) {
      // A user who closes the popup made a choice; that is not an error to shout about.
      if (!isUserCancelledAuth(err)) setError(translateAuthError(err))
    } finally {
      setProviderBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!email.trim() || password.length < 6) {
      setError('이메일과 6자 이상의 비밀번호를 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') {
        const data = await signUp(email.trim(), password)
        // Firebase signs a new account in immediately, so a session is expected here. Kept as a
        // guard rather than an assumption: if sign-in verification is ever enforced, this is the
        // branch that tells the user instead of leaving them on a silent, unchanged screen.
        if (!data.session) {
          setInfo('가입 완료! 이메일 인증이 필요하면 메일을 확인한 뒤 로그인해 주세요.')
          setMode('login')
        }
      } else {
        await signIn(email.trim(), password)
      }
      // On success, App's auth listener swaps the screen automatically.
    } catch (err) {
      setError(translateAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-200">
            <Sparkles size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Life Game</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {mode === 'login' ? '다시 오신 걸 환영해요' : '계정을 만들어 시작하세요'}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1">
          {[
            ['login', '로그인'],
            ['signup', '회원가입'],
          ].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError('')
                setInfo('')
              }}
              className={`h-10 rounded-lg text-sm font-black transition ${
                mode === m ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Firebase is a clean signup boundary: accounts from the Supabase-era build were not
            carried over (passwords cannot be moved between identity providers). Without this the
            only feedback a returning user gets is "wrong password", which sends them to reset a
            password for an account that does not exist here. */}
        {mode === 'login' && (
          <p className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold leading-relaxed text-slate-500">
            이전 버전에서 쓰던 계정은 이어지지 않아요. 처음이시라면{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError('')
                setInfo('')
              }}
              className="font-black text-indigo-600 underline underline-offset-2"
            >
              회원가입
            </button>
            으로 새 계정을 만들어 주세요.
          </p>
        )}

        {/* Provider sign-in sits above the form: it is the faster path, and email/password stays
            untouched below it for anyone who prefers it. */}
        <button
          type="button"
          onClick={startGoogle}
          disabled={providerBusy || busy}
          className="mb-4 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:text-slate-400"
        >
          <GoogleMark />
          {providerBusy ? '연결 중…' : 'Google로 계속하기'}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-bold text-slate-400">또는 이메일로</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={submit} className="grid gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-black text-slate-700">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-black text-slate-700">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="6자 이상"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          {info && <p className="text-sm font-semibold text-emerald-600">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-xl bg-indigo-500 text-sm font-black text-white transition hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>
    </main>
  )
}

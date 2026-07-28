import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { signIn, signUp } from './firebase/index.js'
import { translateAuthError } from './firebase/authErrors.js'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

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

import { useState } from 'react'
import {
  ArrowRight, ArrowLeft, Sparkles, Check, Lock,
  Activity, BookOpen, Footprints, PersonStanding, Waves, Dumbbell, Bike,
} from 'lucide-react'

// Running beta: only 운동(exercise) is open; the rest are locked ("준비 중").
// `legacy: true` entries are NOT shown in the picker (filtered in GoalStep) — they exist only so
// App's GOAL_LABEL_MAP still resolves the pre-beta goal ids on existing profiles (avoids raw-id tags).
export const GOAL_OPTIONS = [
  { id: 'exercise', label: '운동', desc: '러닝으로 시작하는 루틴', icon: Activity },
  { id: 'reading', label: '독서', desc: '읽기 습관 만들기', icon: BookOpen, locked: true },
  { id: 'selfdev', label: '자기계발', desc: '새 지식·기술 익히기', icon: Sparkles, locked: true },
  { id: 'health', label: '건강한 습관 만들기', legacy: true },
  { id: 'career', label: '커리어 성장', legacy: true },
  { id: 'mindset', label: '마음 챙김', legacy: true },
  { id: 'custom', label: '사용자 정의', legacy: true },
]

// Within 운동, only 런닝 is open in the beta.
const SPORT_OPTIONS = [
  { id: 'running', label: '런닝', desc: '초보자 걷기–달리기', icon: Footprints },
  { id: 'walking', label: '걷기', icon: PersonStanding, locked: true },
  { id: 'swimming', label: '수영', icon: Waves, locked: true },
  { id: 'gym', label: '헬스', icon: Dumbbell, locked: true },
  { id: 'cycling', label: '자전거', icon: Bike, locked: true },
]

const STATE_FIELDS = [
  { id: 'fitness', label: '체력', options: ['낮음', '보통', '높음'] },
  { id: 'age', label: '나이', options: ['10대', '20대', '30대', '40대', '50대 이상'] },
  { id: 'job', label: '직업', options: ['학생', '직장인', '프리랜서', '자영업', '기타'] },
]

const PATTERN_FIELDS = [
  { id: 'sleep', label: '수면 시간', options: ['5시간 이하', '6시간', '7시간', '8시간', '9시간 이상'] },
  { id: 'activity', label: '선호 활동', options: ['영상', '독서', '운동', '대화', '창작'] },
  { id: 'freeTime', label: '투자 가능 시간', options: ['30분 이하', '30분-1시간', '1-2시간', '2시간 이상'] },
  { id: 'focusTime', label: '집중 시간대', options: ['아침', '오후', '저녁', '밤'] },
]

const DURATION_OPTIONS = ['1주', '2주', '3주', '4주', '2개월', '3개월', '4개월', '5개월', '6개월']

const TOTAL_STEPS = 7 // welcome + goal, sport, dream, state, pattern, duration

function ProgressDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === step ? 'w-6 bg-indigo-500' : i < step ? 'w-1.5 bg-indigo-300' : 'w-1.5 bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-black text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
    >
      {children}
    </button>
  )
}

function Welcome({ onNext }) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-200">
          <Sparkles size={30} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Life Game</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            AI가 당신을 이해하고
            <br />
            성장의 길을 함께 설계합니다.
          </p>
        </div>
      </div>
      <div className="w-full">
        <PrimaryButton onClick={onNext}>
          시작하기 <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    </div>
  )
}

// One card used by the goal + sport pickers. Locked cards are greyed, show a lock, and are inert.
function LockableCard({ icon: Icon, label, desc, locked, selected, onClick }) {
  if (locked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-300">
          <Icon size={20} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-400">{label}</span>
          {desc && <span className="block text-xs text-slate-300">{desc}</span>}
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-black text-slate-400">
          <Lock size={12} /> 준비 중
        </span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
        selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg transition ${
          selected ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-500'
        }`}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-900">{label}</span>
        {desc && <span className="block text-xs text-slate-500">{desc}</span>}
      </span>
      <span
        className={`ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
          selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 bg-white'
        }`}
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  )
}

function ChoiceStep({ title, subtitle, options, isSelected, onSelect, onNext, nextDisabled }) {
  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="flex-1">
        <h2 className="text-center text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-center text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6 grid gap-2.5">
          {options.map((opt) => (
            <LockableCard
              key={opt.id}
              icon={opt.icon}
              label={opt.label}
              desc={opt.desc}
              locked={opt.locked}
              selected={isSelected(opt.id)}
              onClick={() => onSelect(opt.id)}
            />
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb] to-transparent pb-2 pt-3">
        <PrimaryButton onClick={onNext} disabled={nextDisabled}>
          다음 <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    </div>
  )
}

function GoalStep({ value, onChange, onNext }) {
  return (
    <ChoiceStep
      title="당신의 목표는 무엇인가요?"
      subtitle="지금은 운동부터 열려 있어요."
      options={GOAL_OPTIONS.filter((o) => !o.legacy)}
      isSelected={(id) => value.includes(id)}
      onSelect={(id) => onChange([id])} // one active category in the beta
      onNext={onNext}
      nextDisabled={value.length === 0}
    />
  )
}

function SportStep({ value, onChange, onNext }) {
  return (
    <ChoiceStep
      title="어떤 운동으로 시작할까요?"
      subtitle="런닝부터 열려 있어요."
      options={SPORT_OPTIONS}
      isSelected={(id) => value === id}
      onSelect={(id) => onChange(id)}
      onNext={onNext}
      nextDisabled={!value}
    />
  )
}

function StepLayout({ title, subtitle, children, onNext, nextDisabled, nextLabel = '다음', lastStep }) {
  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="flex-1">
        <h2 className="text-center text-xl font-black text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1 text-center text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb] to-transparent pb-2 pt-3">
        <PrimaryButton onClick={onNext} disabled={nextDisabled}>
          {lastStep ? nextLabel : <>다음 <ArrowRight size={16} /></>}
        </PrimaryButton>
      </div>
    </div>
  )
}

function DreamStep({ value, onChange, onNext }) {
  return (
    <StepLayout title="달리기에서의 목표는 무엇인가요?" subtitle="자유롭게 적어 주세요." onNext={onNext} nextDisabled={!value?.trim()}>
      {/* Figma Frame 7: counter sits inside the field top-right, helper text below the field. */}
      <div className="relative">
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value.slice(0, 240))}
          rows={5}
          placeholder="예) 3개월 안에 5km를 쉬지 않고 완주하고 싶어요."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 pr-16 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
        />
        <span className="absolute right-3 top-3 text-xs text-slate-400">{(value ?? '').length}/240</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">구체적으로 적을수록 플랜이 정확해져요.</p>
    </StepLayout>
  )
}

// Dropdown replaced by tappable buttons (running-beta onboarding redesign).
function ButtonField({ label, options, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                selected
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ButtonFieldsStep({ title, subtitle, fields, values, onChange, onNext, lastStep, nextLabel }) {
  const allFilled = fields.every((f) => values?.[f.id])
  return (
    <StepLayout title={title} subtitle={subtitle} onNext={onNext} nextDisabled={!allFilled} lastStep={lastStep} nextLabel={nextLabel}>
      <div className="grid gap-5">
        {fields.map((f) => (
          <ButtonField
            key={f.id}
            label={f.label}
            options={f.options}
            value={values?.[f.id]}
            onChange={(v) => onChange({ ...values, [f.id]: v })}
          />
        ))}
      </div>
    </StepLayout>
  )
}

function DurationStep({ value, onChange, onNext }) {
  return (
    <StepLayout
      title="얼마동안의 플랜을 짜드릴까요?"
      subtitle="기간에 맞춰 성장 계획을 설계해요."
      onNext={onNext}
      nextDisabled={!value}
      lastStep
      nextLabel="플랜 만들기"
    >
      <ButtonField label="플랜 기간" options={DURATION_OPTIONS} value={value} onChange={onChange} />
    </StepLayout>
  )
}

const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map((o) => [o.id, o.label]))
const SPORT_LABELS = Object.fromEntries(SPORT_OPTIONS.map((o) => [o.id, o.label]))

function SummaryPopup({ profile, onConfirm }) {
  const goals = (profile.goals ?? []).map((id) => GOAL_LABELS[id] ?? id)
  const sport = profile.sport ? SPORT_LABELS[profile.sport] ?? profile.sport : null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-indigo-500 text-white">
          <Sparkles size={24} />
        </div>
        <h2 className="text-center text-lg font-black leading-7 text-slate-950">
          <span className="text-indigo-600">{profile.duration ?? ''}</span>간의 플랜이
          <br />
          완성되었습니다!
        </h2>
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">내 목표</p>
          {goals.length ? (
            <ul className="grid gap-1.5">
              {goals.map((g) => (
                <li key={g} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Check size={15} className="shrink-0 text-indigo-500" strokeWidth={3} />
                  {g}
                  {sport ? <span className="text-slate-400">· {sport}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">목표를 선택하지 않았어요.</p>
          )}
        </div>
        <div className="mt-6">
          <PrimaryButton onClick={onConfirm}>
            시작하기 <ArrowRight size={16} />
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

export default function Onboarding({ initialProfile, onProfileChange, onComplete }) {
  const [profile, setProfile] = useState(() => ({ goals: [], _step: 0, ...initialProfile }))
  const [showSummary, setShowSummary] = useState(false)
  const step = Math.min(TOTAL_STEPS - 1, profile._step ?? 0)

  // Persist every change (incl. current step) so progress survives reload / resumes per account.
  const commit = (nextProfile) => {
    setProfile(nextProfile)
    onProfileChange?.(nextProfile)
  }
  const patch = (changes) => commit({ ...profile, ...changes })
  const next = () => commit({ ...profile, _step: Math.min(TOTAL_STEPS - 1, step + 1) })
  const back = () => commit({ ...profile, _step: Math.max(0, step - 1) })
  const finish = () => onComplete({ ...profile, _step: TOTAL_STEPS - 1 })

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-5">
        {step > 0 && (
          <div className="mb-6 grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
            <button
              type="button"
              onClick={back}
              aria-label="뒤로"
              className="grid h-10 w-10 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <ArrowLeft size={20} />
            </button>
            <ProgressDots step={step} />
            <span />
          </div>
        )}
        {step === 0 && <Welcome onNext={next} />}
        {step === 1 && <GoalStep value={profile.goals} onChange={(goals) => patch({ goals })} onNext={next} />}
        {step === 2 && <SportStep value={profile.sport} onChange={(sport) => patch({ sport })} onNext={next} />}
        {step === 3 && <DreamStep value={profile.dream} onChange={(dream) => patch({ dream })} onNext={next} />}
        {step === 4 && (
          <ButtonFieldsStep
            title="현재의 내 상태"
            subtitle="지금의 나를 알려 주세요."
            fields={STATE_FIELDS}
            values={profile.currentState}
            onChange={(currentState) => patch({ currentState })}
            onNext={next}
          />
        )}
        {step === 5 && (
          <ButtonFieldsStep
            title="내 생활패턴"
            subtitle="일상을 알려 주면 더 잘 맞춰 드려요."
            fields={PATTERN_FIELDS}
            values={profile.pattern}
            onChange={(pattern) => patch({ pattern })}
            onNext={next}
          />
        )}
        {step === 6 && (
          <DurationStep
            value={profile.duration}
            onChange={(duration) => patch({ duration })}
            onNext={() => setShowSummary(true)}
          />
        )}
      </div>
      {showSummary && <SummaryPopup profile={profile} onConfirm={finish} />}
    </main>
  )
}

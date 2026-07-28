import { trailPoints, smoothPath } from '../runningTrail.js'

const VIEW = { width: 320, height: 120, padX: 22, amp: 34 }

function hexPath(cx, cy, r) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  })
  return `M ${pts.join(' L ')} Z`
}

// Presentation for the "ROAD TO" trail. Geometry comes from runningTrail.js (unit-tested);
// only the drawing lives here. RunningPlanView keeps its own copy so the DEV fixture harness
// is untouched by this change.
export default function Trail({ nodes, gateEmoji = '🏁', label }) {
  const pathPoints = trailPoints(nodes.length + 2, VIEW)
  const trailhead = pathPoints[0]
  const gate = pathPoints[pathPoints.length - 1]

  // Ink ONLY the entry segment of each completed session day, so a done Friday never paves
  // over an undone Monday.
  const doneSegments = nodes
    .map((n, i) => (n.kind === 'session' && n.isDone ? i : -1))
    .filter((i) => i >= 0)
    .map((i) => ({ i, d: smoothPath([pathPoints[i], pathPoints[i + 1]]) }))

  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="w-full"
      style={{ height: 'auto' }}
      role="img"
      aria-label={label}
    >
      <path
        d={smoothPath(pathPoints)}
        fill="none"
        strokeWidth="5"
        strokeDasharray="2 9"
        strokeLinecap="round"
        className="stroke-indigo-200"
      />
      {doneSegments.map(({ i, d }) => (
        <path key={i} d={d} fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-indigo-500" />
      ))}

      <circle cx={trailhead.x} cy={trailhead.y} r="3.5" className="fill-slate-300" />

      {nodes.map((n, i) => {
        const p = pathPoints[i + 1]
        if (n.kind === 'rest') {
          return <circle key={n.dayKey} cx={p.x} cy={p.y} r="3.5" className="fill-slate-300" />
        }
        if (n.isDone) {
          return (
            <g key={n.dayKey}>
              <circle cx={p.x} cy={p.y} r="9" className="fill-indigo-500" />
              <path
                d={`M ${p.x - 4} ${p.y} l 3 3 l 6 -6`}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-white"
              />
            </g>
          )
        }
        if (n.isToday) {
          return (
            <g key={n.dayKey}>
              <circle cx={p.x} cy={p.y} r="11" strokeWidth="3" className="fill-white stroke-indigo-500" />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="13">🏃</text>
            </g>
          )
        }
        return (
          <circle key={n.dayKey} cx={p.x} cy={p.y} r="7.5" strokeWidth="2" className="fill-slate-100 stroke-slate-200" />
        )
      })}

      <g>
        <path d={hexPath(gate.x, gate.y, 11)} strokeWidth="2.5" className="fill-indigo-50 stroke-indigo-300" />
        <text x={gate.x} y={gate.y + 4} textAnchor="middle" fontSize="12">{gateEmoji}</text>
      </g>
    </svg>
  )
}

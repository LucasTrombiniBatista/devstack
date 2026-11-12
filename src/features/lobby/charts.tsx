import { useLayoutEffect, useRef, useState } from 'react'
import { parseDay } from '@/features/planner/time'
import { heatLevel, SERIES, shade } from './colors'
import type { DayFocus, TrackTime, WeekDone } from './stats'

/**
 * Gráficos do Lobby em SVG próprio. As cores saem dos tokens da aparência
 * (`--chart-*`), então acompanham a paleta escolhida em Configurações.
 */

const axis = 'fill-muted-foreground font-mono text-[10px]'

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth || fallback)
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [fallback])
  return [ref, width] as const
}

export function Heatmap({
  year,
  locale,
  label,
  weekdays,
  format,
}: {
  year: DayFocus[]
  locale: string
  label: string
  weekdays: [string, string, string]
  format: (day: DayFocus) => string
}) {
  const cell = 11
  const gap = 3
  const top = 16
  const left = 28
  const offset = parseDay(year[0].day).getDay()
  const cols = Math.ceil((year.length + offset) / 7)
  // Rótulo do mês na primeira coluna (domingo) de cada mês.
  const months = new Map<string, string>()
  for (let i = 0, last = -1; i < year.length; i++) {
    const date = parseDay(year[i].day)
    if ((i + offset) % 7 === 0 && date.getMonth() !== last && date.getDate() <= 7) {
      last = date.getMonth()
      months.set(year[i].day, date.toLocaleDateString(locale, { month: 'short' }).replace('.', ''))
    }
  }

  return (
    // Rolável pelo teclado em telas estreitas.
    <div
      tabIndex={0}
      className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <svg
        role="img"
        aria-label={label}
        width={left + cols * (cell + gap)}
        height={top + 7 * (cell + gap)}
      >
        {weekdays.map((name, i) => (
          <text key={name} x={0} y={top + (1 + i * 2) * (cell + gap) + 9} className={axis}>
            {name}
          </text>
        ))}
        {year.map((d, i) => {
          const k = i + offset
          const col = Math.floor(k / 7)
          const row = k % 7
          const month = months.get(d.day)
          return (
            <g key={d.day}>
              {month && (
                <text x={left + col * (cell + gap)} y={10} className={axis}>
                  {month}
                </text>
              )}
              <rect
                x={left + col * (cell + gap)}
                y={top + row * (cell + gap)}
                width={cell}
                height={cell}
                rx={2.5}
                fill={heatLevel(d.min)}
              >
                <title>{format(d)}</title>
              </rect>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function Bars({
  days,
  goalMin,
  label,
  todayLabel,
  format,
}: {
  days: DayFocus[]
  goalMin: number | null
  label: string
  todayLabel: string
  format: (day: DayFocus) => string
}) {
  const [ref, width] = useWidth<HTMLDivElement>(560)
  const height = 200
  const pl = 34
  const pb = 22
  const pt = 8
  const peak = Math.max(goalMin ?? 0, ...days.map((d) => d.min), 60)
  const max = Math.ceil(peak / 60) * 60
  const y = (v: number) => pt + (height - pt - pb) * (1 - v / max)
  const bw = (width - pl) / days.length
  const ticks = [0, max / 3, (2 * max) / 3, max].map(Math.round)

  return (
    <div ref={ref}>
      <svg role="img" aria-label={label} width={width} height={height}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pl} x2={width} y1={y(v)} y2={y(v)} stroke="var(--border)" />
            <text x={0} y={y(v) + 3} className={axis}>
              {v}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const isToday = i === days.length - 1
          return (
            <g key={d.day}>
              <rect
                x={pl + i * bw + bw * 0.18}
                y={y(d.min)}
                width={bw * 0.64}
                height={Math.max(y(0) - y(d.min), 0)}
                rx={4}
                fill={isToday ? 'var(--chart-1)' : shade(60)}
              >
                <title>{format(d)}</title>
              </rect>
              {(i % 2 === 1 || isToday) && (
                <text x={pl + i * bw + bw / 2} y={height - 6} textAnchor="middle" className={axis}>
                  {isToday ? todayLabel : parseDay(d.day).getDate()}
                </text>
              )}
            </g>
          )
        })}
        {goalMin !== null && (
          <line
            x1={pl}
            x2={width}
            y1={y(goalMin)}
            y2={y(goalMin)}
            stroke="var(--foreground)"
            strokeDasharray="4 4"
            strokeWidth={1.2}
          />
        )}
      </svg>
    </div>
  )
}

export function Line({
  weeks,
  label,
  weekLabel,
  thisWeekLabel,
  format,
}: {
  weeks: WeekDone[]
  label: string
  weekLabel: (n: number) => string
  thisWeekLabel: string
  format: (week: WeekDone) => string
}) {
  const [ref, width] = useWidth<HTMLDivElement>(900)
  const height = 200
  const pl = 34
  const pb = 22
  const pt = 10
  const max = Math.max(4, Math.ceil(weeks.at(-1)!.total / 4) * 4)
  const y = (v: number) => pt + (height - pt - pb) * (1 - v / max)
  const x = (i: number) => pl + 12 + (i * (width - pl - 28)) / (weeks.length - 1)
  const points = weeks.map((w, i) => `${x(i)},${y(w.total)}`).join(' ')
  const last = weeks.length - 1

  return (
    <div ref={ref}>
      <svg role="img" aria-label={label} width={width} height={height}>
        {[0, 1, 2, 3, 4].map((k) => {
          const v = (max / 4) * k
          return (
            <g key={k}>
              <line x1={pl} x2={width} y1={y(v)} y2={y(v)} stroke="var(--border)" />
              <text x={0} y={y(v) + 3} className={axis}>
                {v}
              </text>
            </g>
          )
        })}
        <polygon points={`${x(0)},${y(0)} ${points} ${x(last)},${y(0)}`} fill={shade(18)} />
        <polyline
          points={points}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {weeks.map((w, i) => (
          <g key={w.start}>
            <circle
              cx={x(i)}
              cy={y(w.total)}
              r={i === last ? 5.5 : 3.5}
              fill={i === last ? 'var(--chart-1)' : 'var(--sidebar)'}
              stroke="var(--chart-1)"
              strokeWidth={2}
            >
              <title>{format(w)}</title>
            </circle>
            {(i % 2 === 1 || i === last) && (
              <text x={x(i)} y={height - 6} textAnchor="middle" className={axis}>
                {i === last ? thisWeekLabel : weekLabel(i + 1)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

export function Donut({
  parts,
  label,
  center,
  name,
  format,
}: {
  parts: TrackTime[]
  label: string
  center: string
  name: (part: TrackTime) => string
  format: (part: TrackTime) => string
}) {
  const total = parts.reduce((sum, p) => sum + p.min, 0)
  const R = 70
  const r0 = 46
  const gap = parts.length > 1 ? 0.03 : 0
  const point = (a: number, r: number) => `${80 + r * Math.cos(a)},${80 + r * Math.sin(a)}`
  // Ângulos de cada fatia, calculados antes do render.
  const arcs: string[] = []
  for (let i = 0, a0 = -Math.PI / 2; i < parts.length; i++) {
    const a1 = a0 + (parts[i].min / total) * Math.PI * 2 - gap
    const big = a1 - a0 > Math.PI ? 1 : 0
    arcs.push(
      `M${point(a0, R)}A${R},${R} 0 ${big} 1 ${point(a1, R)}L${point(a1, r0)}A${r0},${r0} 0 ${big} 0 ${point(a0, r0)}Z`,
    )
    a0 = a1 + gap
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 160 160"
      className="mx-auto block w-full max-w-44"
    >
      {parts.length === 1 ? (
        <circle
          cx={80}
          cy={80}
          r={(R + r0) / 2}
          fill="none"
          stroke={SERIES[0]}
          strokeWidth={R - r0}
        >
          <title>{`${name(parts[0])}: ${format(parts[0])}`}</title>
        </circle>
      ) : (
        parts.map((part, i) => (
          <path key={part.id ?? 'none'} d={arcs[i]} fill={SERIES[i % SERIES.length]}>
            <title>{`${name(part)}: ${format(part)}`}</title>
          </path>
        ))
      )}
      <text
        x={80}
        y={86}
        textAnchor="middle"
        className="fill-foreground text-[18px] font-extrabold"
      >
        {center}
      </text>
    </svg>
  )
}

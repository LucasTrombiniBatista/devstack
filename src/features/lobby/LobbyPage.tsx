import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { lobbyRepo } from '@/data/repos'
import { parseDay } from '@/features/planner/time'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Bars, Donut, Heatmap, Line } from './charts'
import { heatLevel, SERIES } from './colors'
import { computeLobby, type TrackTime } from './stats'

const panel = 'flex min-w-0 flex-col gap-1 rounded-2xl border bg-sidebar p-4'
const panelTitle = 'text-[0.9375rem] font-extrabold'
const panelHint = 'mb-3 text-xs text-muted-foreground'

/** Junta as trilhas além das quatro maiores em "Outras". */
function topTracks(parts: TrackTime[]): (TrackTime & { outras?: boolean })[] {
  if (parts.length <= 5) return parts
  const rest = parts.slice(4).reduce((sum, p) => sum + p.min, 0)
  return [...parts.slice(0, 4), { id: '__outras', nome: null, cor: null, min: rest, outras: true }]
}

export function LobbyPage() {
  const { t, i18n } = useTranslation()
  // A data de hoje é lida junto com os dados, a cada mudança no banco.
  const stats = useLiveQuery(
    async () => computeLobby({ ...(await lobbyRepo.snapshot()), today: new Date() }),
    [],
  )
  if (!stats) return null

  const locale = i18n.language
  const dayLabel = (day: string) =>
    parseDay(day).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
  const change =
    stats.prev7Min === 0
      ? null
      : Math.round(((stats.last7Min - stats.prev7Min) / stats.prev7Min) * 100)
  const tracks = topTracks(stats.byTrack)
  const trackTotal = tracks.reduce((sum, p) => sum + p.min, 0)
  const trackName = (p: TrackTime & { outras?: boolean }) =>
    p.outras ? t('lobby.otherTracks') : (p.nome ?? t('board.noTrack'))
  const empty = stats.year.every((d) => d.min === 0) && stats.doneTotal === 0

  const tiles = [
    {
      label: t('lobby.tiles.focus'),
      value: formatDuration(stats.last7Min),
      detail:
        change === null
          ? t('lobby.tiles.focusNoPrev')
          : t('lobby.tiles.focusChange', { change: `${change >= 0 ? '+' : ''}${change}%` }),
    },
    {
      label: t('lobby.tiles.done'),
      value: String(stats.doneTotal),
      detail: t('lobby.tiles.doneWeek', { count: stats.doneThisWeek }),
    },
    {
      label: t('lobby.tiles.streak'),
      value: t('lobby.tiles.days', { count: stats.streak }),
      detail: t('lobby.tiles.streakHint'),
    },
    {
      label: t('lobby.tiles.goal'),
      value: `${stats.goalDays}/30`,
      detail: t('lobby.tiles.goalHint'),
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-5 pb-10 md:px-8 md:pt-7">
      <header className="page-header flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[0.8125rem] font-bold text-muted-foreground">{t('lobby.subtitle')}</p>
          <h1 className="text-3xl leading-9 font-black tracking-[-0.02em]">{t('lobby.title')}</h1>
        </div>
        <Link to="/today" className={buttonVariants({ variant: 'outline' })}>
          {t('lobby.openToday')}
        </Link>
      </header>

      {empty && (
        <p className="rounded-2xl border border-dashed border-(--dashed) p-4 text-sm text-muted-foreground">
          {t('lobby.empty')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className={panel}>
            <span className="text-[0.6875rem] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
              {tile.label}
            </span>
            <span className="text-2xl font-black tabular-nums">{tile.value}</span>
            <span className="text-xs text-muted-foreground">{tile.detail}</span>
          </div>
        ))}
      </div>

      <section aria-labelledby="lobby-heat" className={panel}>
        <h2 id="lobby-heat" className={panelTitle}>
          {t('lobby.heat.title')}
        </h2>
        <p className={panelHint}>{t('lobby.heat.hint')}</p>
        <Heatmap
          year={stats.year}
          locale={locale}
          label={t('lobby.heat.title')}
          weekdays={[t('lobby.heat.mon'), t('lobby.heat.wed'), t('lobby.heat.fri')]}
          format={(d) => `${dayLabel(d.day)}: ${formatDuration(d.min)}`}
        />
        <div
          aria-hidden
          className="mt-2 flex items-center justify-end gap-1 text-[0.6875rem] text-muted-foreground"
        >
          {t('lobby.heat.less')}
          {[0, 20, 45, 80, 120].map((m) => (
            <span key={m} className="size-2.5 rounded-[3px]" style={{ background: heatLevel(m) }} />
          ))}
          {t('lobby.heat.more')}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <section aria-labelledby="lobby-bars" className={cn(panel, 'lg:col-span-2')}>
          <h2 id="lobby-bars" className={panelTitle}>
            {t('lobby.bars.title')}
          </h2>
          <p className={panelHint}>
            {stats.goalMin === null
              ? t('lobby.bars.hint')
              : t('lobby.bars.hintGoal', { goal: formatDuration(stats.goalMin) })}
          </p>
          <Bars
            days={stats.year.slice(-14)}
            goalMin={stats.goalMin}
            label={t('lobby.bars.title')}
            todayLabel={t('lobby.today')}
            format={(d) => `${dayLabel(d.day)}: ${formatDuration(d.min)}`}
          />
        </section>

        <section aria-labelledby="lobby-tracks" className={panel}>
          <h2 id="lobby-tracks" className={panelTitle}>
            {t('lobby.tracks.title')}
          </h2>
          <p className={panelHint}>{t('lobby.tracks.hint')}</p>
          {tracks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('lobby.tracks.empty')}</p>
          ) : (
            <>
              <Donut
                parts={tracks}
                label={t('lobby.tracks.title')}
                center={formatDuration(trackTotal)}
                name={trackName}
                format={(p) => formatDuration(p.min)}
              />
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {tracks.map((p, i) => (
                  <li key={p.id ?? 'none'} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ background: SERIES[i % SERIES.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate">{trackName(p)}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {Math.round((p.min / trackTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section aria-labelledby="lobby-line" className={panel}>
        <h2 id="lobby-line" className={panelTitle}>
          {t('lobby.line.title')}
        </h2>
        <p className={panelHint}>{t('lobby.line.hint')}</p>
        <Line
          weeks={stats.weekly}
          label={t('lobby.line.title')}
          weekLabel={(n) => t('lobby.line.week', { n })}
          thisWeekLabel={t('lobby.line.thisWeek')}
          format={(w) => `${dayLabel(w.start)}: ${t('lobby.line.cards', { count: w.total })}`}
        />
      </section>
    </div>
  )
}

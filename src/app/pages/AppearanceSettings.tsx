import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  backgroundOf,
  COMBINACOES,
  DESTAQUES,
  FUNDOS,
  isHex,
  resolveAppearance,
  type Destaque,
} from '@/app/appearance'
import { isDark } from '@/app/apply-settings'
import { LANGUAGES, useSettings } from '@/app/settings-store'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const groupLabel = 'text-xs font-extrabold tracking-[0.08em] text-muted-foreground uppercase'

function Swatch({
  color,
  label,
  pressed,
  onClick,
}: {
  color: string
  label: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ background: color }}
      className={cn(
        'flex size-8 items-center justify-center rounded-full border-2 border-background ring-1 ring-border outline-none focus-visible:ring-3 focus-visible:ring-ring',
        pressed && 'ring-2 ring-foreground',
      )}
    >
      {pressed && (
        <Check
          aria-hidden
          className="size-4"
          style={{ color: color === 'transparent' ? undefined : readable(color) }}
        />
      )}
    </button>
  )
}

function readable(color: string) {
  return isHex(color) &&
    parseInt(color.slice(1, 3), 16) * 0.3 + parseInt(color.slice(3, 5), 16) * 0.6 > 140
    ? '#111111'
    : '#ffffff'
}

/** Seção Aparência: paletas de fundo e de destaque, combinações prontas e posição dos controles. */
export function AppearanceSettings() {
  const { t } = useTranslation()
  const s = useSettings()
  const dark = isDark(s.theme)
  const { accent, adjusted } = resolveAppearance(s.fundo, s.destaque, dark)
  const custom = isHex(s.destaque) && !DESTAQUES.some((d) => d.cor === s.destaque)

  return (
    <section aria-labelledby="settings-appearance" className="flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="settings-appearance" className="text-sm font-medium text-muted-foreground">
          {t('settings.appearance')}
        </h2>
        <Button variant="ghost" size="sm" onClick={s.resetAppearance}>
          {t('settings.resetAppearance')}
        </Button>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border bg-sidebar p-4">
        <fieldset className="flex flex-col gap-2">
          <legend className={cn(groupLabel, 'mb-2')}>{t('settings.combos.label')}</legend>
          <div className="flex flex-wrap gap-2">
            {COMBINACOES.map((combo) => {
              const active =
                combo.fundo === s.fundo && combo.destaque === s.destaque && combo.theme === s.theme
              const comboDark = combo.theme === 'dark' || (combo.theme === 'system' && dark)
              return (
                <button
                  key={combo.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => s.setPalette(combo)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'hover:bg-(--sidebar-well)',
                  )}
                >
                  <span
                    aria-hidden
                    className="flex size-5 overflow-hidden rounded-full ring-1 ring-border"
                  >
                    <span
                      className="flex-1"
                      style={{ background: backgroundOf(combo.fundo, comboDark) }}
                    />
                    <span
                      className="flex-1"
                      style={{
                        background: combo.destaque === 'padrao' ? '#b81437' : combo.destaque,
                      }}
                    />
                  </span>
                  {t(`settings.combos.${combo.id}`)}
                </button>
              )
            })}
          </div>
        </fieldset>

        <SegmentedControl
          label={t('settings.theme.label')}
          value={s.theme}
          onChange={s.setTheme}
          options={[
            { value: 'light', label: t('settings.theme.light') },
            { value: 'dark', label: t('settings.theme.dark') },
            { value: 'system', label: t('settings.theme.system') },
          ]}
        />

        <div className="flex flex-col gap-1">
          <SegmentedControl
            label={t('settings.fundo.label')}
            value={s.fundo}
            onChange={s.setFundo}
            options={FUNDOS.map((value) => ({ value, label: t(`settings.fundo.${value}`) }))}
          />
          <p className="text-xs text-muted-foreground">{t('settings.fundo.hint')}</p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t('settings.destaque.label')}</legend>
          <p className="text-xs text-muted-foreground">{t('settings.destaque.hint')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={s.destaque === 'padrao'}
              onClick={() => s.setDestaque('padrao')}
              className={cn(
                'rounded-full border px-3 py-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                s.destaque === 'padrao' && 'border-foreground bg-foreground text-background',
              )}
            >
              {t('settings.destaque.padrao')}
            </button>
            {DESTAQUES.map((d) => (
              <Swatch
                key={d.id}
                color={d.cor}
                label={t(`settings.destaque.${d.id}`)}
                pressed={s.destaque === d.cor}
                onClick={() => s.setDestaque(d.cor)}
              />
            ))}
            <label
              title={t('settings.destaque.custom')}
              className={cn(
                'relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-border has-focus-visible:ring-3 has-focus-visible:ring-ring',
                custom && 'ring-2 ring-foreground',
              )}
              style={{
                background: custom
                  ? s.destaque
                  : 'conic-gradient(#e0314f, #f5b301, #22c55e, #1d9bf0, #8b5cf6, #e0314f)',
              }}
            >
              <input
                type="color"
                aria-label={t('settings.destaque.custom')}
                value={isHex(s.destaque) ? s.destaque : '#b81437'}
                onChange={(event) => s.setDestaque(event.target.value as Destaque)}
                className="size-0 opacity-0"
              />
            </label>
          </div>
          {adjusted && accent && (
            <p role="status" className="text-xs font-semibold text-foreground">
              {t('settings.destaque.adjusted', { color: accent })}
            </p>
          )}
        </fieldset>

        <SegmentedControl
          label={t('settings.nav.label')}
          value={s.navPosition}
          onChange={s.setNavPosition}
          options={[
            { value: 'side', label: t('settings.nav.side') },
            { value: 'top', label: t('settings.nav.top') },
          ]}
        />
        <SegmentedControl
          label={t('settings.startPage.label')}
          value={s.startPage}
          onChange={s.setStartPage}
          options={[
            { value: 'board', label: t('settings.startPage.board') },
            { value: 'lobby', label: t('settings.startPage.lobby') },
          ]}
        />
        <SegmentedControl
          label={t('settings.toolbar.label')}
          value={s.toolbarSide}
          onChange={s.setToolbarSide}
          options={[
            { value: 'right', label: t('settings.toolbar.right') },
            { value: 'left', label: t('settings.toolbar.left') },
          ]}
        />
        <SegmentedControl
          label={t('settings.density.label')}
          value={s.density}
          onChange={s.setDensity}
          options={[
            { value: 'comfortable', label: t('settings.density.comfortable') },
            { value: 'compact', label: t('settings.density.compact') },
          ]}
        />
        <SegmentedControl
          label={t('settings.language.label')}
          value={s.language}
          onChange={s.setLanguage}
          options={LANGUAGES.map((value) => ({ value, label: t(`settings.language.${value}`) }))}
        />

        <div className="flex flex-col gap-2">
          <span className={groupLabel}>{t('settings.preview.label')}</span>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3">
            <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
              {t('settings.preview.button')}
            </span>
            <span className="rounded-[0.625rem] bg-sidebar-accent px-3 py-1.5 text-sm font-extrabold text-sidebar-accent-foreground">
              {t('settings.preview.active')}
            </span>
            <span className="flex items-end gap-1" aria-hidden>
              {[40, 70, 55, 90].map((h, i) => (
                <span
                  key={h}
                  className="w-2.5 rounded-sm"
                  style={{ height: h / 4, background: `var(--chart-${i === 3 ? 1 : 3})` }}
                />
              ))}
            </span>
            <span className="text-sm">
              {t('settings.preview.text')}{' '}
              <span className="text-muted-foreground">{t('settings.preview.muted')}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

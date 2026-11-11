import { useId } from 'react'
import { cn } from '@/lib/utils'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

/** Grupo de opções exclusivas feito com radios nativos: setas e Tab funcionam sem código extra. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  const name = useId()

  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-3">
      <legend className="float-left text-sm font-medium">{label}</legend>
      <div className="inline-flex rounded-lg bg-muted p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'cursor-pointer rounded-md px-3 py-1 text-sm transition-colors',
              'has-focus-visible:ring-2 has-focus-visible:ring-ring',
              option.value === value
                ? 'bg-background font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

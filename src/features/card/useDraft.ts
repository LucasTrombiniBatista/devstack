import { useEffect, useRef, useState, type ChangeEvent } from 'react'

type Field = HTMLInputElement | HTMLTextAreaElement

/**
 * Campo de texto que grava ao sair do foco. Também grava ao desmontar, porque fechar o
 * painel com Esc não dispara `blur` e a última edição se perderia.
 */
export function useDraft(value: string, onCommit: (value: string) => void) {
  const [draft, setDraft] = useState(value)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setDraft(value)
  }

  const latest = useRef({ draft, committed: value, onCommit })
  useEffect(() => {
    latest.current = { draft, committed: latest.current.committed, onCommit }
  })
  useEffect(() => {
    latest.current.committed = value
  }, [value])

  function commit() {
    const { draft, committed, onCommit } = latest.current
    if (draft === committed) return
    latest.current.committed = draft
    onCommit(draft)
  }

  useEffect(() => commit, [])

  return {
    value: draft,
    onChange: (event: ChangeEvent<Field>) => {
      latest.current.draft = event.target.value
      setDraft(event.target.value)
    },
    onBlur: commit,
  }
}

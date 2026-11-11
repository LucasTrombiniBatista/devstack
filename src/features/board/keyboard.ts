import {
  closestCorners,
  getFirstCollision,
  type DroppableContainer,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'

const ARROWS = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']

/**
 * Para onde o card vai a cada seta, durante o arrasto por teclado.
 * O padrão do dnd-kit só serve para uma lista; aqui as setas laterais pulam para a coluna
 * vizinha. Células com cards não são alvo (o alvo são os cards dentro delas); células
 * vazias são, para que dê para soltar numa coluna sem nada.
 */
export const boardCoordinateGetter: KeyboardCoordinateGetter = (
  event,
  { context: { active, droppableRects, droppableContainers, collisionRect } },
) => {
  if (!ARROWS.includes(event.code)) return undefined
  event.preventDefault()
  if (!active || !collisionRect) return undefined

  const candidates: DroppableContainer[] = []
  for (const entry of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(entry.id)
    if (!rect || entry.id === active.id) continue
    const data = entry.data.current
    if (data?.type === 'cell' && (data.children as string[]).length > 0) continue

    if (event.code === 'ArrowDown' && collisionRect.top < rect.top) candidates.push(entry)
    if (event.code === 'ArrowUp' && collisionRect.top > rect.top) candidates.push(entry)
    if (event.code === 'ArrowLeft' && collisionRect.left >= rect.left + rect.width) {
      candidates.push(entry)
    }
    if (event.code === 'ArrowRight' && collisionRect.left + collisionRect.width <= rect.left) {
      candidates.push(entry)
    }
  }

  const collisions = closestCorners({
    active,
    collisionRect,
    droppableRects,
    droppableContainers: candidates,
    pointerCoordinates: null,
  })
  const closestId = getFirstCollision(collisions, 'id')
  if (closestId === null) return undefined
  const rect = droppableContainers.get(closestId)?.rect.current
  return rect ? { x: rect.left, y: rect.top } : undefined
}

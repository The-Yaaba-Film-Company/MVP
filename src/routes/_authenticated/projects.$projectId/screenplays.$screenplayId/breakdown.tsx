import { createFileRoute } from '@tanstack/react-router'
import { BreakdownView } from '#/features/breakdown/BreakdownView'

function BreakdownRoute() {
  return <BreakdownView />
}

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/breakdown',
)({
  component: BreakdownRoute,
})
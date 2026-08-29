import { createFileRoute } from '@tanstack/react-router'
import { NavigatorView } from '#/features/navigator/NavigatorView'

function NavigatorRoute() {
  return <NavigatorView />
}

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/navigator',
)({
  component: NavigatorRoute,
})
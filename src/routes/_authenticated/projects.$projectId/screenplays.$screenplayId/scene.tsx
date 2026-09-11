import { createFileRoute } from '@tanstack/react-router'
import { SceneView } from '#/features/scene/SceneView'

function SceneRoute() {
  return <SceneView />
}

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/scene',
)({
  component: SceneRoute,
})

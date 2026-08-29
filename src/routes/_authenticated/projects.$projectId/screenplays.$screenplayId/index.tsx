import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/screenplays/$screenplayId/',
)({
  component: ScreenplayIndexRedirect,
})

function ScreenplayIndexRedirect() {
  const { projectId, screenplayId } = Route.useParams()
  return (
    <Navigate
      to="/projects/$projectId/screenplays/$screenplayId/writer"
      params={{ projectId, screenplayId }}
      replace
    />
  )
}

import {
  Link,
  Outlet,
  createFileRoute,
  useParams,
} from '@tanstack/react-router'
import { SearchPanel } from '#/features/search/SearchPanel'

type ViewTo =
  | '/projects/$projectId/screenplays/$screenplayId/writer'
  | '/projects/$projectId/screenplays/$screenplayId/scene'
  | '/projects/$projectId/screenplays/$screenplayId/breakdown'
  | '/projects/$projectId/screenplays/$screenplayId/navigator'

const views: Array<{ to: ViewTo; label: string; testid: string }> = [
  {
    to: '/projects/$projectId/screenplays/$screenplayId/writer',
    label: 'Writer',
    testid: 'view-tab-writer',
  },
  {
    to: '/projects/$projectId/screenplays/$screenplayId/scene',
    label: 'Scene',
    testid: 'view-tab-scene',
  },
  {
    to: '/projects/$projectId/screenplays/$screenplayId/breakdown',
    label: 'Breakdown',
    testid: 'view-tab-breakdown',
  },
  {
    to: '/projects/$projectId/screenplays/$screenplayId/navigator',
    label: 'Navigator',
    testid: 'view-tab-navigator',
  },
]

// Shell for the four views under `/projects/:projectId/screenplays/:screenplayId`.
// Writer / Scene / Breakdown / Navigator are each deep-linkable routes (SPEC §8).
function ScreenplayLayout() {
  const { projectId, screenplayId } = useParams({
    from: '/_authenticated/projects/$projectId/screenplays/$screenplayId',
  })

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center gap-1 border-b border-neutral-200 px-4 py-2">
        {views.map((v) => (
          <Link
            key={v.to}
            to={v.to}
            params={{ projectId, screenplayId }}
            activeOptions={{ exact: true }}
            className="rounded px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            activeProps={{
              className:
                'rounded px-3 py-1.5 text-sm font-medium bg-neutral-200 text-neutral-900',
            }}
            data-testid={v.testid}
          >
            {v.label}
          </Link>
        ))}
        <SearchPanel projectId={projectId} screenplayId={screenplayId} />
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/screenplays/$screenplayId',
)({
  component: ScreenplayLayout,
})

import { useState } from 'react'
import {
  Link,
  Outlet,
  createFileRoute,
  useParams,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Boxes, ChevronLeft, Sparkles } from 'lucide-react'
import { api } from '#/api/client'
import { useScenes } from '#/features/writer/queries'
import { useWriterStore } from '#/features/writer/store'
import { SearchPanel } from '#/features/search/SearchPanel'
import { ElementsPanel } from '#/components/story/ElementsPanel'
import { AiPanel } from '#/components/story/AiPanel'
import { cn } from '#/lib/utils'

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

  const { data: screenplay } = useQuery({
    queryKey: ['screenplays', screenplayId],
    queryFn: () => api.screenplays.get(screenplayId),
  })
  const { data: scenes } = useScenes(screenplayId)

  const activeSceneId = useWriterStore((s) => s.activeSceneId)
  const [elementsOpen, setElementsOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const locked = Boolean(screenplay?.locked_at)
  const firstSceneId = scenes?.items[0]?.id

  return (
    <div className="flex min-h-screen flex-col bg-paper-50">
      <header className="border-b border-paper-200 bg-paper-100">
        <div className="flex flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/projects/$projectId"
            params={{ projectId }}
            className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-clay-700"
          >
            <ChevronLeft className="size-4" aria-hidden /> Back
          </Link>
          <h1 className="font-serif text-xl text-ink-900">
            {screenplay?.title ?? 'Screenplay'}
          </h1>
          {locked ? (
            <span
              data-testid="screenplay-locked"
              className="rounded-md border border-ochre-600/40 bg-ochre-100 px-2 py-0.5 text-xs font-medium text-ochre-600"
            >
              Locked
            </span>
          ) : null}

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              data-testid="elements-panel-trigger"
              onClick={() => setElementsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:border-clay-500"
            >
              <Boxes className="size-4" aria-hidden /> Elements
            </button>
            <button
              type="button"
              data-testid="ai-integrations-trigger"
              onClick={() => setAiOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-verdigris-600/40 bg-verdigris-100 px-3 py-1.5 text-sm font-medium text-verdigris-600 hover:border-verdigris-600"
            >
              <Sparkles className="size-4" aria-hidden /> AI
            </button>
          </div>
        </div>

        <nav
          className="flex flex-wrap items-center gap-1 px-6 pb-2"
          aria-label="Screenplay views"
        >
          {views.map((v) => (
            <Link
              key={v.to}
              to={v.to}
              params={{ projectId, screenplayId }}
              activeOptions={{ exact: true }}
              activeProps={{ 'data-active': 'true' }}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-paper-200',
                'data-[active=true]:bg-clay-100 data-[active=true]:text-clay-700',
              )}
              data-testid={v.testid}
            >
              {v.label}
            </Link>
          ))}
          <SearchPanel projectId={projectId} screenplayId={screenplayId} />
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      <ElementsPanel
        open={elementsOpen}
        onOpenChange={setElementsOpen}
        projectId={projectId}
      />
      <AiPanel
        open={aiOpen}
        onOpenChange={setAiOpen}
        projectId={projectId}
        activeSceneId={activeSceneId ?? firstSceneId}
      />
    </div>
  )
}

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/screenplays/$screenplayId',
)({
  component: ScreenplayLayout,
})

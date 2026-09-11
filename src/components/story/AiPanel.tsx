import { toast } from 'sonner'
import {
  useAcceptSuggestion,
  useAiSuggestions,
  useAnalyzeScene,
  useRejectSuggestion,
} from '#/features/semantic/queries'
import { EntityChip } from '#/components/story/EntityChip'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'

interface AiIntegration {
  id: string
  name: string
  provider: string
  model: string
  description: string
  triggers: string[]
  status: 'configured' | 'not_configured'
}

const INTEGRATIONS: AiIntegration[] = [
  {
    id: 'gemini-breakdown',
    name: 'Scene breakdown extraction',
    provider: 'Analyzer service',
    model: 'Server-side model',
    description:
      'Reads a scene and proposes production elements — props, wardrobe, vehicles, sound and more — as reviewable suggestions. Nothing is written into the script until you use it.',
    triggers: ['Manual — Run analysis now'],
    status: 'configured',
  },
]

export function AiPanel({
  open,
  onOpenChange,
  projectId,
  activeSceneId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  activeSceneId?: string | undefined
}) {
  const suggestionsQuery = useAiSuggestions(activeSceneId)
  const items = suggestionsQuery.data?.items ?? []
  const pending = items.filter((s) => s.status === 'pending')
  const count = (status: string) =>
    items.filter((s) => s.status === status).length

  const analyze = useAnalyzeScene(activeSceneId ?? '')
  const accept = useAcceptSuggestion(activeSceneId ?? '', projectId)
  const reject = useRejectSuggestion(activeSceneId ?? '')

  const useSuggestion = (id: string) =>
    accept.mutate(id, {
      onSuccess: () => toast.success('Suggestion used'),
      onError: () => toast.error('Could not use suggestion'),
    })

  const removeSuggestion = (id: string) =>
    reject.mutate(id, {
      onSuccess: () => toast.success('Suggestion removed'),
      onError: () => toast.error('Could not remove suggestion'),
    })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="ai-integrations-panel"
        className="w-full overflow-y-auto bg-paper-50 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="font-serif text-ink-900">
            AI integrations
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          {INTEGRATIONS.map((ai) => (
            <article
              key={ai.id}
              className="space-y-3 rounded-lg border border-paper-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-base text-ink-900">
                    {ai.name}
                  </h3>
                  <p className="text-xs text-ink-500">
                    {ai.provider} · {ai.model}
                  </p>
                </div>
                <span className="rounded-md border border-olive-600/40 bg-olive-100 px-2 py-0.5 text-xs font-medium text-olive-600">
                  {ai.status === 'configured' ? 'Configured' : 'Not configured'}
                </span>
              </div>

              <p className="text-sm text-ink-700">{ai.description}</p>

              <ul className="space-y-1 text-xs text-ink-500">
                {ai.triggers.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>

              <div className="flex gap-2 text-xs">
                <span className="rounded-md border border-ochre-600/40 bg-ochre-100 px-2 py-0.5 text-ochre-600">
                  {count('pending')} pending
                </span>
                <span className="rounded-md border border-olive-600/40 bg-olive-100 px-2 py-0.5 text-olive-600">
                  {count('accepted')} used
                </span>
                <span className="rounded-md border border-rust-600/40 bg-rust-100 px-2 py-0.5 text-rust-600">
                  {count('rejected')} removed
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  data-testid="ai-run-analysis"
                  disabled={!activeSceneId || analyze.isPending}
                  onClick={() => analyze.mutate()}
                  className="bg-clay-600 text-paper-50 hover:bg-clay-700"
                >
                  {analyze.isPending ? 'Analyzing…' : 'Run analysis now'}
                </Button>
              </div>
            </article>
          ))}

          <section className="space-y-2">
            <h3 className="font-serif text-sm text-ink-900">
              Pending suggestions{activeSceneId ? '' : ' — select a scene'}
            </h3>
            {pending.map((s) => (
              <div
                key={s.id}
                data-testid={`suggestion-${s.id}`}
                className="space-y-2 rounded-lg border border-paper-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <EntityChip type={s.suggested_type} />
                  <span className="text-xs text-ink-500">
                    {s.confidence != null
                      ? `${Math.round(s.confidence * 100)}% confident`
                      : ''}
                  </span>
                </div>
                <p className="text-sm text-ink-900">{s.suggested_name}</p>
                <p className="semantic-suggestion inline-block text-xs text-ink-700">
                  {s.matched_text}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    data-testid={`suggestion-accept-${s.id}`}
                    disabled={accept.isPending}
                    onClick={() => useSuggestion(s.id)}
                    className="bg-olive-600 text-paper-50 hover:bg-olive-500"
                  >
                    {accept.isPending && accept.variables === s.id
                      ? 'Adding…'
                      : 'Use'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`suggestion-reject-${s.id}`}
                    disabled={reject.isPending}
                    onClick={() => removeSuggestion(s.id)}
                    className="border-paper-300 text-ink-700"
                  >
                    {reject.isPending && reject.variables === s.id
                      ? 'Removing…'
                      : 'Remove'}
                  </Button>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="text-sm text-ink-500">
                No suggestions waiting for review — run analysis on the current
                scene.
              </p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

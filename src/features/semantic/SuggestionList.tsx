import {
  useAcceptSuggestion,
  useAiSuggestions,
  useAnalyzeScene,
  useRejectSuggestion,
} from './queries'
import type { AiSuggestion, EntityType } from '#/api/types'

interface SuggestionListProps {
  sceneId: string
  projectId: string
}

function prettyName(type: EntityType): string {
  return type.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Pending AI suggestions with Accept/Reject (SPEC.md §5.2). */
export function SuggestionList({ sceneId, projectId }: SuggestionListProps) {
  const { data } = useAiSuggestions(sceneId)
  const pending = (data?.items ?? []).filter((s) => s.status === 'pending')
  const analyze = useAnalyzeScene(sceneId)
  const accept = useAcceptSuggestion(sceneId, projectId)
  const reject = useRejectSuggestion(sceneId)

  return (
    <div
      data-testid="suggestion-list"
      className="w-full rounded-md border border-blue-100 bg-blue-50/60 p-2"
    >
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-800">
          AI Suggestions ({pending.length})
        </span>
        <button
          type="button"
          data-testid="analyze-scene"
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending || pending.length > 0}
          className="rounded border border-blue-200 bg-white px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          {analyze.isPending
            ? 'Analyzing…'
            : pending.length > 0
              ? 'Analyzed'
              : 'Analyze Scene'}
        </button>
      </div>
      {pending.length === 0 ? (
        <p className="px-1 text-xs text-neutral-500">
          No suggestions yet — run Analyze Scene to detect props, locations, and
          other production elements.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {pending.map((suggestion) => (
            <SuggestionRow
              key={suggestion.id}
              suggestion={suggestion}
              accepting={accept.isPending && accept.variables === suggestion.id}
              rejecting={reject.isPending && reject.variables === suggestion.id}
              onAccept={() => accept.mutate(suggestion.id)}
              onReject={() => reject.mutate(suggestion.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function SuggestionRow({
  suggestion,
  accepting,
  rejecting,
  onAccept,
  onReject,
}: {
  suggestion: AiSuggestion
  accepting: boolean
  rejecting: boolean
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <li
      data-testid={`suggestion-${suggestion.id}`}
      className="flex items-center gap-2 rounded border border-blue-100 bg-white px-2 py-1"
    >
      <span className="min-w-0 flex-1 truncate text-xs">
        <span className="font-medium text-neutral-900">
          {suggestion.suggested_name}
        </span>{' '}
        <span className="text-neutral-500">
          ({prettyName(suggestion.suggested_type)})
        </span>{' '}
        <span className="text-neutral-400">“{suggestion.matched_text}”</span>
        {suggestion.confidence != null ? (
          <span className="text-neutral-400">
            {' '}
            · {Math.round(suggestion.confidence * 100)}%
          </span>
        ) : null}
      </span>
      <button
        type="button"
        data-testid={`suggestion-accept-${suggestion.id}`}
        onClick={onAccept}
        disabled={accepting}
        className="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {accepting ? 'Accepting…' : 'Accept'}
      </button>
      <button
        type="button"
        data-testid={`suggestion-reject-${suggestion.id}`}
        onClick={onReject}
        disabled={rejecting}
        className="rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
      >
        {rejecting ? 'Rejecting…' : 'Reject'}
      </button>
    </li>
  )
}

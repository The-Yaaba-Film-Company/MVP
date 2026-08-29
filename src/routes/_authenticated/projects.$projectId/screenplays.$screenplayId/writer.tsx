import { createFileRoute } from '@tanstack/react-router'
import { WriterView } from '#/features/writer/WriterView'

export const Route = createFileRoute('/_authenticated/projects/$projectId/screenplays/$screenplayId/writer')({
  component: WriterView,
})
import { createFileRoute } from '@tanstack/react-router'
import { ScreenplaysPage } from '#/features/screenplays/ScreenplaysPage'

export const Route = createFileRoute('/_authenticated/projects/$projectId/')({
  component: ScreenplaysPage,
})

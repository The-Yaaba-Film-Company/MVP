import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import { AppShell } from '#/features/auth/AppShell'
import { useAuth } from '#/features/auth/queries'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const auth = useAuth();

  if (auth.isPending) {
    return (
      <div
        data-testid="auth-loading"
        className="flex min-h-screen items-center justify-center"
      >
        Loading…
      </div>
    )
  }

  if (!auth.data) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell user={auth.data}>
      <Outlet />
    </AppShell>
  )
}

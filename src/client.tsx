import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'

if (import.meta.env.VITE_API_MOCK === '1') {
  const { startMockApi } = await import('#/api/mocks/browser')
  await startMockApi()
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})

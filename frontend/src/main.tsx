import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { App } from './App'
import { ApiError } from './api/client'
import './index.css'

// React Query caches data from the API and re-loads it when it becomes stale.
// A 4xx answer ("not allowed", "not found") will not change on a second try, so only other errors are retried once.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (failures, error) => failures < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

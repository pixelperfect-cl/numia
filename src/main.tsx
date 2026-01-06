/**
 * Numia v1.0 - Entry Point
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/AuthContext'
import { DataProvider } from '@/contexts/DataContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { AIProvider } from '@/contexts/AIContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="numia-ui-theme">
      <AuthProvider>
        <DataProvider>
          <NotificationProvider>
            <AIProvider>
              <App />
            </AIProvider>
          </NotificationProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

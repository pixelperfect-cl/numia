/**
 * Numia v1.0 - Entry Point
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/AuthContext'
import { DataProvider } from '@/contexts/DataContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { AIProvider } from '@/contexts/AIContext'
import { PrivacyProvider } from '@/contexts/PrivacyContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="entity-ui-theme">
      <AuthProvider>
        <DataProvider>
          <NotificationProvider>
            <AIProvider>
              <PrivacyProvider>
                <HashRouter>
                  <App />
                </HashRouter>
              </PrivacyProvider>
            </AIProvider>
          </NotificationProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

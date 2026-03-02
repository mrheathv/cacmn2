import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'

// Pages
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ClientsPage } from '@/pages/crm/ClientsPage'
import { ClientDetailPage } from '@/pages/crm/ClientDetailPage'
import { LeadsPage } from '@/pages/crm/LeadsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

// Lazy stubs for phases 3-8 (implemented in future sessions)
import { PlaceholderPage } from '@/pages/PlaceholderPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />

            {/* CRM */}
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="leads" element={<LeadsPage />} />

            {/* Projects — Phase 3 */}
            <Route path="projects" element={<PlaceholderPage title="Projects" phase={3} />} />
            <Route path="projects/:id" element={<PlaceholderPage title="Project Detail" phase={3} />} />

            {/* Estimates — Phase 4 */}
            <Route path="estimates" element={<PlaceholderPage title="Estimates" phase={4} />} />
            <Route path="estimates/:id" element={<PlaceholderPage title="Estimate Detail" phase={4} />} />

            {/* Work Orders — Phase 5 */}
            <Route path="work-orders" element={<PlaceholderPage title="Work Orders" phase={5} />} />
            <Route path="work-orders/:id" element={<PlaceholderPage title="Work Order Detail" phase={5} />} />

            {/* Subcontractors — Phase 6 */}
            <Route path="subcontractors" element={<PlaceholderPage title="Subcontractors" phase={6} />} />
            <Route path="subcontractors/:id" element={<PlaceholderPage title="Subcontractor Detail" phase={6} />} />

            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

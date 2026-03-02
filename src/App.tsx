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
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { EstimatesPage } from '@/pages/estimates/EstimatesPage'
import { EstimateDetailPage } from '@/pages/estimates/EstimateDetailPage'
import { WorkOrdersPage } from '@/pages/work-orders/WorkOrdersPage'
import { WorkOrderDetailPage } from '@/pages/work-orders/WorkOrderDetailPage'
import { SubcontractorsPage } from '@/pages/subcontractors/SubcontractorsPage'
import { SubDetailPage } from '@/pages/subcontractors/SubDetailPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

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

            {/* Projects */}
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />

            {/* Estimates */}
            <Route path="estimates" element={<EstimatesPage />} />
            <Route path="estimates/:id" element={<EstimateDetailPage />} />

            {/* Work Orders */}
            <Route path="work-orders" element={<WorkOrdersPage />} />
            <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />

            {/* Subcontractors */}
            <Route path="subcontractors" element={<SubcontractorsPage />} />
            <Route path="subcontractors/:id" element={<SubDetailPage />} />

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

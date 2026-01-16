/**
 * Numia v1.0 - Main Application Entry
 * Force HMR Update
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationSettings } from '@/components/configuration/NotificationSettings';
import { AccountSettings } from '@/components/configuration/AccountSettings';

// Lazy load pages
const Login = lazy(() => import('@/pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then(module => ({ default: module.Dashboard })));
const EntityPanel = lazy(() => import('@/pages/EntityPanel').then(module => ({ default: module.EntityPanel })));
const Movements = lazy(() => import('@/pages/Movements').then(module => ({ default: module.Movements })));
const Loans = lazy(() => import('@/pages/Loans').then(module => ({ default: module.Loans })));
const Projections = lazy(() => import('@/pages/Projections').then(module => ({ default: module.Projections })));
const EntityConfiguration = lazy(() => import('@/pages/EntityConfiguration').then(module => ({ default: module.EntityConfiguration })));
const MassUpload = lazy(() => import('@/pages/MassUpload').then(module => ({ default: module.MassUpload })));
const Subscriptions = lazy(() => import('@/pages/Subscriptions').then(module => ({ default: module.Subscriptions })));
const Services = lazy(() => import('@/pages/erp/Services').then(module => ({ default: module.Services })));
const Clients = lazy(() => import('@/pages/erp/Clients').then(module => ({ default: module.Clients })));
const Projects = lazy(() => import('@/pages/erp/Projects').then(module => ({ default: module.Projects })));
const ProjectDetails = lazy(() => import('@/pages/erp/ProjectDetails').then(module => ({ default: module.ProjectDetails })));
const ERPDashboard = lazy(() => import('@/pages/erp/ERPDashboard').then(module => ({ default: module.ERPDashboard })));
const EntitySelection = lazy(() => import('@/pages/EntitySelection').then(module => ({ default: module.EntitySelection })));
const FinancialReport = lazy(() => import('@/pages/FinancialReport').then(module => ({ default: module.FinancialReport })));
const ERPReport = lazy(() => import('@/pages/ERPReport').then(module => ({ default: module.ERPReport })));

// Loading Component
const PageLoading = () => (
  <div className="flex items-center justify-center h-full min-h-[50vh]">
    <div className="text-lg animate-pulse">Cargando módulo...</div>
  </div>
);

function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(() => localStorage.getItem('numia-entity-id'));

  // Persist entity selection
  useEffect(() => {
    if (selectedEntityId) localStorage.setItem('numia-entity-id', selectedEntityId);
    else localStorage.removeItem('numia-entity-id');
  }, [selectedEntityId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/entity-selection" element={
          <EntitySelection
            onSelect={(id) => {
              setSelectedEntityId(id);
              navigate('/dashboard');
            }}
          />
        } />

        {/* Main App Layout Routes */}
        <Route element={<AppLayout selectedEntityId={selectedEntityId || ''} onEntityChange={setSelectedEntityId} />}>
          <Route path="/" element={<Navigate to={selectedEntityId ? "/dashboard" : "/entity-selection"} />} />

          {/* Dashboard / Entity Panel */}
          <Route path="/dashboard" element={
            selectedEntityId ? <EntityPanel entityId={selectedEntityId} onBack={() => setSelectedEntityId(null)} /> : <Navigate to="/entity-selection" />
          } />

          {/* Core Modules */}
          <Route path="/movements" element={
            selectedEntityId ? <Movements entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/loans" element={
            selectedEntityId ? <Loans entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/projections" element={
            selectedEntityId ? <Projections entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/subscriptions" element={
            selectedEntityId ? <Subscriptions entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/configuration" element={
            selectedEntityId ? <EntityConfiguration entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/mass-upload" element={
            selectedEntityId ? <MassUpload onBack={() => { }} initialEntityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />

          {/* Reports */}
          <Route path="/reports/financial" element={<FinancialReport />} />
          <Route path="/reports/erp" element={<ERPReport />} />

          {/* Settings */}
          <Route path="/notifications" element={<div className="p-6"><NotificationSettings /></div>} />
          <Route path="/account-settings" element={<div className="p-6 bg-card rounded-lg m-6"><AccountSettings /></div>} />

          {/* ERP Modules */}
          <Route path="/erp/dashboard" element={
            selectedEntityId ? <ERPDashboard entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/erp/clients" element={
            selectedEntityId ? <Clients entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/erp/services" element={
            selectedEntityId ? <Services entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/erp/projects" element={
            selectedEntityId ? <Projects entityId={selectedEntityId} /> : <Navigate to="/entity-selection" />
          } />
          <Route path="/erp/projects/:projectId" element={
            selectedEntityId ? <ProjectDetails /> : <Navigate to="/entity-selection" />
          } />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Suspense>
  );
}

export default App;

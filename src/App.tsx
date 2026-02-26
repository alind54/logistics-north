import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { Loader2 } from 'lucide-react';

const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const CorrectionsPage = lazy(() => import('./pages/CorrectionsPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <ErrorBoundary>
            <ToastProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/audit" element={<AuditLogPage />} />
                    <Route path="/corrections" element={<CorrectionsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ToastProvider>
          </ErrorBoundary>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

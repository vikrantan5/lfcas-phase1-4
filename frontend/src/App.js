import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ClientDashboard from './pages/client/ClientDashboard';
import CaseDetailPage from './pages/client/CaseDetail';
import AdvocateDashboard from './pages/advocate/AdvocateDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import { Loader2 } from 'lucide-react';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Home redirect based on role
const Home = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  if (user.role === 'client') {
    return <Navigate to="/client/dashboard" replace />;
  } else if (user.role === 'advocate') {
    return <Navigate to="/advocate/dashboard" replace />;
  } else if (user.role === 'platform_manager') {
    return <Navigate to="/manager/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Home / Dashboard Redirect */}
          <Route path="/" element={<Home />} />

          {/* Client Routes */}
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/cases/:caseId"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <CaseDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Advocate Routes */}
          <Route
            path="/advocate/dashboard"
            element={
              <ProtectedRoute allowedRoles={['advocate']}>
                <AdvocateDashboard />
              </ProtectedRoute>
            }
          />

          {/* Manager Routes */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute allowedRoles={['platform_manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;

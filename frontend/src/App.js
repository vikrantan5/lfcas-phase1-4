import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { VoiceProvider } from './contexts/VoiceContext';
import { Toaster } from './components/ui/toaster';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ClientDashboard from './pages/client/ClientDashboard';
import CaseDetailPage from './pages/client/CaseDetail';
import AIOnboarding from './pages/client/AIOnboarding';

import ClientPayments from './pages/client/Payments';
import FindAdvocates from './pages/client/FindAdvocates';
import AdvocateDashboard from './pages/advocate/AdvocateDashboard';
import AdvocateCaseDetail from './pages/advocate/AdvocateCaseDetail';
import MyCases from './pages/advocate/MyCases';
import CaseTracker from './pages/advocate/CaseTracker';
import Calendar from './pages/advocate/Calendar';
import Requests from './pages/advocate/Requests';
import Documents from './pages/advocate/Documents';
import Payments from './pages/advocate/Payments';
import Messages from './pages/advocate/Messages';
import FindClients from './pages/advocate/FindClients';
import Settings from './pages/advocate/Settings';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import AllAdvocatesPage from './pages/manager/AllAdvocates';
import VoiceAssistantButton from './components/VoiceAssistantButton';
import VoiceAssistantModal from './components/VoiceAssistantModal';
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




// Client Route - No onboarding check needed since we show bot as popup
const ClientRouteWithOnboarding = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No redirect needed - bot will show as popup in dashboard
  return children;
};

// Home redirect based on authentication
const Home = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If user is logged in, redirect to their dashboard
  if (user) {
    if (user.role === 'client') {
      // Bot will show as popup in dashboard, no redirect needed
      return <Navigate to="/client/dashboard" replace />;
    } else if (user.role === 'advocate') {
      return <Navigate to="/advocate/dashboard" replace />;
    } else if (user.role === 'platform_manager') {
      return <Navigate to="/manager/dashboard" replace />;
    }
  }

  // If not logged in, show landing page
  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <VoiceProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Home / Dashboard Redirect */}
              <Route path="/" element={<Home />} />

              {/* Client Routes */}
              {/* AI Onboarding Route - No onboarding check needed here */}
              <Route
                path="/client/ai-onboarding"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <AIOnboarding />
                  </ProtectedRoute>
                }
              />
              
              {/* Client Dashboard - With onboarding check */}
              <Route
                path="/client/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientRouteWithOnboarding>
                      <ClientDashboard />
                    </ClientRouteWithOnboarding>
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
                <Route
                path="/client/payments"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientPayments />
                  </ProtectedRoute>
                }
              />
               <Route
                path="/client/find-advocates"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <FindAdvocates />
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
                <Route
                path="/advocate/cases"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <MyCases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advocate/cases/:caseId"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <AdvocateCaseDetail />
                  </ProtectedRoute>
                }
              />
                 <Route
                path="/advocate/case-tracker"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <CaseTracker />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advocate/calendar"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <Calendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advocate/requests"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <Requests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advocate/documents"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <Documents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advocate/payments"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advocate/messages"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <Messages />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/advocate/find-clients"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <FindClients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advocate/settings"
                element={
                  <ProtectedRoute allowedRoles={['advocate']}>
                    <Settings />
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
                <Route
                path="/manager/advocates"
                element={
                  <ProtectedRoute allowedRoles={['platform_manager']}>
                    <AllAdvocatesPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
              {/* Floating AI Assistant Button + Modal (persistent for authenticated clients) */}
            <VoiceAssistantButton />
            <VoiceAssistantModal />

            

          </BrowserRouter>
          <Toaster />
        </VoiceProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

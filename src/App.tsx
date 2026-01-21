import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/admin/Dashboard";
import Locations from "./pages/admin/Locations";
import Invitations from "./pages/admin/Invitations";
import Incidents from "./pages/admin/Incidents";
import Workers from "./pages/admin/Workers";
import TimeEntries from "./pages/admin/TimeEntries";
import WorkerHome from "./pages/worker/WorkerHome";
import TimeHistory from "./pages/worker/TimeHistory";

// Protected Route Components
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/locations" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Locations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/invitations" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Invitations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/incidents" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Incidents />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/workers" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Workers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/time-entries" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <TimeEntries />
                </ProtectedRoute>
              } 
            />
            
            {/* Worker Routes */}
            <Route 
              path="/worker" 
              element={
                <ProtectedRoute requiredRole="worker">
                  <WorkerHome />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/worker/history" 
              element={
                <ProtectedRoute requiredRole="worker">
                  <TimeHistory />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

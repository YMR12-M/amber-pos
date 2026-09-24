import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { HOME_FOR_ROLE } from "./lib/roles";
import type { Role } from "./types";
import ErrorBoundary from "./components/ErrorBoundary";
import { DialogProvider, ToastProvider } from "./components/ui";
import { Splash } from "./components/Splash";

// كل شاشة بتتحمّل لوحدها — الكاشير مش بيحمّل كود لوحة التحكم
const Login = lazy(() => import("./pages/Login"));
const POS = lazy(() => import("./pages/POS"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const Admin = lazy(() => import("./pages/Admin"));

function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={HOME_FOR_ROLE[user.role]} replace />;

  return <>{children}</>;
}

function Home() {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={HOME_FOR_ROLE[user.role]} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <DialogProvider>
          <AuthProvider>
            <SettingsProvider>
              <BrowserRouter>
                <Suspense fallback={<Splash />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Home />} />
                    <Route
                      path="/pos"
                      element={
                        <ProtectedRoute roles={["cashier", "admin"]}>
                          <POS />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/kitchen"
                      element={
                        <ProtectedRoute roles={["kitchen", "admin"]}>
                          <Kitchen />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <Admin />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </SettingsProvider>
          </AuthProvider>
        </DialogProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

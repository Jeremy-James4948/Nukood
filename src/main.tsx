import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import App from "./app/App.tsx";
import { Login } from "./pages/Login.tsx";
import { OnboardingPage } from "./features/onboarding/OnboardingPage.tsx";
import { ProtectedRoute, InitializedRoute, OnboardingRoute } from "./app/ProtectedRoute.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { InitializationProvider } from "./context/InitializationContext.tsx";
import { ThemeProvider } from "./components/providers/theme-provider.tsx";
import "./styles/index.css";

/**
 * PublicOnlyRoute — redirects already-authenticated users away from /login.
 * Does NOT check isOnboarded — that is handled by InitializedRoute and OnboardingRoute.
 * While auth is loading, renders nothing to avoid a flash of the login page.
 */
const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

/**
 * Route tree — Phase 4
 *
 * Authentication and initialization are kept separate:
 *   Authentication  → ProtectedRoute (Who is this user?)
 *   Initialization  → InitializedRoute / OnboardingRoute (Has this user set up Nukood?)
 *   Routing         → Navigate to correct destination based on the above
 *
 * Full flow for a new user:
 *   /login → authenticate → PublicOnlyRoute redirects to / → ProtectedRoute passes →
 *   InitializedRoute reads isOnboarded=false → Navigate to /onboarding → OnboardingRoute passes → OnboardingPlaceholder
 *
 * Full flow for an existing user:
 *   /login → authenticate → PublicOnlyRoute redirects to / → ProtectedRoute passes →
 *   InitializedRoute reads isOnboarded=true → Outlet → App
 *
 * Direct URL guard — uninitialized user visits /:
 *   ProtectedRoute passes → InitializedRoute reads isOnboarded=false → Navigate /onboarding
 *
 * Direct URL guard — initialized user visits /onboarding:
 *   ProtectedRoute passes → OnboardingRoute reads isOnboarded=true → Navigate /
 *
 * Loop prevention:
 *   InitializedRoute  (isOnboarded=false) → /onboarding → OnboardingRoute allows through
 *   OnboardingRoute   (isOnboarded=true)  → /           → InitializedRoute allows through
 *   Inverses; no cycle possible.
 */
createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <InitializationProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route — login page */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />

          {/* All protected routes — require authentication */}
          <Route element={<ProtectedRoute />}>

            {/* /onboarding — requires NOT yet initialized */}
            <Route element={<OnboardingRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* Application routes — require fully initialized account */}
            <Route element={<InitializedRoute />}>
              <Route path="/*" element={
                <ThemeProvider>
                  <App />
                </ThemeProvider>
              } />
            </Route>

          </Route>
        </Routes>
      </BrowserRouter>
    </InitializationProvider>
  </AuthProvider>
);
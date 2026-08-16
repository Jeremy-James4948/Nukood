
  import { createRoot } from "react-dom/client";
  import { BrowserRouter, Routes, Route, Navigate } from "react-router";
  import App from "./app/App.tsx";
  import { Login } from "./pages/Login.tsx";
  import { ProtectedRoute } from "./app/ProtectedRoute.tsx";
  import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
  import "./styles/index.css";

  // Helper component to redirect authenticated users away from /login
  const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) return null;
    return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
  };

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            } 
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<App />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
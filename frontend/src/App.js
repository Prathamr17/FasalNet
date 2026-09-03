// src/App.js — v10
// New routes: /market → FarmerMarketIntelligencePage (ARIMA primary)
// /ml-predict → MLPredictionsPage (Price + Market Rec only, Spoilage moved to /discover)

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider }         from "./context/ThemeContext";
import "./i18n";

import Navbar                        from "./components/common/Navbar";
import Footer                        from "./components/common/Footer";
import HomePage                      from "./pages/HomePage";
import LoginPage                     from "./pages/LoginPage";
import SignupPage                    from "./pages/SignupPage";
import ForgotPasswordPage            from "./pages/ForgotPasswordPage";
import DiscoverPage                  from "./pages/DiscoverPage";           // ← has Spoilage Risk
import BookingsPage                  from "./pages/BookingsPage";
import OperatorPage                  from "./pages/OperatorPage";
import NotFoundPage                  from "./pages/NotFoundPage";
import SettingsPage                  from "./pages/settings/SettingsPage";
import FarmerOrders                  from "./pages/farmer/FarmerOrders";
import MLPredictionsPage             from "./pages/farmer/MLPredictionsPage";       // Price + Market Rec
import FarmerMarketIntelligencePage  from "./pages/farmer/FarmerMarketIntelligencePage"; // ARIMA + live DB

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", fontFamily:"var(--fd)", fontSize:"15px", color:"var(--cp)", gap:"10px" }}>
      <span className="aspin" style={{ width:26, height:26,
        border:"3px solid var(--bd)", borderTopColor:"var(--cp)" }} />
      Loading…
    </div>
  );
  if (!user)                              return <Navigate to="/login"    replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/"        replace />;
  return children;
}

function AppInner() {
  const { user } = useAuth();
  const role      = user?.role || "guest";

  return (
    <div data-role={role} style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      background:"var(--bg)", color:"var(--tx)" }}>
      <Navbar />
      <main style={{ flex:1 }}>
        <Routes>
          {/* Public */}
          <Route path="/"                element={<HomePage />} />
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/signup"          element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Farmer */}
          <Route path="/discover"
            element={<PrivateRoute roles={["farmer","admin"]}>
              <DiscoverPage />                  {/* Cold storage + Spoilage Risk → optimal route */}
            </PrivateRoute>} />

          <Route path="/bookings"
            element={<PrivateRoute roles={["farmer","admin"]}>
              <BookingsPage />
            </PrivateRoute>} />

          <Route path="/farmer-orders"
            element={<PrivateRoute roles={["farmer","admin"]}>
              <FarmerOrders />
            </PrivateRoute>} />

          {/* Market Intelligence (ARIMA primary, ML secondary) — v10 */}
          <Route path="/market"
            element={<PrivateRoute roles={["farmer","admin"]}>
              <FarmerMarketIntelligencePage />
            </PrivateRoute>} />

          {/* ML Predictions — Price + Market Rec only (Spoilage moved to /discover) */}
          <Route path="/ml-predict"
            element={<PrivateRoute roles={["farmer","admin"]}>
              <MLPredictionsPage />
            </PrivateRoute>} />

          {/* Operator */}
          <Route path="/operator"
            element={<PrivateRoute roles={["operator","admin"]}>
              <OperatorPage />
            </PrivateRoute>} />

          {/* Shared */}
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="*"         element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

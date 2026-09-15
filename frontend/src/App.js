import React, { Component } from "react";
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

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("FasalNet Page Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "40px 20px",
          textAlign: "center", fontFamily: "var(--fd)"
        }}>
          <div style={{ fontSize: "42px", marginBottom: "12px" }}>🌾</div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--tx)", marginBottom: "8px" }}>
            Something went wrong loading this page
          </h2>
          <p style={{ fontSize: "13px", color: "var(--tx-m)", maxWidth: "460px", marginBottom: "20px" }}>
            {this.state.error?.message || "An unexpected rendering error occurred. Please refresh or try again."}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              background: "var(--cp)", color: "var(--cp-text, #fff)", border: "none",
              borderRadius: "10px", padding: "10px 24px", fontSize: "13px", fontWeight: 700,
              cursor: "pointer", boxShadow: "0 2px 10px rgba(63,107,51,0.2)"
            }}
          >
            🔄 Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/"                element={<HomePage />} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/signup"          element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Market Intelligence (Open to all visitors and farmers) */}
            <Route path="/market"          element={<FarmerMarketIntelligencePage />} />

            {/* Farmer Private Routes */}
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
        </ErrorBoundary>
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


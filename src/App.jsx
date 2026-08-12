import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import { API_BASE_URL } from "./config/api";
import Landing from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/DashboardPage";
import FeedbackStudio from "./pages/FeedbackStudioPage";
import SkillTracker from "./pages/SkillTrackerPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ProtectedRoute from "./components/ProtectedRoute";

const AuthWrapper = ({ initialMode, onAuth, setLoading, loading }) => {
  const navigate = useNavigate();
  const mode = initialMode;

  const handleSubmit = async (form, currentMode, setError, setSuccess) => {
    setLoading(true);
    try {
      const endpoint =
        currentMode === "register"
          ? "/api/auth/register"
          : "/api/auth/login";

      const payload =
        currentMode === "register"
          ? {
              name: form.name,
              email: form.email,
              password: form.password,
            }
          : { email: form.email, password: form.password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification || data.requiresOtpVerification) {
          setSuccess(data.message || "Please verify your email first.");
          navigate(
            `/verify-email?email=${encodeURIComponent(data.email || form.email || "")}`,
          );
          return;
        }

        setError(data.message || "Something went wrong");
        return;
      }

      if (data.requiresVerification || data.requiresOtpVerification) {
        setSuccess(data.message || "Please verify your email first.");
        navigate(
          `/verify-email?email=${encodeURIComponent(
            data.email || form.email || "",
          )}${
            data.verificationToken
              ? `&token=${encodeURIComponent(data.verificationToken)}`
              : ""
          }`,
        );
        return;
      }

      onAuth(data);
      navigate("/dashboard");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage
      mode={mode}
      onSubmit={handleSubmit}
      loading={loading}
    />
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState("loading");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    const hydrateAuth = async () => {
      if (!storedToken) {
        setAuthStatus("guest");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/user`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Session expired");
        }

        const data = await res.json();
        const nextUser = data?.user || (storedUser ? JSON.parse(storedUser) : null);

        if (nextUser) {
          setUser(nextUser);
          setToken(storedToken);
          localStorage.setItem("user", JSON.stringify(nextUser));
          setAuthStatus("authenticated");
          return;
        }

        throw new Error("Invalid session");
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);
        setAuthStatus("guest");
      }
    };

    hydrateAuth();
  }, []);

  const handleAuth = (data) => {
    const nextToken = data?.token;
    const nextUser = data?.user;

    if (!nextToken || !nextUser) {
      return;
    }

    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(nextToken);
    setAuthStatus("authenticated");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setAuthStatus("guest");
  };

  return (
    <Router>
      <div className="app-shell">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <AuthWrapper
                initialMode="login"
                onAuth={handleAuth}
                setLoading={setLoading}
                loading={loading}
              />
            }
          />
          <Route
            path="/register"
            element={
              <AuthWrapper
                initialMode="register"
                onAuth={handleAuth}
                setLoading={setLoading}
                loading={loading}
              />
            }
          />
          <Route
            path="/verify-email"
            element={
              <VerifyEmailPage
                onAuth={handleAuth}
                setLoading={setLoading}
                loading={loading}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute authStatus={authStatus}>
                <Dashboard user={user} token={token} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute authStatus={authStatus}>
                <FeedbackStudio token={token} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skills"
            element={
              <ProtectedRoute authStatus={authStatus}>
                <SkillTracker token={token} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview"
            element={
              <ProtectedRoute authStatus={authStatus}>
                <Dashboard user={user} token={token} />
              </ProtectedRoute>
            }
          />
        </Routes>
        <footer>Built for NextStep AI • Prepare smarter, not harder.</footer>
      </div>
    </Router>
  );
};

export default App;

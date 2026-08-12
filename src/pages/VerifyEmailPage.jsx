import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../config/api";

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const VerifyEmailPage = ({ onAuth, loading, setLoading }) => {
  const query = useQuery();
  const navigate = useNavigate();
  const [email, setEmail] = useState(query.get("email") || "");
  const [token, setToken] = useState(query.get("token") || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoRunning, setAutoRunning] = useState(
    Boolean(query.get("email") && query.get("token")),
  );

  useEffect(() => {
    const nextEmail = query.get("email") || "";
    const nextToken = query.get("token") || "";
    setEmail(nextEmail);
    setToken(nextToken);

    if (nextEmail && nextToken) {
      void handleVerify(nextEmail, nextToken, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleVerify = async (emailValue = email, tokenValue = token, fromAuto = false) => {
    if (!emailValue || !tokenValue) {
      setError("Please enter email and verification token.");
      return;
    }

    if (!fromAuto) {
      setLoading?.(true);
    } else {
      setAutoRunning(true);
    }

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, token: tokenValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Verification failed");
        return;
      }

      setSuccess(data.message || "Email verified successfully. Redirecting...");
      if (typeof onAuth === "function") {
        onAuth(data);
      }

      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      if (!fromAuto) {
        setLoading?.(false);
      }
      setAutoRunning(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }

    setLoading?.(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not resend verification email");
        return;
      }

      setSuccess(data.message || "Verification email resent successfully.");
      if (data.verificationToken) {
        setToken(data.verificationToken);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading?.(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h2>Verify your email</h2>
        <p className="helper">
          Enter the verification token sent to your inbox, or open the link from your email.
        </p>

        <div style={{ display: "grid", gap: "12px" }}>
          <input
            className="input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            placeholder="Verification token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="helper">{success}</div>}
        {autoRunning && <div className="helper">Verifying your email automatically...</div>}

        <button
          className="button primary"
          style={{ width: "100%", marginTop: "16px" }}
          disabled={loading || autoRunning}
          onClick={() => handleVerify()}
        >
          {loading || autoRunning ? "Please wait..." : "Verify Email"}
        </button>

        <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="button outline"
            onClick={handleResend}
            disabled={loading || autoRunning}
          >
            Resend verification
          </button>
          <button
            type="button"
            className="button outline"
            onClick={() => navigate("/login")}
            disabled={loading || autoRunning}
          >
            Back to Login
          </button>
        </div>
      </div>
    </section>
  );
};

export default VerifyEmailPage;

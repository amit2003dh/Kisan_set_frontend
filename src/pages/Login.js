import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.58-1 8-3 3.7-7 4-7 10z" />
    <path d="M9 22v-6" />
  </svg>
);

const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const StoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a1 1 0 0 0 1-1V8.5L12 3 3 8.5V19a1 1 0 0 0 1 1h16z" />
    <path d="M3 8.5h18" />
    <path d="M12 3v5.5" />
  </svg>
);

const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // true = login, false = signup
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [forgotForm, setForgotForm] = useState({
    email: "",
    phone: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  // Role dropdown custom select state
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        // Redirect based on role and verification status
        if (userData.role === "delivery_partner") {
          // Always redirect delivery partners to their dashboard
          // The dashboard will show appropriate content based on verification status
          navigate("/delivery-partner", { replace: true });
        } else if (userData.role === "farmer") {
          navigate("/farmer", { replace: true });
        } else if (userData.role === "buyer") {
          navigate("/buyer", { replace: true });
        } else if (userData.role === "seller") {
          navigate("/seller", { replace: true });
        } else {
          navigate("/crops", { replace: true });
        }
      } catch (e) {
        // Invalid user data, clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userRole");
      }
    }
  }, [navigate]);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "farmer",
    location: ""
  });

  const handleLogin = async (e) => {
    e?.preventDefault();
    
    if (!loginForm.email.trim() || !loginForm.password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: err } = await apiCall(() =>
      API.post("/users/login", loginForm)
    );

    if (err || !data?.success) {
      setError(err || "Login failed. Please check your credentials.");
      setLoading(false);
      return;
    }

    // Save token and user data
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userRole", data.user.role);

    // Check delivery partner registration status and redirect accordingly
    if (data.user.role === "delivery_partner") {
      if (data.deliveryPartnerStatus?.isVerified) {
        // Verified delivery partner - go to dashboard
        navigate("/delivery-partner");
      } else {
        // Not verified delivery partner - go to dashboard to see registration prompt
        navigate("/delivery-partner");
      }
    } else if (data.user.role === "farmer") {
      navigate("/farmer");
    } else if (data.user.role === "buyer") {
      navigate("/buyer");
    } else if (data.user.role === "seller") {
      navigate("/seller");
    } else {
      navigate("/crops");
    }
  };

  const handleSandboxLogin = async () => {
    setLoginForm({ email: "amitg@gmail.com", password: "asdfgh" });
    setLoading(true);
    setError("");

    const { data, error: err } = await apiCall(() =>
      API.post("/users/login", { email: "amitg@gmail.com", password: "asdfgh" })
    );

    if (err || !data?.success) {
      setError(err || "Sandbox login failed. Please check your credentials.");
      setLoading(false);
      return;
    }

    // Save token and user data
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userRole", data.user.role);

    // Check delivery partner registration status and redirect accordingly
    if (data.user.role === "delivery_partner") {
      navigate("/delivery-partner");
    } else if (data.user.role === "farmer") {
      navigate("/farmer");
    } else if (data.user.role === "buyer") {
      navigate("/buyer");
    } else if (data.user.role === "seller") {
      navigate("/seller");
    } else {
      navigate("/crops");
    }
  };

  const handleSignup = async (e) => {
    e?.preventDefault();
    
    if (!signupForm.name.trim() || !signupForm.email.trim() || !signupForm.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (signupForm.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    // Validate phone number (10 digits)
    if (signupForm.phone && signupForm.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }

    setLoading(true);
    setError("");

    const { confirmPassword, ...signupData } = signupForm;

    const { data, error: err } = await apiCall(() =>
      API.post("/users/signup", signupData)
    );

    if (err || !data?.success) {
      setError(err || "Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    // Save token and user data
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userRole", data.user.role);

    // Redirect based on role
    if (data.user.role === "farmer") {
      navigate("/farmer");
    } else if (data.user.role === "delivery_partner") {
      navigate("/delivery-partner");
    } else {
      navigate("/crops");
    }
  };

  const handleForgotPassword = async (e) => {
    e?.preventDefault();

    if (!forgotForm.email.trim() || !forgotForm.phone.trim() || !forgotForm.newPassword || !forgotForm.confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (forgotForm.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (forgotForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    const { data, error: err } = await apiCall(() =>
      API.post("/users/forgot-password", {
        email: forgotForm.email,
        phone: forgotForm.phone,
        newPassword: forgotForm.newPassword
      })
    );

    if (err || !data?.success) {
      setError(err || "Failed to reset password. Please verify your credentials.");
      setLoading(false);
      return;
    }

    setSuccessMessage(data.message || "Password reset successfully!");
    setForgotForm({ email: "", phone: "", newPassword: "", confirmPassword: "" });
    setLoading(false);
    
    // Auto switch to login after 3 seconds
    setTimeout(() => {
      setShowForgotPassword(false);
      setSuccessMessage("");
    }, 3000);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)",
      padding: "20px"
    }}>
      <div className="card" style={{ maxWidth: "450px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ 
            color: "var(--primary-green)", 
            fontSize: "32px", 
            marginBottom: "8px",
            fontWeight: "700"
          }}>
            🌾 KisanSetu
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
            Your Digital Bridge to Agriculture
          </p>
        </div>

        {/* Tabs or Reset Password Header */}
        {showForgotPassword ? (
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h2 style={{ color: "var(--primary-green)", fontSize: "22px", fontWeight: "600" }}>
              Reset Password
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
              Enter your credentials to update your password
            </p>
          </div>
        ) : (
          <div style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            borderBottom: "2px solid var(--border)"
          }}>
            <button
              onClick={() => {
                setIsLogin(true);
                setShowForgotPassword(false);
                setError("");
                setSuccessMessage("");
              }}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: "transparent",
                borderBottom: isLogin ? "3px solid var(--primary-green)" : "3px solid transparent",
                color: isLogin ? "var(--primary-green)" : "var(--text-secondary)",
                fontWeight: isLogin ? "600" : "400",
                cursor: "pointer",
                fontSize: "16px",
                transition: "all 0.3s"
              }}
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setShowForgotPassword(false);
                setError("");
                setSuccessMessage("");
              }}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: "transparent",
                borderBottom: !isLogin ? "3px solid var(--primary-green)" : "3px solid transparent",
                color: !isLogin ? "var(--primary-green)" : "var(--text-secondary)",
                fontWeight: !isLogin ? "600" : "400",
                cursor: "pointer",
                fontSize: "16px",
                transition: "all 0.3s"
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Email *
              </label>
              <input
                className="input"
                type="email"
                placeholder="Enter your registered email"
                value={forgotForm.email}
                onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })}
                disabled={loading}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Phone Number (10 digits) *
              </label>
              <input
                className="input"
                type="tel"
                placeholder="Enter registered phone number"
                value={forgotForm.phone}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "");
                  if (digitsOnly.length <= 10) {
                    setForgotForm({ ...forgotForm, phone: digitsOnly });
                  }
                }}
                disabled={loading}
                maxLength="10"
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                New Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showForgotNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={forgotForm.newPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                  disabled={loading}
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    zIndex: 10
                  }}
                >
                  {showForgotNewPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Confirm New Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showForgotConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={forgotForm.confirmPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })}
                  disabled={loading}
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    zIndex: 10
                  }}
                >
                  {showForgotConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginBottom: "16px" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ 
                    width: "20px", 
                    height: "20px", 
                    borderWidth: "2px",
                    margin: "0"
                  }}></div>
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>

            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError("");
                  setSuccessMessage("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary-green)",
                  cursor: "pointer",
                  fontWeight: "600",
                  textDecoration: "underline"
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : isLogin ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Email *
              </label>
              <input
                className="input"
                type="email"
                placeholder="Enter your email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                disabled={loading}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  disabled={loading}
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    zIndex: 10
                  }}
                >
                  {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError("");
                    setSuccessMessage("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary-green)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: 0,
                    textDecoration: "underline"
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ 
                    width: "20px", 
                    height: "20px", 
                    borderWidth: "2px",
                    margin: "0"
                  }}></div>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>

            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              margin: "18px 0 12px 0" 
            }}>
              <hr style={{ flex: 1, border: "none", borderTop: "1px dashed var(--border-color, #e0e0e0)" }} />
              <span style={{ padding: "0 10px", fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>Sandbox</span>
              <hr style={{ flex: 1, border: "none", borderTop: "1px dashed var(--border-color, #e0e0e0)" }} />
            </div>

            <button
              type="button"
              onClick={handleSandboxLogin}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "rgba(76, 175, 80, 0.08)",
                border: "1px solid var(--primary-green)",
                borderRadius: "8px",
                color: "var(--primary-green)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
            >
              ⚡ Fast Sandbox Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Full Name *
              </label>
              <input
                className="input"
                placeholder="Enter your full name"
                value={signupForm.name}
                onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                disabled={loading}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Email *
              </label>
              <input
                className="input"
                type="email"
                placeholder="Enter your email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Password * (min 6 characters)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showSignupPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  disabled={loading}
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    zIndex: 10
                  }}
                >
                  {showSignupPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Confirm Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showSignupConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                  disabled={loading}
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    zIndex: 10
                  }}
                >
                  {showSignupConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Phone Number (10 digits)
              </label>
              <input
                className="input"
                type="tel"
                placeholder="Enter 10-digit phone number"
                value={signupForm.phone}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, ""); // Remove non-digits
                  if (digitsOnly.length <= 10) {
                    setSignupForm({ ...signupForm, phone: digitsOnly });
                  }
                }}
                disabled={loading}
                maxLength="10"
              />
              {signupForm.phone && signupForm.phone.length !== 10 && (
                <p style={{
                  fontSize: "12px",
                  color: "var(--error)",
                  marginTop: "4px"
                }}>
                  Phone number must be exactly 10 digits
                </p>
              )}
            </div>

            <div style={{ marginBottom: "16px", position: "relative" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                I am a *
              </label>
              
              {(() => {
                const roles = [
                  { value: "farmer", label: "Farmer", icon: <LeafIcon /> },
                  { value: "buyer", label: "Buyer", icon: <ShoppingCartIcon /> },
                  { value: "seller", label: "Seller", icon: <StoreIcon /> },
                  { value: "delivery_partner", label: "Delivery Partner", icon: <TruckIcon /> }
                ];
                const selectedRole = roles.find(r => r.value === signupForm.role) || roles[0];
                
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid var(--border)",
                        borderRadius: "var(--border-radius-sm)",
                        background: "var(--surface)",
                        color: "var(--text-primary)",
                        fontSize: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.3s"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "var(--primary-green)"}
                      onBlur={(e) => {
                        // Close dropdown after click registers
                        setTimeout(() => setShowRoleDropdown(false), 200);
                        e.target.style.borderColor = "var(--border)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: "var(--primary-green)", display: "flex", alignItems: "center" }}>
                          {selectedRole.icon}
                        </span>
                        <span>{selectedRole.label}</span>
                      </div>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {showRoleDropdown ? "▲" : "▼"}
                      </span>
                    </button>

                    {showRoleDropdown && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        background: "white",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--border-radius-sm)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        zIndex: 100,
                        overflow: "hidden"
                      }}>
                        {roles.map((role) => (
                          <button
                            key={role.value}
                            type="button"
                            onMouseDown={() => {
                              setSignupForm({ ...signupForm, role: role.value });
                              setShowRoleDropdown(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              border: "none",
                              background: signupForm.role === role.value ? "#f1f8e9" : "transparent",
                              color: signupForm.role === role.value ? "var(--primary-green)" : "var(--text-primary)",
                              fontSize: "15px",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              cursor: "pointer",
                              textAlign: "left",
                              fontWeight: signupForm.role === role.value ? "600" : "400",
                              transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              if (signupForm.role !== role.value) {
                                e.target.style.background = "#f5f5f5";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (signupForm.role !== role.value) {
                                e.target.style.background = "transparent";
                              }
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", color: signupForm.role === role.value ? "var(--primary-green)" : "var(--text-secondary)" }}>
                              {role.icon}
                            </span>
                            <span>{role.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Location
              </label>
              <input
                className="input"
                placeholder="Enter your location"
                value={signupForm.location}
                onChange={(e) => setSignupForm({ ...signupForm, location: e.target.value })}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ 
                    width: "20px", 
                    height: "20px", 
                    borderWidth: "2px",
                    margin: "0"
                  }}></div>
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>
        )}

        {!showForgotPassword && (
          <div style={{ 
            marginTop: "24px", 
            paddingTop: "24px", 
            borderTop: "1px solid var(--border)",
            textAlign: "center"
          }}>
            <p style={{ color: "var(--text-light)", fontSize: "14px" }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary-green)",
                  cursor: "pointer",
                  fontWeight: "600",
                  textDecoration: "underline"
                }}
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

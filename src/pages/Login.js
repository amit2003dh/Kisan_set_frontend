import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // true = login, false = signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          borderBottom: "2px solid var(--border)"
        }}>
          <button
            onClick={() => {
              setIsLogin(true);
              setError("");
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
              setError("");
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

        {error && <div className="error-message">{error}</div>}

        {isLogin ? (
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
              <input
                className="input"
                type="password"
                placeholder="Enter your password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
                  Logging in...
                </>
              ) : (
                "Login"
              )}
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
              <input
                className="input"
                type="password"
                placeholder="Create a password"
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
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
                Confirm Password *
              </label>
              <input
                className="input"
                type="password"
                placeholder="Confirm your password"
                value={signupForm.confirmPassword}
                onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
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

            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                I am a *
              </label>
              <select
                className="select"
                value={signupForm.role}
                onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                disabled={loading}
              >
                <option value="farmer">👨‍🌾 Farmer</option>
                <option value="buyer">🛒 Buyer</option>
                <option value="seller">🏪 Seller</option>
                <option value="delivery_partner">🚚 Delivery Partner</option>
              </select>
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
      </div>
    </div>
  );
}

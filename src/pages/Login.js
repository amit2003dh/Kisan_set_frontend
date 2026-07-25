import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", phone: "", role: "farmer", location: ""
  });
  const [forgotForm, setForgotForm] = useState({ email: "", phone: "", newPassword: "", confirmPassword: "" });

  const redirectUser = (role) => {
    const roleRoutes = {
      delivery_partner: "/delivery-partner",
      farmer: "/farmer",
      buyer: "/buyer",
      seller: "/seller"
    };
    navigate(roleRoutes[role] || "/crops", { replace: true });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      try {
        const u = JSON.parse(user);
        redirectUser(u.role);
      } catch (e) {
        localStorage.clear();
      }
    }
  }, [navigate]);


  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password) return setError("Please enter email and password");

    setLoading(true);
    setError("");

    const { data, error: err } = await apiCall(() => API.post("/users/login", loginForm));
    if (err || !data?.success) {
      setError(err || "Login failed");
      setLoading(false);
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userRole", data.user.role);
    redirectUser(data.user.role);
  };

  const handleSandboxLogin = async () => {
    setLoginForm({ email: "amitg@gmail.com", password: "asdfgh" });
    setLoading(true);
    setError("");

    const { data, error: err } = await apiCall(() => API.post("/users/login", { email: "amitg@gmail.com", password: "asdfgh" }));
    if (err || !data?.success) {
      setError(err || "Sandbox login failed");
      setLoading(false);
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userRole", data.user.role);
    redirectUser(data.user.role);
  };

  const handleSignup = async (e) => {
    e?.preventDefault();
    if (!signupForm.name || !signupForm.email || !signupForm.password) return setError("Please fill in required fields");
    if (signupForm.password !== signupForm.confirmPassword) return setError("Passwords do not match");
    if (signupForm.password.length < 6) return setError("Password must be at least 6 characters");
    if (signupForm.phone && signupForm.phone.length !== 10) return setError("Phone must be 10 digits");

    setLoading(true);
    setError("");

    const { data, error: err } = await apiCall(() => API.post("/users/signup", signupForm));
    if (err || !data?.success) {
      setError(err || "Signup failed");
      setLoading(false);
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userRole", data.user.role);
    redirectUser(data.user.role);
  };

  const handleForgotPassword = async (e) => {
    e?.preventDefault();
    if (!forgotForm.email || !forgotForm.phone || !forgotForm.newPassword) return setError("Please fill all required fields");
    if (forgotForm.newPassword !== forgotForm.confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    setError("");

    const { data, error: err } = await apiCall(() => API.post("/users/forgot-password", forgotForm));
    if (err || !data?.success) {
      setError(err || "Reset failed");
      setLoading(false);
      return;
    }

    setSuccessMessage("Password reset successfully! Please log in.");
    setShowForgotPassword(false);
    setIsLogin(true);
    setLoading(false);
  };

  return (
    <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="card" style={{ maxWidth: "450px", width: "100%", padding: "32px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ color: "var(--primary-green)", fontSize: "28px", margin: "0 0 8px 0" }}>🌾 KisanSetu</h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Empowering Farmers & Buyers</p>
        </div>

        {error && <div className="error-message" style={{ padding: "12px", marginBottom: "16px" }}>{error}</div>}
        {successMessage && <div className="success-message" style={{ padding: "12px", marginBottom: "16px" }}>{successMessage}</div>}

        {!showForgotPassword ? (
          <>
            <div style={{ display: "flex", marginBottom: "20px", borderBottom: "1px solid var(--border-color)" }}>
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(""); }}
                style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: isLogin ? "3px solid var(--primary-green)" : "none", fontWeight: isLogin ? "bold" : "normal" }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(""); }}
                style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: !isLogin ? "3px solid var(--primary-green)" : "none", fontWeight: !isLogin ? "bold" : "normal" }}
              >
                Sign Up
              </button>
            </div>

            {isLogin ? (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px" }}>Email</label>
                  <input className="input" type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} required />
                </div>
                <div style={{ marginBottom: "16px", position: "relative" }}>
                  <label style={{ display: "block", marginBottom: "6px" }}>Password</label>
                  <input className="input" type={showPassword ? "text" : "password"} value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "35px", background: "none", border: "none", cursor: "pointer" }}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div style={{ textAlign: "right", marginBottom: "20px" }}>
                  <button type="button" onClick={() => setShowForgotPassword(true)} style={{ background: "none", border: "none", color: "var(--primary-blue)", cursor: "pointer", fontSize: "14px" }}>
                    Forgot Password?
                  </button>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }} disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>

                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <button type="button" onClick={handleSandboxLogin} className="btn btn-secondary" style={{ width: "100%", padding: "10px" }} disabled={loading}>
                    🧪 Quick Demo Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", marginBottom: "4px" }}>Full Name *</label>
                  <input className="input" value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} required />
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", marginBottom: "4px" }}>Email *</label>
                  <input className="input" type="email" value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} required />
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", marginBottom: "4px" }}>Role *</label>
                  <select className="input" value={signupForm.role} onChange={e => setSignupForm({ ...signupForm, role: e.target.value })}>
                    <option value="farmer">Farmer</option>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="delivery_partner">Delivery Partner</option>
                  </select>
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", marginBottom: "4px" }}>Phone Number</label>
                  <input className="input" value={signupForm.phone} onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })} placeholder="10 digits" />
                </div>
                <div style={{ marginBottom: "14px", position: "relative" }}>
                  <label style={{ display: "block", marginBottom: "4px" }}>Password *</label>
                  <input className="input" type={showPassword ? "text" : "password"} value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "30px", background: "none", border: "none", cursor: "pointer" }}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div style={{ marginBottom: "20px", position: "relative" }}>
                  <label style={{ display: "block", marginBottom: "4px" }}>Confirm Password *</label>
                  <input className="input" type={showConfirmPassword ? "text" : "password"} value={signupForm.confirmPassword} onChange={e => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "10px", top: "30px", background: "none", border: "none", cursor: "pointer" }}>
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }} disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}
          </>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <h3 style={{ marginBottom: "16px" }}>🔑 Reset Password</h3>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "4px" }}>Registered Email</label>
              <input className="input" type="email" value={forgotForm.email} onChange={e => setForgotForm({ ...forgotForm, email: e.target.value })} required />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "4px" }}>Phone Number</label>
              <input className="input" value={forgotForm.phone} onChange={e => setForgotForm({ ...forgotForm, phone: e.target.value })} required />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "4px" }}>New Password</label>
              <input className="input" type="password" value={forgotForm.newPassword} onChange={e => setForgotForm({ ...forgotForm, newPassword: e.target.value })} required />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "4px" }}>Confirm New Password</label>
              <input className="input" type="password" value={forgotForm.confirmPassword} onChange={e => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", marginBottom: "12px" }} disabled={loading}>
              Reset Password
            </button>
            <button type="button" onClick={() => setShowForgotPassword(false)} className="btn btn-outline" style={{ width: "100%", padding: "10px" }}>
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

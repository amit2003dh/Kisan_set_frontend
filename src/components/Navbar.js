import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole") || "";
  const user = localStorage.getItem("user");
  const userName = user ? JSON.parse(user).name : "";
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const navLinks = [
    { path: "/crops", label: "🌾 Crops", icon: "🌾" },
    { path: "/products", label: "🛒 Store", icon: "🛒" },
    { path: "/crop-doctor", label: "👨‍⚕️ Crop Doctor", icon: "👨‍⚕️" },
    { path: "/tracking", label: "📍 Tracking", icon: "📍" },
  ];

  // Add dashboard for farmers and sellers
  if (userRole === "farmer" || userRole === "seller") {
    navLinks.unshift({ path: "/farmer", label: "🏠 Dashboard", icon: "🏠" });
  }

  // Add Crop - only for farmers
  if (userRole === "farmer") {
    navLinks.push({ path: "/add-crop", label: "➕ Add Crop", icon: "➕" });
  }

  // Add Product - only for sellers
  if (userRole === "seller") {
    navLinks.push({ path: "/add-product", label: "🧪 Add Product", icon: "🧪" });
  }

  // Add Cart - only for buyers
  if (userRole === "buyer") {
    navLinks.push({ 
      path: "/cart", 
      label: `🛒 Cart${cartCount > 0 ? ` (${cartCount})` : ""}`, 
      icon: "🛒" 
    });
  }

  return (
    <nav style={{
      background: "var(--primary-green)",
      boxShadow: "var(--shadow-md)",
      position: "sticky",
      top: 0,
      zIndex: 1000
    }}>
      <div className="container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <Link 
          to="/" 
          style={{
            color: "white",
            textDecoration: "none",
            fontSize: "24px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          🌾 KisanSetu
        </Link>

        <div style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap"
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                color: "white",
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: "var(--border-radius-sm)",
                background: isActive(link.path) ? "rgba(255,255,255,0.2)" : "transparent",
                transition: "background 0.3s",
                fontWeight: isActive(link.path) ? "600" : "400",
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                if (!isActive(link.path)) {
                  e.target.style.background = "rgba(255,255,255,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(link.path)) {
                  e.target.style.background = "transparent";
                }
              }}
            >
              {link.label}
            </Link>
          ))}
          
          {userName && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginLeft: "16px",
              paddingLeft: "16px",
              borderLeft: "1px solid rgba(255,255,255,0.3)"
            }}>
              <Link
                to="/profile"
                style={{
                  color: "white",
                  textDecoration: "none",
                  padding: "10px 16px",
                  borderRadius: "var(--border-radius-sm)",
                  background: isActive("/profile") ? "rgba(255,255,255,0.2)" : "transparent",
                  transition: "background 0.3s",
                  fontWeight: isActive("/profile") ? "600" : "400",
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/profile")) {
                    e.target.style.background = "rgba(255,255,255,0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/profile")) {
                    e.target.style.background = "transparent";
                  }
                }}
              >
                👤 Profile
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "var(--border-radius-sm)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "background 0.3s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

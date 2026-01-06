import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  // Get current user from localStorage
  const user = localStorage.getItem("user");
  const userData = user ? JSON.parse(user) : null;
  const userName = userData?.name || "";
  const profilePhoto = userData?.profilePhoto;
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Handle scroll effect with hide/show behavior
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Only update if scroll difference is significant (to prevent vibration)
          const scrollDelta = Math.abs(currentScrollY - lastScrollY);
          
          if (scrollDelta > 5) { // Only react to scrolls > 5px
            // Hide navbar when scrolling down, show when scrolling up
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
              setNavbarVisible(false);
            } else {
              setNavbarVisible(true);
            }
            
            // Set scrolled state for styling
            setScrolled(currentScrollY > 20);
            lastScrollY = currentScrollY;
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  // Build navigation links based on user role
  let navLinks = [];

  // Delivery Partner Navigation
  if (userData?.role === "delivery_partner") {
    navLinks = [
      { path: "/delivery-partner", label: "🏠 Dashboard", icon: "🏠" },
      { path: "/delivery-partner/orders", label: "📦 My Orders", icon: "📦" },
      { path: "/tracking", label: "📍 Tracking", icon: "📍" }
    ];
  } else {
    // Other Users Navigation
    navLinks = [
      { path: "/crops", label: "🌾 Crops", icon: "🌾" },
      { path: "/products", label: "🛒 Products", icon: "🛒" },
      { path: "/crop-doctor", label: "🌿 Crop Doctor", icon: "🌿" }
    ];

    // Add dashboard for farmers, sellers, and buyers
    if (userData?.role === "farmer") {
      navLinks.unshift({ path: "/farmer", label: "🏠 Dashboard", icon: "🏠" });
    } else if (userData?.role === "seller") {
      navLinks.unshift({ path: "/seller", label: "🏠 Dashboard", icon: "🏠" });
    } else if (userData) {
      // For users who are logged in but not farmers or sellers (buyers)
      navLinks.unshift({ path: "/buyer", label: "🏠 Dashboard", icon: "🏠" });
    }

    // Add Crop - only for farmers
    if (userData?.role === "farmer") {
      navLinks.push({ path: "/manage-crops", label: "🌾 Manage Crops", icon: "🌾" });
      navLinks.push({ path: "/add-crop", label: "➕ Add Crop", icon: "➕" });
    }

    // Add Product - only for sellers
    if (userData?.role === "seller") {
      navLinks.push({ path: "/manage-products", label: "🛒 Manage Products", icon: "🛒" });
      navLinks.push({ path: "/add-product", label: "🧪 Add Product", icon: "🧪" });
    }

    // Add Cart - for users who can buy (farmers and buyers, not sellers)
    if (userData?.role === "farmer" || userData?.role === "buyer") {
      navLinks.push({ 
        path: "/cart", 
        label: `🛒 Cart${cartCount > 0 ? ` (${cartCount})` : ""}`, 
        icon: "🛒" 
      });
    }

    // Add Orders - for all users except delivery partners
    navLinks.push({ 
      path: "/orders", 
      label: "📦 Orders", 
      icon: "📦" 
    });
  }

  return (
    <>
      {/* Add padding to body to prevent content from being hidden behind navbar */}
      <div style={{
        height: navbarVisible ? "70px" : "35px", // Half padding when navbar is halfway hidden
        transition: "height 0.3s ease"
      }} />
      
      <nav style={{
        position: "fixed",
        top: navbarVisible ? "0" : "-35px", // Hide halfway (35px of 70px)
        left: 0,
        right: 0,
        zIndex: 1000,
        background: scrolled ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 1)",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.1)" : "none",
        transition: "all 0.3s ease",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.1)" : "1px solid var(--border-color)",
        transform: navbarVisible ? "translateY(0)" : "translateY(-35px)" // Halfway transform
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "70px"
        }}>
          {/* Logo */}
          {userData?.role === "delivery_partner" ? (
            <Link 
              to="/delivery-partner" 
              style={{
                textDecoration: "none",
                fontSize: "24px",
                fontWeight: "bold",
                color: "var(--primary-blue)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              🚚 DeliveryHub
            </Link>
          ) : (
            <Link 
              to="/crops" 
              style={{
                textDecoration: "none",
                fontSize: "24px",
                fontWeight: "bold",
                color: "var(--primary-blue)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              🌾 KisanSetu
            </Link>
          )}

          {/* Navigation Links - Single Row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            justifyContent: "center"
          }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  textDecoration: "none",
                  color: isActive(link.path) ? "var(--primary-blue)" : "var(--text-primary)",
                  padding: "8px 16px",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                  background: isActive(link.path) ? "var(--primary-blue)20" : "transparent",
                  border: isActive(link.path) ? "1px solid var(--primary-blue)" : "1px solid transparent",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={(e) => {
                  if (!isActive(link.path)) {
                    e.target.style.background = "rgba(0,0,0,0.05)";
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
          </div>

          {/* Profile Section */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Profile Button */}
            <div style={{ position: "relative" }} ref={profileMenuRef}>
              <button
                onClick={toggleProfileMenu}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  padding: "8px 12px",
                  borderRadius: "var(--border-radius-sm)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "background 0.3s",
                  color: "var(--text-primary)"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                }}
              >
                {profilePhoto ? (
                  <img
                    src={`${API_BASE_URL}${profilePhoto}`}
                    alt="Profile"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid rgba(255,255,255,0.3)"
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (!e.target.nextSibling || e.target.nextSibling.textContent !== "👤") {
                        const span = document.createElement("span");
                        span.textContent = "👤";
                        e.target.parentElement.insertBefore(span, e.target);
                      }
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "18px" }}>👤</span>
                )}
                <span style={{ display: scrolled ? "none" : "block" }}>
                  {userName || "Profile"}
                </span>
                <span style={{ fontSize: "12px", marginLeft: "4px" }}>
                  {showProfileMenu ? "▲" : "▼"}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: "0",
                  marginTop: "8px",
                  background: "white",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--border-radius-md)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  minWidth: "180px",
                  zIndex: 1001,
                  overflow: "hidden"
                }}>
                  <Link
                    to="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "background 0.3s",
                      borderBottom: "1px solid var(--border-color)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "rgba(0,0,0,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    <span>👤</span>
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      color: "#dc3545",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "background 0.3s"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "rgba(220,53,69,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

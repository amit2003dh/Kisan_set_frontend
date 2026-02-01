import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  // Handle scroll effect for styling only
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (showMobileMenu && !event.target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMobileMenu]);

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

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
    setShowProfileMenu(false); // Close profile menu when opening mobile menu
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
  } else if (userData?.role === "admin") {
    // Admin Navigation - Enhanced with more admin features
    navLinks = [
      { path: "/admin/products", label: "🔐 Admin Panel", icon: "🔐" },
      { path: "/admin/analytics", label: "📊 Analytics", icon: "📊" },
      { path: "/admin/users", label: "👥 Users", icon: "👥" },
      { path: "/admin/settings", label: "⚙️ Settings", icon: "⚙️" }
    ];
  } else {
    // Other Users Navigation
    navLinks = [
      { path: "/products", label: "🛒 Products", icon: "🛒" },
      { path: "/crop-doctor", label: "🌿 Crop Doctor", icon: "🌿" }
    ];

    // Add Crops - only for farmers and buyers (not sellers)
    if (userData?.role === "farmer" || userData?.role === "buyer") {
      navLinks.unshift({ path: "/crops", label: "🌾 Crops", icon: "🌾" });
    }

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
      navLinks.push({ path: "/plant-analysis", label: "🌿 Plant Analysis", icon: "🌿" });
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
        height: isMobile ? "60px" : "70px"
      }} />
      
      <nav style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: isMobile ? "60px" : "70px",
        background: scrolled ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 1)",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.1)" : "none",
        transition: "background 0.2s ease-out, backdrop-filter 0.2s ease-out, box-shadow 0.2s ease-out",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.1)" : "1px solid var(--border-color)",
        transform: "translateY(0)",
        willChange: "transform"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: isMobile ? "0 12px" : "0 16px", // Reduced from 20px to 16px
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: isMobile ? "60px" : "70px"
        }}>
          {/* Logo */}
          {userData?.role === "delivery_partner" ? (
            <Link 
              to="/delivery-partner" 
              style={{
                textDecoration: "none",
                fontSize: isMobile ? "20px" : "24px",
                fontWeight: "bold",
                color: "var(--primary-blue)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              🚚 DeliveryHub
            </Link>
          ) : userData?.role === "seller" ? (
            <Link 
              to="/seller" 
              style={{
                textDecoration: "none",
                fontSize: isMobile ? "20px" : "24px",
                fontWeight: "bold",
                color: "var(--primary-blue)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              🏪 KisanSetu
            </Link>
          ) : userData?.role === "admin" ? (
            <Link 
              to="/admin/products" 
              style={{
                textDecoration: "none",
                fontSize: isMobile ? "18px" : "24px",
                fontWeight: "bold",
                color: "#d32f2f", // Admin red color
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              🔐 KisanSetu Admin
            </Link>
          ) : (
            <Link 
              to={userData?.role === "farmer" ? "/farmer" : 
                  userData?.role === "seller" ? "/seller" : 
                  userData?.role === "delivery_partner" ? "/delivery-partner" : 
                  userData ? "/buyer" : "/crops"} 
              style={{
                textDecoration: "none",
                fontSize: isMobile ? "20px" : "24px",
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

          {/* Desktop Navigation Links */}
          {!isMobile && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: userData?.role === "admin" ? "4px" : "6px", // Reduced from 6px/8px to 4px/6px
              flex: 1,
              justifyContent: "center",
              flexWrap: "wrap" // Allow wrapping for admin links on smaller screens
            }}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    textDecoration: "none",
                    color: userData?.role === "admin" 
                      ? (isActive(link.path) ? "#d32f2f" : "var(--text-primary)")
                      : (isActive(link.path) ? "var(--primary-blue)" : "var(--text-primary)"),
                    padding: userData?.role === "admin" ? "4px 10px" : "6px 12px", // Reduced from 6px 12px / 8px 16px
                    borderRadius: "var(--border-radius-sm)",
                    fontSize: userData?.role === "admin" ? "13px" : "14px", // Smaller font for admin
                    fontWeight: "500",
                    transition: "all 0.3s ease",
                    background: userData?.role === "admin" && isActive(link.path) 
                      ? "rgba(211, 47, 47, 0.1)" 
                      : isActive(link.path) 
                      ? "var(--primary-blue)20" 
                      : "transparent",
                    border: userData?.role === "admin" && isActive(link.path)
                      ? "1px solid #d32f2f"
                      : isActive(link.path) 
                      ? "1px solid var(--primary-blue)" 
                      : "1px solid transparent",
                    whiteSpace: "nowrap"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(link.path)) {
                      e.target.style.background = userData?.role === "admin" 
                        ? "rgba(211, 47, 47, 0.05)" 
                        : "rgba(0,0,0,0.05)";
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
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={toggleMobileMenu}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "var(--border-radius-sm)",
                transition: "background 0.3s"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
              }}
            >
              ☰
            </button>
          )}

          {/* Desktop Profile Section */}
          {!isMobile && (
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
          )}
        </div>

        {/* Mobile Menu */}
        {isMobile && showMobileMenu && (
          <div className="mobile-menu-container" style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            borderTop: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            zIndex: 1000
          }}>
            {/* Mobile Menu Header with Close Button */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-color)",
              background: "rgba(0,0,0,0.02)"
            }}>
              <div style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--text-primary)"
              }}>
                Menu
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "4px",
                  color: "var(--text-secondary)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "40px",
                  minHeight: "40px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "rgba(0,0,0,0.1)";
                  e.target.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "var(--text-secondary)";
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Mobile Navigation Links */}
            <div style={{
              padding: "16px 12px",
              borderBottom: "1px solid var(--border-color)"
            }}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setShowMobileMenu(false)}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: userData?.role === "admin" 
                      ? (isActive(link.path) ? "#d32f2f" : "var(--text-primary)")
                      : (isActive(link.path) ? "var(--primary-blue)" : "var(--text-primary)"),
                    padding: "12px 16px",
                    borderRadius: "var(--border-radius-sm)",
                    fontSize: "16px",
                    fontWeight: "500",
                    transition: "all 0.3s ease",
                    background: userData?.role === "admin" && isActive(link.path)
                      ? "rgba(211, 47, 47, 0.1)"
                      : isActive(link.path)
                      ? "var(--primary-blue)20"
                      : "transparent",
                    border: userData?.role === "admin" && isActive(link.path)
                      ? "1px solid #d32f2f"
                      : isActive(link.path)
                      ? "1px solid var(--primary-blue)"
                      : "1px solid transparent",
                    marginBottom: "8px"
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Profile Section */}
            <div style={{
              padding: "16px 12px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                background: "rgba(0,0,0,0.02)",
                borderRadius: "var(--border-radius-sm)",
                marginBottom: "12px"
              }}>
                {profilePhoto ? (
                  <img
                    src={`${API_BASE_URL}${profilePhoto}`}
                    alt="Profile"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid rgba(255,255,255,0.3)"
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (!e.target.nextSibling || e.target.nextSibling.textContent !== "👤") {
                        const span = document.createElement("span");
                        span.textContent = "👤";
                        span.style.fontSize = "24px";
                        e.target.parentElement.insertBefore(span, e.target);
                      }
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "24px" }}>👤</span>
                )}
                <div>
                  <div style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "var(--text-primary)"
                  }}>
                    {userName || "User"}
                  </div>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)"
                  }}>
                    {userData?.role || "User"}
                  </div>
                </div>
              </div>

              <Link
                to="/profile"
                onClick={() => setShowMobileMenu(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  textDecoration: "none",
                  color: "var(--text-primary)",
                  fontSize: "16px",
                  fontWeight: "500",
                  transition: "background 0.3s",
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--border-radius-sm)",
                  marginBottom: "8px"
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
                  border: "1px solid #dc3545",
                  color: "#dc3545",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background 0.3s",
                  borderRadius: "var(--border-radius-sm)"
                }}
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
        
        {/* Mobile Menu Overlay Backdrop */}
        {isMobile && showMobileMenu && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 9998
            }}
            onClick={() => setShowMobileMenu(false)}
          />
        )}
      </nav>
    </>
  );
}

import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole, excludeRoles }) {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  try {
    const userData = JSON.parse(user);
    
    // Check if user role is in excluded roles
    if (excludeRoles && excludeRoles.includes(userData.role)) {
      // Redirect to appropriate dashboard
      if (userData.role === "delivery_partner") {
        return <Navigate to="/delivery-partner" replace />;
      } else if (userData.role === "farmer") {
        return <Navigate to="/farmer" replace />;
      } else if (userData.role === "seller") {
        return <Navigate to="/seller" replace />;
      } else {
        return <Navigate to="/buyer" replace />;
      }
    }
    
    // If role is specified, check if user has that role
    if (requiredRole) {
      // Handle array of allowed roles
      if (Array.isArray(requiredRole)) {
        if (!requiredRole.includes(userData.role)) {
          // Redirect based on user's actual role
          if (userData.role === "farmer") {
            return <Navigate to="/farmer" replace />;
          } else if (userData.role === "seller") {
            return <Navigate to="/seller" replace />;
          } else if (userData.role === "delivery_partner") {
            return <Navigate to="/delivery-partner" replace />;
          } else {
            return <Navigate to="/buyer" replace />;
          }
        }
      } else {
        // Single role check
        if (userData.role !== requiredRole) {
          // Redirect based on user's actual role
          if (userData.role === "farmer") {
            return <Navigate to="/farmer" replace />;
          } else if (userData.role === "seller") {
            return <Navigate to="/seller" replace />;
          } else if (userData.role === "delivery_partner") {
            return <Navigate to="/delivery-partner" replace />;
          } else {
            return <Navigate to="/buyer" replace />;
          }
        }
      }
    }

    return children;
  } catch (e) {
    // Invalid user data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    return <Navigate to="/login" replace />;
  }
}


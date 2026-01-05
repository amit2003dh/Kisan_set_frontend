import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  try {
    const userData = JSON.parse(user);
    
    // If role is specified, check if user has that role
    if (requiredRole && userData.role !== requiredRole) {
      // Redirect based on user's actual role
      if (userData.role === "farmer") {
        return <Navigate to="/farmer" replace />;
      } else if (userData.role === "seller") {
        return <Navigate to="/products" replace />;
      } else {
        return <Navigate to="/crops" replace />;
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


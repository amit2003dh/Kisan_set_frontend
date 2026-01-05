import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import FarmerDashboard from "./pages/FarmerDashboard";
import CropList from "./pages/CropList";
import AddCrop from "./pages/AddCrop";
import AddProduct from "./pages/AddProduct";
import ProductStore from "./pages/ProductStore";
import Orders from "./pages/Orders";
import Tracking from "./pages/Tracking";
import Navbar from "./components/Navbar";
import CropDoctor from "./pages/CropDoctor";
import Payment from "./pages/Payment";
import ProtectedRoute from "./components/ProtectedRoute";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";

function AppContent() {
  const location = useLocation();
  const showNavbar = location.pathname !== "/";

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/farmer" element={<FarmerDashboard />} />
        <Route path="/add-crop" element={<ProtectedRoute requiredRole="farmer"><AddCrop /></ProtectedRoute>} />
        <Route path="/add-product" element={<ProtectedRoute requiredRole="seller"><AddProduct /></ProtectedRoute>} />
        <Route path="/crops" element={<CropList />} />
        <Route path="/products" element={<ProductStore />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/crop-doctor" element={<CropDoctor />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

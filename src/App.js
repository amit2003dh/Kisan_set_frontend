import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import FarmerDashboard from "./pages/FarmerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import DeliveryPartnerDashboard from "./pages/DeliveryPartnerDashboard";
import DeliveryPartnerOrders from "./pages/DeliveryPartnerOrders";
import ManageCrops from "./pages/ManageCrops";
import ManageProducts from "./pages/ManageProducts";
import CropList from "./pages/CropList";
import AddCrop from "./pages/AddCrop";
import AddProduct from "./pages/AddProduct";
import ProductStore from "./pages/ProductStore";
import Orders from "./pages/Orders";
import SellerOrders from "./pages/SellerOrders";
import OrderCommunication from "./pages/OrderCommunication";
import DeliveryPartnerCommunication from "./pages/DeliveryPartnerCommunication";
import Tracking from "./pages/Tracking";
import Navbar from "./components/Navbar";
import CropDoctor from "./pages/CropDoctor";
import Payment from "./pages/Payment";
import ProtectedRoute from "./components/ProtectedRoute";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import RevenueDetails from "./pages/RevenueDetails";
import CropSalesDetails from "./pages/CropSalesDetails";

function AppContent() {
  const location = useLocation();
  const showNavbar = location.pathname !== "/";

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/farmer" element={<FarmerDashboard />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/buyer" element={<BuyerDashboard />} />
        <Route path="/delivery-partner" element={<DeliveryPartnerDashboard />} />
        <Route path="/delivery-partner/orders" element={<ProtectedRoute requiredRole="delivery_partner"><DeliveryPartnerOrders /></ProtectedRoute>} />
        <Route path="/manage-crops" element={<ProtectedRoute requiredRole="farmer" excludeRoles={["delivery_partner"]}><ManageCrops /></ProtectedRoute>} />
        <Route path="/manage-products" element={<ProtectedRoute requiredRole="seller" excludeRoles={["delivery_partner"]}><ManageProducts /></ProtectedRoute>} />
        <Route path="/add-crop" element={<ProtectedRoute requiredRole="farmer" excludeRoles={["delivery_partner"]}><AddCrop /></ProtectedRoute>} />
        <Route path="/add-product" element={<ProtectedRoute requiredRole="seller" excludeRoles={["delivery_partner"]}><AddProduct /></ProtectedRoute>} />
        <Route path="/crops" element={<ProtectedRoute excludeRoles={["delivery_partner"]}><CropList /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute excludeRoles={["delivery_partner"]}><ProductStore /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute excludeRoles={["delivery_partner", "seller"]}><Cart /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute excludeRoles={["delivery_partner"]}><Orders /></ProtectedRoute>} />
        <Route path="/seller-orders" element={<ProtectedRoute requiredRole={["seller", "farmer"]}><SellerOrders /></ProtectedRoute>} />
        <Route path="/orders/:orderId/communication" element={<ProtectedRoute excludeRoles={["delivery_partner"]}><OrderCommunication /></ProtectedRoute>} />
        <Route path="/orders/:orderId/delivery-chat" element={<ProtectedRoute excludeRoles={["seller", "farmer"]}><DeliveryPartnerCommunication /></ProtectedRoute>} />
        <Route path="/tracking" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
        <Route path="/crop-doctor" element={<ProtectedRoute excludeRoles={["delivery_partner"]}><CropDoctor /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute excludeRoles={["delivery_partner", "seller"]}><Payment /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/revenue-details" element={<ProtectedRoute requiredRole={["farmer", "seller"]}><RevenueDetails /></ProtectedRoute>} />
        <Route path="/crop-sales/:cropId" element={<ProtectedRoute requiredRole={["farmer", "seller"]}><CropSalesDetails /></ProtectedRoute>} />
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

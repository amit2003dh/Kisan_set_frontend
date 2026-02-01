import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import { useCart } from "../context/CartContext";
import LiveMap from "../components/LiveMap";
import "../index.css";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();

  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [fromCart, setFromCart] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("ONLINE"); // ONLINE | COD
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  
  // Pickup address (from seller/product)
  const [pickupAddress, setPickupAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    lat: 20.5937,
    lng: 78.9629
  });
  
  // Delivery address (buyer's address)
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    address: "", 
    city: "",
    state: "",
    pincode: "",
    lat: 20.5937, 
    lng: 78.9629  
  });

  useEffect(() => {
    const urlAmount = searchParams.get("amount");
    const cropId = searchParams.get("cropId");
    const productId = searchParams.get("productId");
    const fromCartParam = searchParams.get("fromCart");

    if (fromCartParam === "true" && cart.length > 0) {
      setFromCart(true);
      const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      setAmount(total);
      setPaymentDetails({ items: cart });
    } else if (urlAmount) {
      setFromCart(false);
      setAmount(parseFloat(urlAmount));
      setPaymentDetails({
        cropId,
        productId,
        itemType: cropId ? "crop" : "product"
      });
    } else {
      setError("No payment amount specified");
    }
  }, [searchParams, cart]);

  const validateForm = () => {
    const errors = {};
    
    if (!address.name.trim()) {
      errors.name = "Name is required";
    }
    
    if (!address.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\D/g, ''))) {
      errors.phone = "Please enter a valid 10-digit mobile number";
    }
    
    if (!address.address.trim()) {
      errors.address = "Address is required";
    }
    
    if (!address.city.trim()) {
      errors.city = "City is required";
    }
    
    if (!address.state.trim()) {
      errors.state = "State is required";
    }
    
    if (!address.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(address.pincode)) {
      errors.pincode = "Please enter a valid 6-digit pincode";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleLocationUpdate = (newLocation) => {
    console.log("📍 Location updated:", newLocation);
    setAddress(prev => ({
      ...prev,
      lat: newLocation.lat,
      lng: newLocation.lng
    }));
  };

  // Function to get coordinates from address using Nominatim (OpenStreetMap)
  const getCoordinatesFromAddress = async (addressString) => {
    if (!addressString || addressString.trim().length < 3) {
      return null;
    }

    try {
      console.log("🔍 Getting coordinates from address:", addressString);
      const encodedAddress = encodeURIComponent(addressString);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch coordinates');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const coordinates = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        console.log("✅ Coordinates found:", coordinates);
        return coordinates;
      } else {
        console.log("⚠️ No coordinates found for address");
        return null;
      }
    } catch (error) {
      console.error("❌ Error getting coordinates from address:", error);
      return null;
    }
  };

  // Function to try to get coordinates from address fields
  const tryGetCoordinatesFromAddress = async () => {
    const fullAddress = `${address.address}, ${address.city}, ${address.state} ${address.pincode}`.trim();
    const coordinates = await getCoordinatesFromAddress(fullAddress);
    
    if (coordinates) {
      setAddress(prev => ({
        ...prev,
        lat: coordinates.lat,
        lng: coordinates.lng
      }));
      console.log("✅ Successfully updated coordinates from address");
      return true;
    } else {
      console.log("⚠️ Could not get coordinates from address, keeping default");
      return false;
    }
  };

  // Effect to try getting coordinates from address when user fills in address fields
  // REMOVED: Now using manual button instead of automatic lookup
  // useEffect(() => {
  //   const timeoutId = setTimeout(async () => {
  //     // Only try to get coordinates if user is not using live location
  //     if (!useCurrentLocation && address.address && address.city && address.state && address.pincode) {
  //       const fullAddress = `${address.address}, ${address.city}, ${address.state} ${address.pincode}`.trim();
  //       if (fullAddress.length > 10) { // Only try if address is substantial
  //         console.log("🔍 Auto-fetching coordinates from address:", fullAddress);
  //         await tryGetCoordinatesFromAddress();
  //       }
  //     }
  //   }, 1500); // Wait 1.5 seconds after user stops typing

  //   return () => clearTimeout(timeoutId);
  // }, [address.address, address.city, address.state, address.pincode, useCurrentLocation]);

  // Function to fetch product/crop details and populate pickup address
  const fetchItemDetails = async () => {
    if (!paymentDetails?.cropId && !paymentDetails?.productId) {
      return;
    }

    try {
      console.log("🔍 Fetching item details for:", paymentDetails);
      let response;
      
      if (paymentDetails.cropId) {
        response = await apiCall(() => API.get(`/crops/${paymentDetails.cropId}`));
      } else if (paymentDetails.productId) {
        response = await apiCall(() => API.get(`/products/${paymentDetails.productId}`));
      }

      if (response.data && !response.error) {
        const item = response.data;
        console.log("✅ Item details fetched:", item);
        
        // For both crops and products, use the location field directly from the item
        if (item.location) {
          console.log("🏪 Using item location for pickup address:", item.location);
          
          // Check if location has default/placeholder values
          const hasDefaultValues = 
            item.location.address === "Seller Location" ||
            item.location.city === "Default City" ||
            item.location.state === "Default State" ||
            item.location.pincode === "000000";
          
          if (hasDefaultValues) {
            console.log("⚠️ Item has default location values, trying seller info as fallback");
            
            // Try to get seller info instead
            if (item.sellerId) {
              let sellerResponse;
              if (item.sellerId._id) {
                sellerResponse = { data: item.sellerId };
              } else {
                sellerResponse = await apiCall(() => API.get(`/users/${item.sellerId}`));
              }
              
              if (sellerResponse.data && !sellerResponse.error) {
                const seller = sellerResponse.data;
                console.log("✅ Using seller details instead of default location:", seller);
                
                const newPickupAddress = {
                  name: seller.name || "Seller Name",
                  phone: seller.phone || "Seller Phone",
                  address: seller.address || seller.addressLine || "Seller Address",
                  city: seller.city || "Seller City",
                  state: seller.state || "Seller State", 
                  pincode: seller.pincode || "Seller Pincode",
                  lat: seller.lat || 20.5937,
                  lng: seller.lng || 78.9629
                };
                
                console.log("🏪 Setting pickup address from seller (replacing defaults):", newPickupAddress);
                setPickupAddress(newPickupAddress);
                console.log("✅ PICKUP address populated from seller (replaced defaults)");
              } else {
                console.log("⚠️ No seller data found, keeping defaults");
              }
            }
          } else {
            // Use real location data
            const newPickupAddress = {
              name: item.contactInfo?.phone || "Seller Phone",
              phone: item.contactInfo?.phone || "Seller Phone",
              address: item.location.address || "Item Address",
              city: item.location.city || "Item City",
              state: item.location.state || "Item State",
              pincode: item.location.pincode || "Item Pincode",
              lat: item.location.lat || 20.5937,
              lng: item.location.lng || 78.9629
            };
            
            console.log("🏪 Setting pickup address from item location (real data):", newPickupAddress);
            setPickupAddress(newPickupAddress);
            console.log("✅ PICKUP address populated from item location (real data)");
          }
        } else {
          console.log("⚠️ No location found in item, using defaults");
          // Fallback: try to get seller info if no location in item
          if (item.sellerId) {
            let sellerResponse;
            if (item.sellerId._id) {
              sellerResponse = { data: item.sellerId };
            } else {
              sellerResponse = await apiCall(() => API.get(`/users/${item.sellerId}`));
            }
            
            if (sellerResponse.data && !sellerResponse.error) {
              const seller = sellerResponse.data;
              console.log("✅ Fallback: Using seller details:", seller);
              
              const newPickupAddress = {
                name: seller.name || "Seller Name",
                phone: seller.phone || "Seller Phone",
                address: seller.address || seller.addressLine || "Seller Address",
                city: seller.city || "Seller City",
                state: seller.state || "Seller State", 
                pincode: seller.pincode || "Seller Pincode",
                lat: seller.lat || 20.5937,
                lng: seller.lng || 78.9629
              };
              
              setPickupAddress(newPickupAddress);
              console.log("✅ PICKUP address populated from seller (fallback)");
            }
          }
        }
        
        // Try to get coordinates from seller address if available
        if (item.sellerId?.address || item.sellerId?.addressLine) {
          const sellerAddress = `${item.sellerId?.address || item.sellerId?.addressLine || ""}, ${item.sellerId?.city || ""}, ${item.sellerId?.state || ""} ${item.sellerId?.pincode || ""}`.trim();
          if (sellerAddress.length > 10) {
            console.log("🔍 Getting coordinates from seller address:", sellerAddress);
            const coordinates = await getCoordinatesFromAddress(sellerAddress);
            if (coordinates) {
              setPickupAddress(prev => ({
                ...prev,
                lat: coordinates.lat,
                lng: coordinates.lng
              }));
              console.log("✅ PICKUP coordinates updated from seller address");
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error fetching item details:", error);
    }
  };

  // Fetch item details when paymentDetails is set
  useEffect(() => {
    if (paymentDetails) {
      fetchItemDetails();
    }
  }, [paymentDetails]);

  const isAddressValid = () => {
    return (
      address.name &&
      address.phone &&
      address.address && // Updated from addressLine to address
      address.city &&
      address.state &&
      address.pincode &&
      address.lat !== undefined && // Check lat is provided
      address.lng !== undefined    // Check lng is provided
    );
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const placeOrderCOD = async () => {
    if (!validateForm()) {
      setError("Please fill all required fields correctly");
      return;
    }

    setLoading(true);
    setIsProcessing(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const buyerId = user?._id;

      if (!buyerId) {
        setError("Please login again");
        setLoading(false);
        return;
      }

      console.log("🛒 PLACING COD ORDER");
      console.log("🔍 User:", user);
      console.log("🔍 Buyer ID:", buyerId);
      console.log("🔍 Payment Details:", paymentDetails);
      console.log("🔍 Address:", address);
      console.log("🔍 From Cart:", fromCart);
      console.log("🔍 Amount:", amount);

      if (fromCart) {
        // Transform cart items to match backend expectations
        const transformedItems = paymentDetails.items.map(item => ({
          itemId: item._id,
          itemType: item.type,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }));
        
        console.log("🛒 Creating cart order with data:", {
          items: transformedItems,
          buyerId,
          paymentMethod: "COD",
          deliveryAddress: address
        });
        
        const result = await apiCall(() =>
          API.post("/orders/create-from-cart", {
            items: transformedItems,
            buyerId,
            paymentMethod: "COD",
            pickupAddress: pickupAddress,
            deliveryAddress: address
          })
        );
        
        console.log("📦 Cart order creation response:", result);
        
        if (result.error) {
          console.error("❌ Cart order creation failed:", result.error);
          setError(`Failed to create order: ${result.error}`);
          return;
        }
        clearCart();
      } else {
        const itemId = paymentDetails.cropId || paymentDetails.productId;
        console.log("🔍 Extracted itemId:", itemId);
        console.log("🔍 paymentDetails.cropId:", paymentDetails.cropId);
        console.log("🔍 paymentDetails.productId:", paymentDetails.productId);
        
        console.log("🛒 Creating single order with data:", {
          buyerId,
          itemId: itemId,
          itemType: paymentDetails.itemType,
          quantity: 1,
          price: amount,
          total: amount,
          status: "Confirmed",
          paymentMethod: "COD",
          pickupAddress: pickupAddress,
          deliveryAddress: address
        });
        
        await apiCall(() =>
          API.post("/orders/create", {
            buyerId,
            itemId: itemId,
            itemType: paymentDetails.itemType,
            quantity: 1,
            price: amount,
            total: amount,
            paymentMethod: "COD",
            pickupAddress: pickupAddress,
            deliveryAddress: address
          })
        );
      }
      
      console.log("✅ Order placed successfully!");
      alert("Order placed successfully 🚚");
      navigate("/orders");
    } catch (err) {
      console.error("❌ Order placement error:", err);
      setError("Failed to place order");
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }


  const payNow = async () => {
    if (paymentMethod === "COD") {
      return placeOrderCOD();
    }

    if (!validateForm()) {
      setError("Please fill all required fields correctly");
      return;
    }

    setLoading(true);
    setIsProcessing(true);
    setError("");

    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        setError("Failed to load Razorpay");
        setLoading(false);
        return;
      }

      const { data: orderData } = await apiCall(() =>
        API.post("/payment/create-order", { amount })
      );

      const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY;
      if (!razorpayKey) {
        setError("Razorpay key not configured");
        setLoading(false);
        return;
      }

      const user = JSON.parse(localStorage.getItem("user"));

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: "INR",
        order_id: orderData.id,
        name: "KisanSetu",
        handler: async function (response) {
          await apiCall(() =>
            API.post("/payment/verify", response)
          );

          if (fromCart) {
            // Transform cart items to match backend expectations
            const transformedItems = paymentDetails.items.map(item => ({
              itemId: item._id,
              itemType: item.type,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            }));
            
            const result = await apiCall(() =>
              API.post("/orders/create-from-cart", {
                items: transformedItems,
                buyerId: user._id,
                paymentMethod: "ONLINE",
                paymentId: response.razorpay_payment_id,
                pickupAddress: pickupAddress,
                deliveryAddress: address
              })
            );
            
            console.log("📦 Online cart order creation response:", result);
            
            if (result.error) {
              console.error("❌ Online cart order creation failed:", result.error);
              setError(`Failed to create order: ${result.error}`);
              return;
            }
            clearCart();
          } else {
            await apiCall(() =>
              API.post("/orders/create", {
                buyerId: user._id,
                itemId: paymentDetails.cropId || paymentDetails.productId,
                itemType: paymentDetails.itemType,
                quantity: 1,
                price: amount,
                total: amount,
                status: "Confirmed",
                paymentMethod: "ONLINE",
                paymentId: response.razorpay_payment_id,
                pickupAddress: pickupAddress,
                deliveryAddress: address
              })
            );
          }

          alert("Payment Successful ✅");
          navigate("/orders");
        },
        modal: {
          ondismiss: async function() {
            // Payment cancelled by user - switch to COD
            console.log("Payment cancelled, switching to COD");
            setLoading(true);
            setError("Payment cancelled. Switching to Cash on Delivery...");
            
            try {
              // Place order with COD
              if (fromCart) {
                // Transform cart items to match backend expectations
                const transformedItems = paymentDetails.items.map(item => ({
                  itemId: item._id,
                  itemType: item.type,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price
                }));
                
                await apiCall(() =>
                  API.post("/orders/create-from-cart", {
                    items: transformedItems,
                    buyerId: user._id,
                    paymentMethod: "COD",
                    pickupAddress: pickupAddress,
                    deliveryAddress: address
                  })
                );
                clearCart();
              } else {
                await apiCall(() =>
                  API.post("/orders/create", {
                    buyerId: user._id,
                    itemId: paymentDetails.cropId || paymentDetails.productId,
                    itemType: paymentDetails.itemType,
                    quantity: 1,
                    price: amount,
                    total: amount,
                    status: "Confirmed",
                    paymentMethod: "COD",
                    pickupAddress: pickupAddress,
                    deliveryAddress: address
                  })
                );
              }

              alert("Order placed successfully with Cash on Delivery 🚚");
              navigate("/orders");
            } catch (err) {
              setError("Failed to place COD order after payment cancellation");
            } finally {
              setLoading(false);
            }
          },
          escape: async function() {
            // Payment modal escaped - switch to COD
            console.log("Payment modal escaped, switching to COD");
            setLoading(true);
            setError("Payment cancelled. Switching to Cash on Delivery...");
            
            try {
              // Place order with COD
              if (fromCart) {
                // Transform cart items to match backend expectations
                const transformedItems = paymentDetails.items.map(item => ({
                  itemId: item._id,
                  itemType: item.type,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price
                }));
                
                await apiCall(() =>
                  API.post("/orders/create-from-cart", {
                    items: transformedItems,
                    buyerId: user._id,
                    paymentMethod: "COD",
                    pickupAddress: pickupAddress,
                    deliveryAddress: address
                  })
                );
                clearCart();
              } else {
                await apiCall(() =>
                  API.post("/orders/create", {
                    buyerId: user._id,
                    itemId: paymentDetails.cropId || paymentDetails.productId,
                    itemType: paymentDetails.itemType,
                    quantity: 1,
                    price: amount,
                    total: amount,
                    status: "Confirmed",
                    paymentMethod: "COD",
                    pickupAddress: pickupAddress,
                    deliveryAddress: address
                  })
                );
              }

              alert("Order placed successfully with Cash on Delivery 🚚");
              navigate("/orders");
            } catch (err) {
              setError("Failed to place COD order after payment cancellation");
            } finally {
              setLoading(false);
            }
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: { color: "#2e7d32" }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);
    } catch (err) {
      setError("Payment failed. Please try again.");
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-header">
      <div className="container">
        <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ 
              width: "64px", 
              height: "64px", 
              backgroundColor: "var(--primary-green-light)", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 16px" 
            }}>
              <span style={{ fontSize: "32px" }}>💳</span>
            </div>
            <h1 style={{ fontSize: "28px", marginBottom: "8px", color: "var(--text-primary)" }}>Secure Payment</h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>Complete your order securely</p>
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: "24px" }}>
              {error}
            </div>
          )}

          {/* Order Summary */}
          <div className="card" style={{ 
            backgroundColor: "var(--background)", 
            marginBottom: "24px", 
            padding: "20px" 
          }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>Order Summary</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "var(--text-secondary)", margin: "0 0 8px 0" }}>
                  {fromCart ? `${cart.length} items` : "1 item"}
                </p>
                <p style={{ fontSize: "14px", color: "var(--text-light)", margin: 0 }}>
                  {fromCart ? "Items from cart" : "Direct purchase"}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 4px 0" }}>Total Amount</p>
                <p style={{ 
                  fontSize: "32px", 
                  fontWeight: "bold", 
                  color: "var(--primary-green)", 
                  margin: 0 
                }}>
                  ₹ {amount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          {/* Pickup Address (From Seller) */}
          {/* <div style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>
              🏪 Pickup Address (Seller Location)
            </h3>
            
            <div style={{
              background: "var(--background)",
              borderRadius: "var(--border-radius-sm)",
              padding: "16px",
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "var(--text-primary)" }}>
                  {pickupAddress.name || "Loading seller information..."}
                </strong>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
                {pickupAddress.address && (
                  <div>{pickupAddress.address}</div>
                )}
                {pickupAddress.city && pickupAddress.state && (
                  <div>{pickupAddress.city}, {pickupAddress.state}</div>
                )}
                {pickupAddress.pincode && (
                  <div>{pickupAddress.pincode}</div>
                )}
                {pickupAddress.phone && (
                  <div style={{ marginTop: "8px", color: "var(--primary-blue)" }}>
                    📞 {pickupAddress.phone}
                  </div>
                )}
              </div>
              <div style={{ 
                fontSize: "11px", 
                color: "var(--text-secondary)", 
                marginTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>📍 Pickup Coordinates: {pickupAddress.lat.toFixed(6)}, {pickupAddress.lng.toFixed(6)}</span>
                <span style={{ color: "#4caf50" }}>
                  ✅ From Product Database
                </span>
              </div>
            </div>
          </div> */}

          {/* Pickup Address (From Seller) */}
          {/* <div style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>
              🏪 Pickup Address (Seller Location)
            </h3>
            
            <div style={{
              background: "var(--background)",
              borderRadius: "var(--border-radius-sm)",
              padding: "16px",
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "var(--text-primary)" }}>
                  {pickupAddress.name || "Loading seller information..."}
                </strong>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
                {pickupAddress.address && (
                  <div>{pickupAddress.address}</div>
                )}
                {pickupAddress.city && pickupAddress.state && (
                  <div>{pickupAddress.city}, {pickupAddress.state}</div>
                )}
                {pickupAddress.pincode && (
                  <div>{pickupAddress.pincode}</div>
                )}
                {pickupAddress.phone && (
                  <div style={{ marginTop: "8px", color: "var(--primary-blue)" }}>
                    📞 {pickupAddress.phone}
                  </div>
                )}
              </div>
              <div style={{ 
                fontSize: "11px", 
                color: "var(--text-secondary)", 
                marginTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>📍 Pickup Coordinates: {pickupAddress.lat.toFixed(6)}, {pickupAddress.lng.toFixed(6)}</span>
                <span style={{ color: "#4caf50" }}>
                  ✅ From Product Database
                </span>
              </div>
            </div>
          </div> */}

          {/* Delivery Address */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>
              📍 Delivery Address
            </h3>
            
            {/* Location Map */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                flexWrap: "wrap",
                gap: "8px"
              }}>
                <label style={{
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "14px"
                }}>
                  🗺️ Delivery Location on Map
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setUseCurrentLocation(!useCurrentLocation)}
                    disabled={isProcessing}
                    style={{
                      padding: "6px 12px",
                      background: useCurrentLocation ? "var(--success)" : "var(--primary-blue)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--border-radius-sm)",
                      cursor: isProcessing ? "not-allowed" : "pointer",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {useCurrentLocation ? "📍 Using Live Location" : "👤 Use My Location"}
                  </button>
                  {!useCurrentLocation && (
                    <button
                      type="button"
                      onClick={tryGetCoordinatesFromAddress}
                      disabled={isProcessing}
                      style={{
                        padding: "8px 16px",
                        background: "#ff9800",
                        color: "white",
                        border: "none",
                        borderRadius: "var(--border-radius-sm)",
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}
                    >
                      📍 Get Coordinates from Address
                    </button>
                  )}
                </div>
              </div>
              
              {/* Map Container */}
              <div style={{
                height: "250px",
                borderRadius: "var(--border-radius-sm)",
                overflow: "hidden",
                border: "1px solid var(--border-color)",
                marginBottom: "12px"
              }}>
                <LiveMap
                  location={address}
                  destination={null}
                  useLiveLocation={useCurrentLocation}
                  onLocationUpdate={handleLocationUpdate}
                />
              </div>
              
              {/* Coordinates Display */}
              <div style={{ 
                fontSize: "12px", 
                color: "var(--text-secondary)", 
                textAlign: "center",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                flexDirection: "column"
              }}>
                <div>
                  📍 Coordinates: {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                </div>
                <div style={{ fontSize: "10px", color: "#666" }}>
                  Source: {useCurrentLocation ? "📍 Live GPS" : "🏠 Address Lookup"}
                </div>
                {!useCurrentLocation && (address.lat === 20.5937 && address.lng === 78.9629) && (
                  <span style={{ color: "#ff9800", fontSize: "11px" }}>
                    ⚠️ Default India Center - Fill address to get accurate coordinates
                  </span>
                )}
                {!useCurrentLocation && (address.lat !== 20.5937 || address.lng !== 78.9629) && (
                  <span style={{ color: "#4caf50", fontSize: "11px" }}>
                    ✅ Address-based coordinates loaded
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={address.name}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.name ? "error" : ""}`}
                  placeholder="Enter your full name"
                  disabled={isProcessing}
                />
                {formErrors.name && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.name}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={address.phone}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.phone ? "error" : ""}`}
                  placeholder="10-digit mobile number"
                  disabled={isProcessing}
                />
                {formErrors.phone && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.phone}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Pincode *
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={address.pincode}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.pincode ? "error" : ""}`}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  disabled={isProcessing}
                />
                {formErrors.pincode && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.pincode}
                  </p>
                )}
              </div>
              
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={address.address}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.address ? "error" : ""}`}
                  placeholder="House number, street name, area"
                  disabled={isProcessing}
                />
                {formErrors.address && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.address}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={address.city}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.city ? "error" : ""}`}
                  placeholder="Enter your city"
                  disabled={isProcessing}
                />
                {formErrors.city && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.city}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={address.state}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.state ? "error" : ""}`}
                  placeholder="Enter your state"
                  disabled={isProcessing}
                />
                {formErrors.state && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.state}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>
              💳 Payment Method
            </h3>
            
            <div className="card" style={{ 
              backgroundColor: "var(--background)", 
              marginBottom: "16px", 
              padding: "16px" 
            }}>
              <p style={{ 
                fontSize: "14px", 
                color: "var(--text-secondary)", 
                margin: 0, 
                display: "flex", 
                alignItems: "center", 
                gap: "8px" 
              }}>
                <span>💡</span>
                <span><strong>Smart Payment:</strong> If you cancel online payment, your order will automatically be placed with Cash on Delivery.</span>
              </p>
            </div>
            
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label 
                className={`card ${paymentMethod === "ONLINE" ? "selected" : ""}`}
                style={{ 
                  cursor: "pointer", 
                  padding: "20px", 
                  textAlign: "center", 
                  border: paymentMethod === "ONLINE" ? "2px solid var(--primary-green)" : "2px solid var(--border)",
                  backgroundColor: paymentMethod === "ONLINE" ? "var(--surface)" : "var(--background)",
                  transition: "all 0.3s ease",
                  position: "relative"
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ONLINE"
                  checked={paymentMethod === "ONLINE"}
                  onChange={() => setPaymentMethod("ONLINE")}
                  disabled={isProcessing}
                  style={{ position: "absolute", opacity: 0 }}
                />
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>💳</div>
                <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>Online Payment</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Secure & Instant
                </div>
                {paymentMethod === "ONLINE" && (
                  <div style={{ 
                    position: "absolute", 
                    top: "8px", 
                    right: "8px", 
                    color: "var(--primary-green)",
                    fontSize: "20px"
                  }}>
                    ✓
                  </div>
                )}
              </label>
              
              <label 
                className={`card ${paymentMethod === "COD" ? "selected" : ""}`}
                style={{ 
                  cursor: "pointer", 
                  padding: "20px", 
                  textAlign: "center", 
                  border: paymentMethod === "COD" ? "2px solid var(--primary-green)" : "2px solid var(--border)",
                  backgroundColor: paymentMethod === "COD" ? "var(--surface)" : "var(--background)",
                  transition: "all 0.3s ease",
                  position: "relative"
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                  disabled={isProcessing}
                  style={{ position: "absolute", opacity: 0 }}
                />
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🚚</div>
                <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>Cash on Delivery</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Pay when you receive
                </div>
                {paymentMethod === "COD" && (
                  <div style={{ 
                    position: "absolute", 
                    top: "8px", 
                    right: "8px", 
                    color: "var(--primary-green)",
                    fontSize: "20px"
                  }}>
                    ✓
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={payNow}
            disabled={loading || isProcessing}
            className="btn btn-primary"
            style={{ 
              width: "100%", 
              padding: "16px", 
              fontSize: "18px", 
              fontWeight: "600",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {loading || isProcessing ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                <div className="loading-spinner" style={{ 
                  width: "20px", 
                  height: "20px", 
                  margin: 0, 
                  borderWidth: "3px" 
                }}></div>
                {paymentMethod === "COD" ? "Placing Order..." : "Processing Payment..."}
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {paymentMethod === "COD" ? (
                  <>
                    <span>🚚</span>
                    <span>Place Order - Cash on Delivery</span>
                  </>
                ) : (
                  <>
                    <span>💳</span>
                    <span>Pay Now - ₹ {amount.toLocaleString("en-IN")}</span>
                  </>
                )}
              </span>
            )}
          </button>

          {/* Security Badge */}
          <div style={{ 
            textAlign: "center", 
            marginTop: "24px", 
            padding: "16px", 
            backgroundColor: "var(--background)",
            borderRadius: "var(--border-radius-sm)"
          }}>
            <p style={{ 
              fontSize: "12px", 
              color: "var(--text-secondary)", 
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}>
              <span>🔒</span>
              <span>Secured by Razorpay • 256-bit SSL encryption</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

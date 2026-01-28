import { useState, useEffect } from "react";
import API, { apiCall } from "../api/api";

export default function DeliveryAssignment() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, partnersRes] = await Promise.all([
        apiCall(() => API.get("/delivery/pending-orders")),
        apiCall(() => API.get("/delivery/available-partners"))
      ]);

      if (ordersRes.data) {
        setPendingOrders(ordersRes.data.orders);
      }
      if (partnersRes.data) {
        setAvailablePartners(partnersRes.data.partners);
      }
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const assignDelivery = async (orderId, partnerId = null) => {
    try {
      setError("");
      setSuccess("");

      const payload = partnerId ? { manualPartnerId: partnerId } : {};
      
      const { data, error } = await apiCall(() =>
        API.post(`/delivery/assign/${orderId}`, payload)
      );

      if (error) {
        setError(error);
      } else {
        setSuccess(`Delivery assigned successfully!`);
        setSelectedOrder(null);
        setSelectedPartner("");
        fetchData(); // Refresh data
      }
    } catch (err) {
      setError("Failed to assign delivery");
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div style={{ textAlign: "center" }}>
          <p>Loading delivery assignment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header" style={{ marginBottom: "32px" }}>
        <h1>🚚 Delivery Assignment</h1>
        <p>Manage delivery assignments to available partners</p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: "16px" }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: "16px" }}>{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* Pending Orders */}
        <div className="card">
          <h3 style={{ marginBottom: "16px" }}>📦 Pending Orders ({pendingOrders.length})</h3>
          
          {pendingOrders.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px" }}>
              No pending orders
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pendingOrders.map((order) => (
                <div key={order._id} style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "16px",
                  background: selectedOrder === order._id ? "var(--background-alt)" : "var(--background)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ margin: "0 0 8px 0" }}>Order #{order._id.slice(-8).toUpperCase()}</h4>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                        <strong>Buyer:</strong> {order.buyerId?.name}
                      </p>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                        <strong>Total:</strong> ₹{order.total}
                      </p>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                        <strong>Status:</strong> {order.status}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <button
                        onClick={() => {
                          setSelectedOrder(order._id);
                          setSelectedPartner("");
                        }}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        Select
                      </button>
                      <button
                        onClick={() => assignDelivery(order._id)}
                        className="btn btn-secondary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        Auto Assign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Partners */}
        <div className="card">
          <h3 style={{ marginBottom: "16px" }}>👥 Available Partners ({availablePartners.length})</h3>
          
          {availablePartners.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px" }}>
              No available partners
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {availablePartners.map((partner) => (
                <div key={partner._id} style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "16px",
                  background: selectedPartner === partner._id ? "var(--background-alt)" : "var(--background)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ margin: "0 0 8px 0" }}>{partner.name}</h4>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                        <strong>Phone:</strong> {partner.phone}
                      </p>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                        <strong>Email:</strong> {partner.email}
                      </p>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                        <strong>Status:</strong> 🟢 Online
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPartner(partner._id);
                        if (selectedOrder) {
                          assignDelivery(selectedOrder, partner._id);
                        }
                      }}
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      disabled={!selectedOrder}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Status */}
      {selectedOrder && (
        <div className="card" style={{ marginTop: "32px" }}>
          <h3 style={{ marginBottom: "16px" }}>🎯 Assignment Status</h3>
          <p>
            <strong>Selected Order:</strong> #{selectedOrder.slice(-8).toUpperCase()}
          </p>
          <p>
            <strong>Selected Partner:</strong> {selectedPartner ? "Partner selected" : "No partner selected"}
          </p>
          <div style={{ marginTop: "16px" }}>
            <button
              onClick={() => {
                setSelectedOrder(null);
                setSelectedPartner("");
              }}
              className="btn btn-outline"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card" style={{ marginTop: "32px" }}>
        <h3 style={{ marginBottom: "16px" }}>📋 How to Assign Deliveries</h3>
        <ol style={{ lineHeight: "1.6" }}>
          <li><strong>Auto Assign:</strong> Click "Auto Assign" on any order to automatically assign it to the first available partner</li>
          <li><strong>Manual Assign:</strong> Select an order, then select a partner, then click "Assign" on the partner</li>
          <li><strong>Partner Status:</strong> Only online and available partners are shown</li>
          <li><strong>Real-time:</strong> Data refreshes automatically after each assignment</li>
        </ol>
      </div>
    </div>
  );
}

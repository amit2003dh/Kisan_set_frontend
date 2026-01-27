// Helper functions for payment status
const getPaymentStatus = (order) => {
  const paymentMethod = order.paymentMethod || "COD";
  return paymentMethod === "ONLINE" ? "✅ Done" : "⏳ Pending";
};

const getPaymentStatusColor = (order) => {
  const paymentMethod = order.paymentMethod || "COD";
  return paymentMethod === "ONLINE" ? "var(--success)" : "var(--warning)";
};

const getPaymentMethodDisplay = (order) => {
  const paymentMethod = order.paymentMethod || "COD";
  return paymentMethod === "ONLINE" ? "✅ Online" : "⏳ COD";
};

// Payment status JSX blocks to add to Orders.js
const paymentStatusBlocks = `
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment:</span>
                          <strong style={{ 
                            color: order.paymentMethod === "ONLINE" ? "var(--success)" : "var(--warning)" 
                          }}>
                            {order.paymentMethod === "ONLINE" ? "✅ Online" : "⏳ COD"}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment Status:</span>
                          <strong style={{ 
                            color: order.paymentMethod === "ONLINE" ? "var(--success)" : "var(--warning)" 
                          }}>
                            {order.paymentMethod === "ONLINE" ? "✅ Done" : "⏳ Pending"}
                          </strong>
                        </div>
`;

module.exports = { getPaymentStatus, getPaymentStatusColor, getPaymentMethodDisplay, paymentStatusBlocks };

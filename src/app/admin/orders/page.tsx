"use client";

import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (res.ok) setOrders(data.orders);
      else setError(data.error);
    } catch (err) {
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAction = async (orderId: string, action: "VERIFY" | "REJECT") => {
    if (!confirm(`Are you sure you want to ${action} this payment?`)) return;
    
    try {
      const res = await fetch("/api/admin/orders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      
      if (res.ok) {
        fetchOrders(); // Refresh table
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch (err) {
      alert("An unexpected error occurred");
    }
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div style={{ color: "var(--error)" }}>{error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: "2rem" }}>Orders Management</h1>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
          <thead style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(0,0,0,0.02)" }}>
            <tr>
              <th style={{ padding: "1rem" }}>Order ID</th>
              <th style={{ padding: "1rem" }}>Product</th>
              <th style={{ padding: "1rem" }}>Amount</th>
              <th style={{ padding: "1rem" }}>Customer</th>
              <th style={{ padding: "1rem" }}>Payment Status</th>
              <th style={{ padding: "1rem" }}>Order Status</th>
              <th style={{ padding: "1rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>No orders found.</td>
              </tr>
            ) : (
              orders.map((order: any) => (
                <tr key={order._id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "1rem", fontWeight: 500, fontFamily: "monospace" }}>{order.orderNumber}</td>
                  <td style={{ padding: "1rem" }}>{order.product?.productCode || "Unknown"}</td>
                  <td style={{ padding: "1rem" }}>₹{order.amount}</td>
                  <td style={{ padding: "1rem" }}>{order.customer?.name} <br/><span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{order.customer?.mobile}</span></td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "0.25rem", 
                      fontSize: "0.75rem", 
                      fontWeight: 600,
                      backgroundColor: order.paymentStatus === "PENDING" ? "rgba(234, 179, 8, 0.1)" : order.paymentStatus === "VERIFIED" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      color: order.paymentStatus === "PENDING" ? "#ca8a04" : order.paymentStatus === "VERIFIED" ? "var(--success)" : "var(--error)"
                    }}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>{order.orderStatus}</td>
                  <td style={{ padding: "1rem" }}>
                    {order.paymentStatus === "PENDING" && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => window.open(`/api/admin/orders/screenshot?orderId=${order._id}`, '_blank')} style={{ padding: "0.25rem 0.5rem", border: "1px solid var(--border)", backgroundColor: "transparent", borderRadius: "0.25rem", cursor: "pointer", fontSize: "0.75rem" }}>
                          View Image
                        </button>
                        <button onClick={() => handleAction(order._id, "VERIFY")} style={{ padding: "0.25rem 0.5rem", border: "none", backgroundColor: "var(--success)", color: "white", borderRadius: "0.25rem", cursor: "pointer", fontSize: "0.75rem" }}>
                          Verify
                        </button>
                        <button onClick={() => handleAction(order._id, "REJECT")} style={{ padding: "0.25rem 0.5rem", border: "none", backgroundColor: "var(--error)", color: "white", borderRadius: "0.25rem", cursor: "pointer", fontSize: "0.75rem" }}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    soldOutProducts: 0,
    totalOrders: 0,
    pendingPayments: 0,
    confirmedOrders: 0,
    totalSales: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: "2rem" }}>Dashboard</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        
        {/* PRODUCTS ROW */}
        <div style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", opacity: 0.8 }}>Total Products</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: "var(--foreground)" }}>
            {stats.totalProducts}
          </p>
        </div>

        <div style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", opacity: 0.8 }}>Available Products</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: "var(--success)" }}>
            {stats.availableProducts}
          </p>
        </div>

        <div style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", opacity: 0.8 }}>Sold Out Products</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: "var(--error)" }}>
            {stats.soldOutProducts}
          </p>
        </div>

        {/* ORDERS ROW */}
        <div style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", opacity: 0.8 }}>Total Orders</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: "var(--foreground)" }}>
            {stats.totalOrders}
          </p>
        </div>

        <div style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", opacity: 0.8 }}>Pending Payments</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: "var(--warning)" }}>
            {stats.pendingPayments}
          </p>
          {stats.pendingPayments > 0 && (
            <Link href="/admin/orders" style={{ display: "inline-block", marginTop: "1rem", color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              Verify Now &rarr;
            </Link>
          )}
        </div>

        <div style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", opacity: 0.8 }}>Confirmed Orders</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: "var(--success)" }}>
            {stats.confirmedOrders}
          </p>
        </div>
        
        {/* SALES */}
        <div style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem", gridColumn: "1 / -1" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", opacity: 0.8 }}>Total Sales (Verified)</h3>
          <p style={{ fontSize: "2.5rem", fontWeight: "bold", margin: 0, color: "var(--primary)" }}>
            ₹{stats.totalSales}
          </p>
        </div>

      </div>
    </div>
  );
}

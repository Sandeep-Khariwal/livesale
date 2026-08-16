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
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="oms-dash">
      <div className="dash-header">
        <h1 className="dash-title">Dashboard</h1>
        <span className="live-dot-wrap">
          <span className="live-dot" />
          Live
        </span>
      </div>
      <div className="title-rule" />

      {/* INVENTORY */}
      <div className="section">
        <div className="section-eyebrow">
          <span>Inventory</span>
          <span className="line" />
        </div>
        <div className="grid">
          <div className="card" style={{ ["--accent" as any]: "#d4af5a" }}>
            <p className="card-label">Total Products</p>
            <p className="card-value">{stats.totalProducts}</p>
          </div>
          <div className="card" style={{ ["--accent" as any]: "#4fae7a" }}>
            <p className="card-label">Available Products</p>
            <p className="card-value" style={{ ["--value-color" as any]: "#4fae7a" }}>
              {stats.availableProducts}
            </p>
          </div>
          <div className="card" style={{ ["--accent" as any]: "#e0654f" }}>
            <p className="card-label">Sold Out Products</p>
            <p className="card-value" style={{ ["--value-color" as any]: "#e0654f" }}>
              {stats.soldOutProducts}
            </p>
          </div>
        </div>
      </div>

      {/* ORDERS & PAYMENTS */}
      <div className="section">
        <div className="section-eyebrow">
          <span>Orders &amp; Payments</span>
          <span className="line" />
        </div>
        <div className="grid">
          <div className="card" style={{ ["--accent" as any]: "#d4af5a" }}>
            <p className="card-label">Total Orders</p>
            <p className="card-value">{stats.totalOrders}</p>
          </div>
          <div className="card" style={{ ["--accent" as any]: "#e8a33d" }}>
            <p className="card-label">Pending Payments</p>
            <p className="card-value" style={{ ["--value-color" as any]: "#e8a33d" }}>
              {stats.pendingPayments}
            </p>
            {stats.pendingPayments > 0 && (
              <Link href="/admin/orders" className="card-link">
                Verify now →
              </Link>
            )}
          </div>
          <div className="card" style={{ ["--accent" as any]: "#4fae7a" }}>
            <p className="card-label">Confirmed Orders</p>
            <p className="card-value" style={{ ["--value-color" as any]: "#4fae7a" }}>
              {stats.confirmedOrders}
            </p>
          </div>
        </div>
      </div>

      {/* REVENUE */}
      <div className="section">
        <div className="section-eyebrow">
          <span>Revenue</span>
          <span className="line" />
        </div>
        <div className="hero-card">
          <div className="hero-inner">
            <p className="hero-label">Total Sales (Verified)</p>
            <p className="hero-value">₹{stats.totalSales.toLocaleString("en-IN")}</p>
            <p className="hero-sub">Across all payment-verified orders</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .oms-dash {
          --ink: #150b0e;
          --surface: #211217;
          --hairline: rgba(212, 175, 90, 0.18);
          --gold: #d4af5a;
          --gold-bright: #f3d68f;
          --cream: #f6ecd9;
          --muted: #a8927b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: var(--cream);
          padding: 1.5rem 1.5rem 3rem;
          background: var(--ink);
          min-height: 100vh;
        }

        .dash-header {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          margin-bottom: 0.6rem;
        }

        .dash-title {
          font-weight: 700;
          font-size: 2rem;
          letter-spacing: -0.01em;
          margin: 0;
          color: var(--cream);
        }

        .live-dot-wrap {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 600;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4fae7a;
          box-shadow: 0 0 0 0 rgba(79, 174, 122, 0.6);
          animation: pulse 2.4s ease-out infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(79, 174, 122, 0.55);
          }
          70% {
            box-shadow: 0 0 0 7px rgba(79, 174, 122, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(79, 174, 122, 0);
          }
        }

        .title-rule {
          width: 100%;
          height: 1px;
          margin: 0.9rem 0 2.1rem;
          background: linear-gradient(
            90deg,
            var(--gold) 0%,
            rgba(212, 175, 90, 0.35) 18%,
            var(--hairline) 40%,
            transparent 75%
          );
        }

        .section {
          margin-bottom: 2.1rem;
        }

        .section-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .section-eyebrow span:first-child {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--gold-bright);
          white-space: nowrap;
        }

        .section-eyebrow .line {
          flex: 1;
          height: 1px;
          background: var(--hairline);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 1.1rem;
        }

        .card {
          position: relative;
          padding: 1.5rem 1.5rem 1.6rem;
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: 0.85rem;
          overflow: hidden;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .card:hover {
          border-color: rgba(212, 175, 90, 0.4);
          transform: translateY(-1px);
        }

        .card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent, var(--gold));
        }

        .card-label {
          margin: 0 0 0.65rem 0;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .card-value {
          font-weight: 700;
          font-size: 2.15rem;
          line-height: 1;
          margin: 0;
          color: var(--value-color, var(--cream));
        }

        .card-link {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          margin-top: 0.9rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--gold-bright);
          text-decoration: none;
          border-bottom: 1px solid rgba(243, 214, 143, 0.35);
          padding-bottom: 1px;
          transition: border-color 0.2s ease;
        }
        .card-link:hover {
          border-color: var(--gold-bright);
        }

        .hero-card {
          position: relative;
          padding: 1.9rem 2rem 2.1rem;
          background: linear-gradient(135deg, #2a161c 0%, #241016 55%, #2a161c 100%);
          border: 1px solid rgba(212, 175, 90, 0.3);
          border-radius: 1rem;
          overflow: hidden;
        }

        .hero-inner {
          position: relative;
        }

        .hero-label {
          margin: 0 0 0.5rem 0;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .hero-value {
          font-weight: 700;
          font-size: 3rem;
          line-height: 1;
          margin: 0;
          background: linear-gradient(90deg, var(--gold-bright), var(--gold) 65%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-sub {
          margin: 0.6rem 0 0;
          font-size: 0.85rem;
          color: var(--muted);
        }

        @media (max-width: 480px) {
          .dash-title {
            font-size: 1.6rem;
          }
          .hero-value {
            font-size: 2.2rem;
          }
        }
      `}</style>
    </div>
  );
}
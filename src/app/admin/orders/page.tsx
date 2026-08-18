"use client";

import { useEffect, useMemo, useState } from "react";
import { Cormorant_Garamond, Jost } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-cormorant",
});
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jost",
});

type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [filter, setFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [query, setQuery] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (res.ok) setOrders(data.orders);
      else setError(data.error);
    } catch {
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAction = async (orderId: string, action: "VERIFY" | "REJECT") => {
    if (!confirm(`${action === "VERIFY" ? "Verify" : "Reject"} this payment? This cannot be undone.`)) return;

    setActioningId(orderId);
    try {
      const res = await fetch("/api/admin/orders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });

      if (res.ok) {
        await fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch {
      alert("An unexpected error occurred");
    } finally {
      setActioningId(null);
    }
  };

  const handleExport = () => {
    const params = filter !== "ALL" ? `?status=${filter}` : "";
    window.open(`/api/admin/orders/export${params}`, "_blank");
  };

  const counts = useMemo(() => {
    const c = { PENDING: 0, VERIFIED: 0, REJECTED: 0, revenue: 0 };
    for (const o of orders as any[]) {
      if (o.paymentStatus === "PENDING") c.PENDING++;
      if (o.paymentStatus === "VERIFIED") {
        c.VERIFIED++;
        c.revenue += Number(o.amount) || 0;
      }
      if (o.paymentStatus === "REJECTED") c.REJECTED++;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders as any[];
    if (filter !== "ALL") list = list.filter((o) => o.paymentStatus === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o.customer?.mobile?.includes(q) ||
          o.product?.productCode?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filter, query]);

  const initials = (name?: string) =>
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  if (loading) {
    return (
      <div className={`${cormorant.variable} ${jost.variable} ord`}>
        <div className="skeleton-wrap">
          <div className="skeleton-bar" style={{ width: "220px", height: "28px" }} />
          <div className="skeleton-stats">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-bar" style={{ height: "72px" }} />
            ))}
          </div>
          <div className="skeleton-bar" style={{ height: "320px" }} />
        </div>
        <style jsx>{baseStyles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${cormorant.variable} ${jost.variable} ord`}>
        <div className="err-state">
          <p className="err-title">Couldn't load orders</p>
          <p className="err-body">{error}</p>
          <button className="btn btn-ghost" onClick={fetchOrders}>
            Retry
          </button>
        </div>
        <style jsx>{baseStyles}</style>
      </div>
    );
  }

  return (
    <div className={`${cormorant.variable} ${jost.variable} ord`}>
      <div className="ord-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 className="ord-title">Orders</h1>
        </div>
        <button className="btn btn-ghost" onClick={fetchOrders}>
          ↻ Refresh
        </button>
      </div>

      {/* Stat strip */}
      <div className="stats">
        <button
          className={`stat-card ${filter === "PENDING" ? "stat-active" : ""}`}
          onClick={() => setFilter(filter === "PENDING" ? "ALL" : "PENDING")}
        >
          <span className="stat-dot dot-pending" />
          <div>
            <p className="stat-num">{counts.PENDING}</p>
            <p className="stat-label">Awaiting review</p>
          </div>
        </button>
        <button
          className={`stat-card ${filter === "VERIFIED" ? "stat-active" : ""}`}
          onClick={() => setFilter(filter === "VERIFIED" ? "ALL" : "VERIFIED")}
        >
          <span className="stat-dot dot-ok" />
          <div>
            <p className="stat-num">{counts.VERIFIED}</p>
            <p className="stat-label">Verified</p>
          </div>
        </button>
        <button
          className={`stat-card ${filter === "REJECTED" ? "stat-active" : ""}`}
          onClick={() => setFilter(filter === "REJECTED" ? "ALL" : "REJECTED")}
        >
          <span className="stat-dot dot-bad" />
          <div>
            <p className="stat-num">{counts.REJECTED}</p>
            <p className="stat-label">Rejected</p>
          </div>
        </button>
        <div className="stat-card stat-revenue">
          <div>
            <p className="stat-num">₹{counts.revenue.toLocaleString("en-IN")}</p>
            <p className="stat-label">Verified revenue</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search by order no., name, mobile, or product code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filter !== "ALL" && (
          <button className="chip" onClick={() => setFilter("ALL")}>
            {filter} <span className="chip-x">✕</span>
          </button>
        )}
        <button className="btn btn-ghost" onClick={handleExport}>
          ⬇ Download Excel{filter !== "ALL" ? ` (${filter})` : ""}
        </button>
      </div>

      <div className="table-wrap">
        <table className="ord-table">
          <colgroup>
            <col style={{ width: "13%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Order</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="docs-cell">Docs</th>
              <th className="actions-cell">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row">
                  {orders.length === 0 ? "No orders yet." : "No orders match your search."}
                </td>
              </tr>
            ) : (
              filtered.map((order: any) => {
                const fullAddress = order.customer?.address
                  ? `${order.customer.address}${order.customer.landmark ? " (Near " + order.customer.landmark + ")" : ""}${order.customer.city ? ", " + order.customer.city : ""}${
                      order.customer.pincode ? " – " + order.customer.pincode : ""
                    }`
                  : "—";

                return (
                  <tr key={order._id} className={order.paymentStatus === "PENDING" ? "row-pending" : ""}>
                    <td className="mono-cell" title={order.orderNumber}>
                      {order.orderNumber}
                    </td>
                    <td className="code-cell">{order.product?.productCode || "Unknown"}</td>
                    <td className="amount-cell">₹{Number(order.amount).toLocaleString("en-IN")}</td>
                    <td>
                      <button
                        className="customer-chip"
                        title="Click to view full customer details"
                        onClick={() => setSelectedCustomer(order.customer)}
                      >
                        <span className="avatar">{initials(order.customer?.name)}</span>
                        <span className="customer-text">
                          <span className="customer-name">{order.customer?.name || "Unnamed"}</span>
                          <span className="customer-mobile">{order.customer?.mobile}</span>
                          <span className="customer-hint">View details ›</span>
                        </span>
                      </button>
                    </td>
                    <td className="address-cell" title={fullAddress}>
                      {fullAddress}
                    </td>
                    <td>
                      <span className={`status-badge status-${order.paymentStatus?.toLowerCase()}`}>
                        <span className="status-dot" />
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="muted-cell">{order.orderStatus}</td>

                    {/* Documents: compact icon-only buttons, side by side, sticky */}
                    <td className="docs-cell">
                      <div className="doc-btns">
                        <button
                          className="btn-icon"
                          title="Customer's payment screenshot"
                          onClick={() => window.open(`/api/admin/orders/screenshot?orderId=${order._id}`, "_blank")}
                        >
                          <span className="btn-icon-glyph">🧾</span>
                          <span className="btn-icon-label">Proof</span>
                        </button>
                        <button
                          className="btn-icon"
                          title="Customer's uploaded photo — used as a color reference for the order"
                          onClick={() => window.open(`/api/admin/orders/reference-photo?orderId=${order._id}`, "_blank")}
                        >
                          <span className="btn-icon-glyph">🎨</span>
                          <span className="btn-icon-label">Ref</span>
                        </button>
                      </div>
                    </td>

                    {/* Actions: only Verify / Reject, only when pending, sticky */}
                    <td className="actions-cell">
                      {order.paymentStatus === "PENDING" ? (
                        <div className="action-btns">
                          <button
                            className="btn btn-verify"
                            disabled={actioningId === order._id}
                            onClick={() => handleAction(order._id, "VERIFY")}
                          >
                            {actioningId === order._id ? <span className="btn-spinner" /> : "Verify"}
                          </button>
                          <button
                            className="btn btn-reject"
                            disabled={actioningId === order._id}
                            onClick={() => handleAction(order._id, "REJECT")}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`no-action no-action-${order.paymentStatus?.toLowerCase()}`}>
                          {order.paymentStatus === "VERIFIED" ? "✓ Verified" : order.paymentStatus === "REJECTED" ? "✕ Rejected" : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="avatar avatar-lg">{initials(selectedCustomer.name)}</span>
              <div>
                <h3>{selectedCustomer.name}</h3>
                <p className="modal-sub">{selectedCustomer.mobile}</p>
              </div>
            </div>
            <dl className="modal-list">
              {selectedCustomer.whatsapp && (
                <>
                  <dt>WhatsApp</dt>
                  <dd>{selectedCustomer.whatsapp}</dd>
                </>
              )}
              <dt>Address</dt>
              <dd>{selectedCustomer.address || "N/A"}</dd>
              {selectedCustomer.landmark && (
                <>
                  <dt>Landmark</dt>
                  <dd>{selectedCustomer.landmark}</dd>
                </>
              )}
              {selectedCustomer.city && (
                <>
                  <dt>City</dt>
                  <dd>{selectedCustomer.city}</dd>
                </>
              )}
              {selectedCustomer.state && (
                <>
                  <dt>State</dt>
                  <dd>{selectedCustomer.state}</dd>
                </>
              )}
              {selectedCustomer.pincode && (
                <>
                  <dt>Pincode</dt>
                  <dd>{selectedCustomer.pincode}</dd>
                </>
              )}
            </dl>
            <button className="btn btn-ghost modal-close" onClick={() => setSelectedCustomer(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{baseStyles}</style>
    </div>
  );
}

const baseStyles = `
  .ord {
    --ink: #0a0304;
    --surface: #150609;
    --surface-alt: #1c0a0f;
    --hairline: rgba(212, 175, 90, 0.16);
    --gold: #d4af5a;
    --gold-bright: #f3d68f;
    --cream: #f6ecd9;
    --muted: #a8927b;
    --success: #6fcf97;
    --pending: #e8a33d;
    --danger: #ff6b6b;
    font-family: var(--font-jost), -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--cream);
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }

  .eyebrow {
    margin: 0 0 0.2rem;
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }

  .ord-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 1.75rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .ord-title {
    margin: 0;
    font-family: var(--font-cormorant), serif;
    font-size: 2rem;
    font-weight: 600;
    color: var(--cream);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 1rem 1.1rem;
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: 0.65rem;
    text-align: left;
    cursor: pointer;
    color: inherit;
    font-family: inherit;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .stat-card:hover {
    border-color: rgba(212, 175, 90, 0.4);
  }
  .stat-active {
    border-color: var(--gold);
    background: var(--surface-alt);
  }
  .stat-revenue {
    cursor: default;
  }
  .stat-revenue:hover {
    border-color: var(--hairline);
  }

  .stat-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot-pending { background: var(--pending); box-shadow: 0 0 8px 1px rgba(232, 163, 61, 0.5); }
  .dot-ok { background: var(--success); box-shadow: 0 0 8px 1px rgba(111, 207, 151, 0.5); }
  .dot-bad { background: var(--danger); box-shadow: 0 0 8px 1px rgba(255, 107, 107, 0.5); }

  .stat-num {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--gold-bright);
    line-height: 1.2;
  }
  .stat-label {
    margin: 0;
    font-size: 0.72rem;
    color: var(--muted);
    letter-spacing: 0.02em;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .search {
    flex: 1;
    min-width: 240px;
    padding: 0.7rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--hairline);
    background: var(--surface);
    color: var(--cream);
    font-family: inherit;
    font-size: 0.88rem;
    outline: none;
  }
  .search:focus {
    border-color: var(--gold);
  }
  .search::placeholder {
    color: var(--muted);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.8rem;
    border-radius: 999px;
    border: 1px solid var(--gold);
    background: rgba(212, 175, 90, 0.1);
    color: var(--gold-bright);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    cursor: pointer;
    font-family: inherit;
  }
  .chip-x {
    opacity: 0.7;
  }

  /* Table fits the container on comfortable widths; below its min-width
     (mobile) it scrolls horizontally instead of squishing columns into
     each other, which is what was causing the Proof/Ref overlap. */
  .table-wrap {
    overflow-x: auto;
    overflow-y: visible;
    border-radius: 0.85rem;
    border: 1px solid var(--hairline);
    width: 100%;
  }

  .ord-table {
    width: 100%;
    min-width: 920px;
    table-layout: fixed;
    border-collapse: collapse;
    text-align: left;
    background: var(--surface);
  }

  .ord-table thead {
    background: var(--surface-alt);
  }

  .ord-table th {
    position: sticky;
    top: 0;
    z-index: 4;
    padding: 0.65rem 0.6rem;
    font-size: 0.64rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
    white-space: nowrap;
    border-bottom: 1px solid var(--hairline);
    background: var(--surface-alt);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ord-table td {
    padding: 0.6rem;
    border-bottom: 1px solid var(--hairline);
    font-size: 0.8rem;
    vertical-align: top;
    overflow: hidden;
  }

  .ord-table tr:last-child td {
    border-bottom: none;
  }

  .ord-table tbody tr {
    transition: background 0.12s ease;
  }
  .ord-table tbody tr:hover {
    background: rgba(212, 175, 90, 0.035);
  }
  .ord-table tbody tr:hover .docs-cell,
  .ord-table tbody tr:hover .actions-cell {
    background: #1f0d12;
  }

  .row-pending {
    box-shadow: inset 3px 0 0 var(--pending);
  }
  .row-pending .docs-cell,
  .row-pending .actions-cell {
    background: var(--surface);
  }

  .mono-cell {
    font-weight: 600;
    font-family: "SF Mono", "Courier New", monospace;
    color: var(--gold-bright);
    font-size: 0.72rem;
    white-space: normal;
    word-break: break-all;
    line-height: 1.35;
  }

  .code-cell {
    font-weight: 600;
    color: var(--cream);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .amount-cell {
    font-weight: 700;
    color: var(--cream);
    white-space: nowrap;
  }

  .customer-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-align: left;
    font-family: inherit;
    color: inherit;
    width: 100%;
    min-width: 0;
  }

  .customer-text {
    min-width: 0;
    overflow: hidden;
  }

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f3d68f, #d4af5a);
    color: #2c0810;
    font-size: 0.68rem;
    font-weight: 700;
  }
  .avatar-lg {
    width: 44px;
    height: 44px;
    font-size: 0.9rem;
  }

  .customer-name {
    display: block;
    color: var(--cream);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .customer-chip:hover .customer-name {
    color: var(--gold-bright);
  }

  .customer-mobile {
    display: block;
    font-size: 0.72rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .customer-hint {
    display: block;
    font-size: 0.64rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--gold);
    opacity: 0.75;
    white-space: nowrap;
    margin-top: 0.1rem;
  }
  .customer-chip:hover .customer-hint {
    color: var(--gold-bright);
    opacity: 1;
  }

  .address-cell {
    font-size: 0.76rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: help;
  }

  .muted-cell {
    color: var(--muted);
    font-size: 0.76rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty-row {
    padding: 3rem 1rem;
    text-align: center;
    color: var(--muted);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.28rem 0.55rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-pending {
    background: rgba(232, 163, 61, 0.12);
    color: var(--pending);
  }
  .status-pending .status-dot { background: var(--pending); }
  .status-verified {
    background: rgba(111, 207, 151, 0.12);
    color: var(--success);
  }
  .status-verified .status-dot { background: var(--success); }
  .status-rejected {
    background: rgba(255, 107, 107, 0.12);
    color: var(--danger);
  }
  .status-rejected .status-dot { background: var(--danger); }

  /* Documents column: icon-only buttons side by side — much narrower than
     before, so it no longer eats into the address/payment columns. */
  .ord-table td.docs-cell,
  .ord-table td.actions-cell {
    overflow: visible;
  }
  .docs-cell {
    position: sticky;
    right: 120px;
    background: var(--surface);
    z-index: 2;
    box-shadow: -6px 0 8px -6px rgba(0, 0, 0, 0.45);
  }
  thead .docs-cell {
    background: var(--surface-alt);
    z-index: 5;
    box-shadow: none;
  }
  .doc-btns {
    display: flex;
    flex-direction: row;
    gap: 0.35rem;
  }
  .btn-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    width: 46px;
    padding: 0.32rem 0.2rem;
    border-radius: 0.4rem;
    border: 1px solid var(--hairline);
    background: transparent;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .btn-icon:hover {
    border-color: var(--gold);
    background: rgba(212, 175, 90, 0.08);
  }
  .btn-icon-glyph {
    font-size: 0.95rem;
    line-height: 1;
  }
  .btn-icon-label {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--muted);
    line-height: 1;
    white-space: nowrap;
  }
  .btn-icon:hover .btn-icon-label {
    color: var(--gold-bright);
  }

  /* Actions column: Verify / Reject only, STICKY to the right edge */
  .actions-cell {
    position: sticky;
    right: 0;
    background: var(--surface);
    z-index: 2;
  }
  thead .actions-cell {
    background: var(--surface-alt);
    z-index: 5;
    text-align: center;
  }

  .action-btns {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    width: 100%;
  }

  .no-action {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
    padding: 0.3rem 0.5rem;
    border-radius: 0.4rem;
  }
  .no-action-verified {
    color: var(--success);
    background: rgba(111, 207, 151, 0.1);
  }
  .no-action-rejected {
    color: var(--danger);
    background: rgba(255, 107, 107, 0.1);
  }

  .btn-spinner {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 2px solid rgba(8, 36, 20, 0.3);
    border-top-color: #082414;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .btn {
    padding: 0.35rem 0.5rem;
    border-radius: 0.4rem;
    cursor: pointer;
    font-size: 0.68rem;
    font-weight: 600;
    border: none;
    font-family: inherit;
    transition: filter 0.15s ease, opacity 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
    text-align: center;
    width: 100%;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn:not(:disabled):hover {
    filter: brightness(1.1);
  }

  .btn-verify {
    background: linear-gradient(135deg, #85e0ac, #4fae7a);
    color: #082414;
  }

  .btn-reject {
    background: rgba(255, 107, 107, 0.12);
    border: 1px solid rgba(255, 107, 107, 0.4);
    color: var(--danger);
  }

  .btn-ghost {
    padding: 0.55rem 1rem;
    border: 1px solid var(--hairline);
    background: transparent;
    color: var(--cream);
    border-radius: 0.5rem;
  }
  .btn-ghost:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(5, 2, 3, 0.72);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
  }

  .modal-box {
    background: var(--surface);
    padding: 1.6rem;
    border-radius: 0.85rem;
    min-width: 320px;
    max-width: 90vw;
    border: 1px solid var(--hairline);
    box-shadow: 0 30px 70px -20px #000000e0;
  }

  .modal-head {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 1.1rem;
    padding-bottom: 1.1rem;
    border-bottom: 1px solid var(--hairline);
  }

  .modal-head h3 {
    margin: 0;
    font-family: var(--font-cormorant), serif;
    font-size: 1.3rem;
    color: var(--cream);
    font-weight: 600;
  }

  .modal-sub {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    color: var(--muted);
  }

  .modal-list {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem 1rem;
  }
  .modal-list dt {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
    white-space: nowrap;
    padding-top: 0.1rem;
  }
  .modal-list dd {
    margin: 0;
    font-size: 0.88rem;
    color: var(--cream);
  }

  .modal-close {
    margin-top: 1.3rem;
    width: 100%;
    text-align: center;
  }

  .skeleton-wrap {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .skeleton-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }
  .skeleton-bar {
    background: linear-gradient(90deg, var(--surface) 25%, var(--surface-alt) 37%, var(--surface) 63%);
    background-size: 400% 100%;
    animation: shimmer 1.4s ease infinite;
    border-radius: 0.65rem;
  }
  @keyframes shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
  }

  .err-state {
    padding: 3rem 1rem;
    text-align: center;
  }
  .err-title {
    font-family: var(--font-cormorant), serif;
    font-size: 1.4rem;
    color: var(--danger);
    margin: 0 0 0.4rem;
  }
  .err-body {
    color: var(--muted);
    margin: 0 0 1.2rem;
    font-size: 0.88rem;
  }

  @media (max-width: 720px) {
    .stats {
      grid-template-columns: repeat(2, 1fr);
    }
    .ord-title {
      font-size: 1.5rem;
    }
  }
`;
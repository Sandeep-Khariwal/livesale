'use client';

import { useEffect, useState } from 'react';

interface DispatchOrder {
  id: string;
  orderNumber: string;
  productCode: string;
  amount: number;
  customer: { name: string; mobile: string } | null;
  address: { address: string; city: string; state: string; pincode: string } | null;
  createdAt: string;
  dispatchedAt: string | null;
  courierName: string | null;
  trackingId: string | null;
}

export default function DispatchPage() {
  const [view, setView] = useState<'pending' | 'dispatched'>('pending');
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { courier: string; tracking: string }>>({});

  const load = async (v: 'pending' | 'dispatched') => {
    setLoading(true);
    const res = await fetch(`/api/admin/dispatch?view=${v}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => {
    load(view);
  }, [view]);

  const handleDispatch = async (orderId: string) => {
    const input = trackingInputs[orderId] || { courier: '', tracking: '' };
    setDispatchingId(orderId);
    try {
      const res = await fetch('/api/admin/dispatch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          courierName: input.courier,
          trackingId: input.tracking,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to dispatch');
        return;
      }
      // remove from pending list once dispatched
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="oms-dispatch">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap");
      `}</style>

      <style jsx>{`
        .oms-dispatch {
          --ink: #150b0e;
          --surface: #211217;
          --surface-alt: #2a161c;
          --hairline: rgba(212, 175, 90, 0.18);
          --gold: #d4af5a;
          --gold-bright: #f3d68f;
          --emerald: #4fae7a;
          --rose: #e0654f;
          --amber: #e8a33d;
          --cream: #f6ecd9;
          --muted: #a8927b;
          font-family: 'Inter', sans-serif;
          color: var(--cream);
          background: var(--ink);
          min-height: 100vh;
          padding: 1.75rem 1.5rem 3rem;
        }

        .page-title {
          font-family: 'Fraunces', serif;
          font-optical-sizing: auto;
          font-weight: 600;
          font-size: 2rem;
          letter-spacing: -0.01em;
          margin: 0 0 0.5rem;
        }

        .page-sub {
          font-size: 0.88rem;
          color: var(--muted);
          margin: 0 0 1.6rem;
        }

        .tabs {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1.8rem;
          border-bottom: 1px solid var(--hairline);
        }

        .tab-btn {
          padding: 0.7rem 1.1rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--muted);
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .tab-btn.active {
          color: var(--gold-bright);
          border-bottom-color: var(--gold);
        }

        .state-msg {
          color: var(--muted);
          padding: 3rem 1rem;
          text-align: center;
          border: 1px solid var(--hairline);
          border-radius: 0.9rem;
          background: var(--surface);
          font-size: 0.9rem;
        }

        .order-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .order-card {
          border: 1px solid var(--hairline);
          border-radius: 0.9rem;
          padding: 1.4rem 1.5rem;
          background: var(--surface);
          transition: border-color 0.15s ease;
        }

        .order-card:hover {
          border-color: rgba(212, 175, 90, 0.35);
        }

        .order-top {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.2rem;
        }

        .order-number {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--cream);
        }

        .order-meta {
          font-size: 0.85rem;
          color: var(--muted);
          margin-top: 0.3rem;
        }

        .order-meta .amount {
          color: var(--gold-bright);
          font-weight: 600;
        }

        .order-customer {
          margin-top: 0.6rem;
          font-size: 0.88rem;
          color: var(--cream);
        }

        .dispatched-note {
          margin-top: 0.6rem;
          font-size: 0.82rem;
          color: var(--emerald);
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .address-block {
          max-width: 320px;
        }

        .address-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold-bright);
          margin-bottom: 0.4rem;
        }

        .address-text {
          font-size: 0.88rem;
          line-height: 1.55;
          color: var(--cream);
        }

        .address-missing {
          font-size: 0.88rem;
          color: var(--rose);
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
        }

        .dispatch-row {
          display: flex;
          gap: 0.6rem;
          margin-top: 1.2rem;
          flex-wrap: wrap;
        }

        .dispatch-row input {
          padding: 0.65rem 0.85rem;
          border-radius: 0.5rem;
          border: 1px solid var(--hairline);
          background: var(--ink);
          color: var(--cream);
          font-size: 0.85rem;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .dispatch-row input:focus {
          border-color: var(--gold);
        }

        .dispatch-row input::placeholder {
          color: var(--muted);
        }

        .dispatch-btn {
          padding: 0.65rem 1.3rem;
          border-radius: 0.5rem;
          border: none;
          background: linear-gradient(135deg, var(--gold-bright), var(--gold));
          color: #2c1408;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .dispatch-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .dispatch-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>

      <h1 className="page-title">Dispatch Orders</h1>
      <p className="page-sub">
        Sirf payment VERIFIED + order CONFIRMED wale orders yaha dikhte hain. Address confirm karke hi dispatch karo.
      </p>

      {/* Tabs */}
      <div className="tabs">
        <button
          onClick={() => setView('pending')}
          className={`tab-btn ${view === 'pending' ? 'active' : ''}`}
        >
          Pending Dispatch
        </button>
        <button
          onClick={() => setView('dispatched')}
          className={`tab-btn ${view === 'dispatched' ? 'active' : ''}`}
        >
          Dispatched History
        </button>
      </div>

      {loading ? (
        <div className="state-msg">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="state-msg">
          {view === 'pending' ? 'Abhi koi order dispatch ke liye ready nahi hai.' : 'Abhi tak koi order dispatch nahi hua.'}
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-top">
                <div>
                  <div className="order-number">{order.orderNumber}</div>
                  <div className="order-meta">
                    {order.productCode} &middot; <span className="amount">₹{order.amount}</span>
                  </div>
                  <div className="order-customer">
                    {order.customer?.name} &middot; {order.customer?.mobile}
                  </div>
                  {view === 'dispatched' && (
                    <div className="dispatched-note">
                      ✓ Dispatched {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : ''}
                      {order.courierName && ` via ${order.courierName}`}
                      {order.trackingId && ` — Tracking: ${order.trackingId}`}
                    </div>
                  )}
                </div>

                <div className="address-block">
                  <div className="address-label">Shipping Address</div>
                  {order.address ? (
                    <div className="address-text">
                      {order.address.address}, {order.address.city}, {order.address.state} -{' '}
                      {order.address.pincode}
                    </div>
                  ) : (
                    <div className="address-missing">
                      ⚠ No address found — do not dispatch, contact customer first.
                    </div>
                  )}
                </div>
              </div>

              {view === 'pending' && order.address && (
                <div className="dispatch-row">
                  <input
                    placeholder="Courier name"
                    value={trackingInputs[order.id]?.courier || ''}
                    onChange={(e) =>
                      setTrackingInputs((prev) => ({
                        ...prev,
                        [order.id]: { ...prev[order.id], courier: e.target.value, tracking: prev[order.id]?.tracking || '' },
                      }))
                    }
                  />
                  <input
                    placeholder="Tracking ID"
                    value={trackingInputs[order.id]?.tracking || ''}
                    onChange={(e) =>
                      setTrackingInputs((prev) => ({
                        ...prev,
                        [order.id]: { ...prev[order.id], tracking: e.target.value, courier: prev[order.id]?.courier || '' },
                      }))
                    }
                  />
                  <button
                    onClick={() => handleDispatch(order.id)}
                    disabled={dispatchingId === order.id}
                    className="dispatch-btn"
                  >
                    {dispatchingId === order.id ? 'Dispatching...' : 'Mark Dispatched'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
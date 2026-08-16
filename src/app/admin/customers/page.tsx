import dbConnect from "@/lib/mongoose";
import { Customer } from "@/models/Customer";
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

export const metadata = { title: "Customers | OMS Admin" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("") || "?";

export default async function CustomersPage() {
  await dbConnect();
  const customers = await Customer.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "customerId",
        as: "orders",
      },
    },
    {
      $addFields: {
        totalOrders: { $size: "$orders" },
        confirmedOrders: {
          $size: {
            $filter: {
              input: "$orders",
              as: "order",
              cond: { $eq: ["$$order.paymentStatus", "VERIFIED"] },
            },
          },
        },
        totalOrderValue: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$orders",
                  as: "order",
                  cond: { $eq: ["$$order.paymentStatus", "VERIFIED"] },
                },
              },
              as: "order",
              in: "$$order.amount",
            },
          },
        },
        lastOrderDate: { $max: "$orders.createdAt" },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c: any) => c.confirmedOrders > 1).length;
  const totalRevenue = customers.reduce((sum: number, c: any) => sum + (c.totalOrderValue || 0), 0);

  return (
    <div className={`${cormorant.variable} ${jost.variable} cust`}>
      <div className="cust-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 className="cust-title">Customers</h1>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div>
            <p className="stat-num">{totalCustomers}</p>
            <p className="stat-label">Total customers</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-num">{repeatCustomers}</p>
            <p className="stat-label">Repeat customers</p>
          </div>
        </div>
        <div className="stat-card stat-revenue">
          <div>
            <p className="stat-num">₹{totalRevenue.toLocaleString("en-IN")}</p>
            <p className="stat-label">Lifetime verified revenue</p>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="cust-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Mobile</th>
              <th>WhatsApp</th>
              <th>Total orders</th>
              <th>Confirmed</th>
              <th>Total value</th>
              <th>Last order</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer: any) => (
                <tr key={customer._id.toString()}>
                  <td>
                    <div className="customer-chip">
                      <span className="avatar">{initials(customer.name)}</span>
                      <span className="customer-name">{customer.name}</span>
                    </div>
                  </td>
                  <td className="mono-cell">{customer.mobile}</td>
                  <td className="muted-cell">{customer.whatsapp || "—"}</td>
                  <td>{customer.totalOrders}</td>
                  <td>
                    {customer.confirmedOrders > 0 ? (
                      <span className="status-badge status-verified">
                        <span className="status-dot" />
                        {customer.confirmedOrders}
                      </span>
                    ) : (
                      <span className="muted-cell">0</span>
                    )}
                  </td>
                  <td className="amount-cell">₹{Number(customer.totalOrderValue || 0).toLocaleString("en-IN")}</td>
                  <td className="muted-cell">
                    {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="muted-cell">{new Date(customer.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{baseStyles}</style>
    </div>
  );
}

const baseStyles = `
  .cust {
    --ink: #0a0304;
    --surface: #150609;
    --surface-alt: #1c0a0f;
    --hairline: rgba(212, 175, 90, 0.16);
    --gold: #d4af5a;
    --gold-bright: #f3d68f;
    --cream: #f6ecd9;
    --muted: #a8927b;
    --success: #6fcf97;
    font-family: var(--font-jost), -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--cream);
    max-width: 1240px;
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

  .cust-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 1.75rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .cust-title {
    margin: 0;
    font-family: var(--font-cormorant), serif;
    font-size: 2rem;
    font-weight: 600;
    color: var(--cream);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    padding: 1rem 1.1rem;
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: 0.65rem;
  }

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

  .table-wrap {
    overflow-x: auto;
    border-radius: 0.85rem;
    border: 1px solid var(--hairline);
  }

  .cust-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    background: var(--surface);
  }

  .cust-table thead {
    background: var(--surface-alt);
  }

  .cust-table th {
    padding: 0.85rem 1rem;
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
    white-space: nowrap;
    border-bottom: 1px solid var(--hairline);
  }

  .cust-table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--hairline);
    font-size: 0.86rem;
    vertical-align: middle;
    white-space: nowrap;
  }

  .cust-table tr:last-child td {
    border-bottom: none;
  }

  .cust-table tbody tr {
    transition: background 0.12s ease;
  }
  .cust-table tbody tr:hover {
    background: rgba(212, 175, 90, 0.035);
  }

  .customer-chip {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f3d68f, #d4af5a);
    color: #2c0810;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .customer-name {
    color: var(--cream);
    font-weight: 500;
  }

  .mono-cell {
    font-family: "SF Mono", "Courier New", monospace;
    color: var(--gold-bright);
    font-size: 0.82rem;
  }

  .amount-cell {
    font-weight: 700;
    color: var(--cream);
  }

  .muted-cell {
    color: var(--muted);
    font-size: 0.82rem;
  }

  .empty-row {
    padding: 3rem 1rem;
    text-align: center;
    color: var(--muted);
    white-space: normal;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.32rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .status-verified {
    background: rgba(111, 207, 151, 0.12);
    color: var(--success);
  }
  .status-verified .status-dot {
    background: var(--success);
  }

  @media (max-width: 720px) {
    .stats {
      grid-template-columns: 1fr;
    }
    .cust-title {
      font-size: 1.5rem;
    }
  }
`;
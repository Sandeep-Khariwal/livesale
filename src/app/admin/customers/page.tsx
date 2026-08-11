import dbConnect from "@/lib/mongoose";
import { Customer } from "@/models/Customer";

export const metadata = { title: "Customers | OMS Admin" };

export default async function CustomersPage() {
  await dbConnect();
  const customers = await Customer.find().sort({ createdAt: -1 }).lean();

  return (
    <div>
      <h1 style={{ marginBottom: "2rem" }}>Customers</h1>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
          <thead style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(0,0,0,0.02)" }}>
            <tr>
              <th style={{ padding: "1rem" }}>Name</th>
              <th style={{ padding: "1rem" }}>Mobile</th>
              <th style={{ padding: "1rem" }}>WhatsApp</th>
              <th style={{ padding: "1rem" }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>No customers found.</td>
              </tr>
            ) : (
              customers.map((customer: any) => (
                <tr key={customer._id.toString()} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "1rem", fontWeight: 500 }}>{customer.name}</td>
                  <td style={{ padding: "1rem" }}>{customer.mobile}</td>
                  <td style={{ padding: "1rem" }}>{customer.whatsapp || "-"}</td>
                  <td style={{ padding: "1rem" }}>{new Date(customer.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

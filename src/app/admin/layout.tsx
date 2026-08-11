import React from "react";
import Link from "next/link";
import "./admin.css"; // We'll add some specific admin styles later

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>OMS Admin</h2>
        </div>
        <nav className="admin-nav">
          <Link href="/admin">Dashboard</Link>

          <Link href="/admin/products">Products</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/admin/customers">Customers</Link>
          <Link href="/admin/settings">Settings</Link>
        </nav>
      </aside>
      <main className="admin-content">
        <header className="admin-header">
          <div>Welcome, Admin</div>
        </header>
        <div className="admin-page-content">{children}</div>
      </main>
    </div>
  );
}

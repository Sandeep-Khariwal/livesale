"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductsClient({ initialProducts }: { initialProducts: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Adjust Stock State
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("Restock");
  
  // Form State
  const [productCode, setProductCode] = useState("");
  const [price, setPrice] = useState("");
  const [initialStock, setInitialStock] = useState(""); // For new products
  const [availableStock, setAvailableStock] = useState(""); // For editing existing
  const [status, setStatus] = useState("AVAILABLE");

  const resetForm = () => {
    setProductCode("");
    setPrice("");
    setInitialStock("");
    setAvailableStock("");
    setStatus("AVAILABLE");
    setIsAdding(false);
    setIsEditing(null);
    setAdjustingProduct(null);
  };

  const openEdit = (product: any) => {
    setProductCode(product.productCode);
    setPrice(product.price.toString());
    setAvailableStock(product.availableStock.toString());
    setStatus(product.status);
    setIsEditing(product);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode, price, initialStock }),
      });
      if (res.ok) {
        resetForm();
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add product");
      }
    } catch (err) {
      alert("Error adding product");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: isEditing._id, price, availableStock }),
      });
      if (res.ok) {
        resetForm();
        router.refresh();
      } else {
        alert("Failed to update product");
      }
    } catch (err) {
      alert("Error updating product");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustingProduct._id,
          adjustment: Number(adjustAmount),
          reason: adjustReason
        })
      });
      if (res.ok) {
        setAdjustingProduct(null);
        setAdjustAmount("");
        setAdjustReason("Restock");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to adjust stock");
      }
    } catch (err) {
      alert("Error adjusting stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Products</h1>
        <button 
          onClick={() => setIsAdding(true)}
          style={{ padding: "0.5rem 1rem", backgroundColor: "var(--primary)", color: "white", border: "none", borderRadius: "0.25rem", cursor: "pointer", fontWeight: 600 }}>
          + ADD PRODUCT
        </button>
      </div>

      {(isAdding || isEditing) && (
        <div style={{ marginBottom: "2rem", padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
          <h2>{isEditing ? "Edit Product" : "Add Product"}</h2>
          <form onSubmit={isEditing ? handleEditSubmit : handleAddSubmit} style={{ display: "flex", gap: "1rem", flexDirection: "column", maxWidth: "400px" }}>
            
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "0.5rem" }}>
              <h3 style={{ marginTop: 0, fontSize: "1rem", opacity: 0.7 }}>PRODUCT INFORMATION</h3>
              <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "1rem" }}>Product Code</label>
              <input type="text" value={productCode} onChange={e => setProductCode(e.target.value)} disabled={!!isEditing} required style={{ width: "100%", padding: "0.5rem" }} />
              
              <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "1rem" }}>Price (₹)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
            </div>

            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "0.5rem" }}>
              <h3 style={{ marginTop: 0, fontSize: "1rem", opacity: 0.7 }}>INVENTORY</h3>
              {!isEditing ? (
                <>
                  <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "1rem" }}>Initial Stock</label>
                  <input type="number" value={initialStock} onChange={e => setInitialStock(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
                </>
              ) : (
                <>
                  <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "1rem" }}>Available Stock</label>
                  <input type="number" value={availableStock} onChange={e => {
                    setAvailableStock(e.target.value);
                    setStatus(Number(e.target.value) > 0 ? "AVAILABLE" : "SOLD_OUT");
                  }} required style={{ width: "100%", padding: "0.5rem" }} />
                </>
              )}
            </div>

            {isEditing && (
              <div>
                <h3 style={{ marginTop: 0, fontSize: "1rem", opacity: 0.7 }}>STATUS</h3>
                <div style={{
                  display: "inline-block",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.25rem",
                  fontWeight: "bold",
                  backgroundColor: status === "AVAILABLE" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: status === "AVAILABLE" ? "var(--success)" : "var(--error)",
                  marginTop: "0.5rem"
                }}>
                  {status === "AVAILABLE" ? "🟢 AVAILABLE" : "🔴 SOLD OUT"}
                </div>
                <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: "0.5rem" }}>Status is automatically calculated from available stock.</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem", backgroundColor: "var(--primary)", color: "white", border: "none", borderRadius: "0.25rem", cursor: "pointer" }}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={resetForm} style={{ padding: "0.5rem 1rem", backgroundColor: "transparent", border: "1px solid var(--border)", borderRadius: "0.25rem", cursor: "pointer", color: "var(--foreground)" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustingProduct && (
        <div style={{ marginBottom: "2rem", padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
          <h2>Adjust Stock: {adjustingProduct.productCode}</h2>
          <form onSubmit={handleAdjustSubmit} style={{ display: "flex", gap: "1rem", flexDirection: "column", maxWidth: "400px" }}>
            <p style={{ margin: 0 }}>Current Stock: <strong>{adjustingProduct.availableStock}</strong></p>
            
            <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "1rem" }}>Adjustment Quantity (use negative to remove)</label>
            <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
            
            <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "1rem" }}>Reason</label>
            <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem", backgroundColor: "var(--primary)", color: "white", border: "none", borderRadius: "0.25rem", cursor: "pointer" }}>
                {loading ? "Saving..." : "Confirm Adjustment"}
              </button>
              <button type="button" onClick={() => setAdjustingProduct(null)} style={{ padding: "0.5rem 1rem", backgroundColor: "transparent", border: "1px solid var(--border)", borderRadius: "0.25rem", cursor: "pointer", color: "var(--foreground)" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
          <thead style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(0,0,0,0.02)" }}>
            <tr>
              <th style={{ padding: "1rem" }}>Code</th>
              <th style={{ padding: "1rem" }}>Price</th>
              <th style={{ padding: "1rem" }}>Available Stock</th>
              <th style={{ padding: "1rem" }}>Status</th>
              <th style={{ padding: "1rem" }}>Updated</th>
              <th style={{ padding: "1rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialProducts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>No products found.</td>
              </tr>
            ) : (
              initialProducts.map((product: any) => (
                <tr key={product._id.toString()} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "1rem", fontWeight: 500 }}>{product.productCode}</td>
                  <td style={{ padding: "1rem" }}>₹{product.price}</td>
                  <td style={{ padding: "1rem", fontWeight: "bold" }}>{product.availableStock}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "0.25rem", 
                      fontSize: "0.75rem", 
                      fontWeight: 600,
                      backgroundColor: product.status === "AVAILABLE" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      color: product.status === "AVAILABLE" ? "var(--success)" : "var(--error)"
                    }}>
                      {product.status === "AVAILABLE" ? "🟢 AVAILABLE" : "🔴 SOLD OUT"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>{new Date(product.updatedAt).toLocaleDateString()}</td>
                  <td style={{ padding: "1rem", display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => openEdit(product)} style={{ padding: "0.25rem 0.5rem", border: "1px solid var(--border)", backgroundColor: "transparent", borderRadius: "0.25rem", cursor: "pointer", color: "var(--primary)", fontWeight: "bold" }}>Edit</button>
                    <button onClick={() => setAdjustingProduct(product)} style={{ padding: "0.25rem 0.5rem", border: "1px solid var(--border)", backgroundColor: "transparent", borderRadius: "0.25rem", cursor: "pointer", color: "var(--foreground)", fontWeight: "bold" }}>Adjust Stock</button>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "AVAILABLE" | "SOLD_OUT">("IDLE");
  const [product, setProduct] = useState<any>(null);

  const checkAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    setLoading(true);
    setError("");
    setStatus("IDLE");
    setProduct(null);

    try {
      const res = await fetch(`/api/products/check?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (res.ok) {
        setProduct(data.product);
        setStatus(data.available ? "AVAILABLE" : "SOLD_OUT");
      } else {
        setError(data.error || "Failed to check availability");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = () => {
    if (product && product.id) {
      router.push(`/order/${product.code}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backgroundColor: "var(--background)" }}>
      <div style={{ maxWidth: "450px", width: "100%", padding: "2.5rem", borderRadius: "1rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center" }}>
        <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "var(--error)", marginBottom: "1rem" }}>
          <span style={{ height: "12px", width: "12px", borderRadius: "50%", backgroundColor: "var(--error)", display: "inline-block", animation: "pulse 2s infinite" }}></span>
          LIVE SALE
        </h1>
        
        <p style={{ marginBottom: "2rem", color: "var(--foreground)", opacity: 0.8 }}>
          Watching us on Instagram/Facebook?<br/>
          Enter the Product Code shown during the LIVE to check availability and place your order.
        </p>

        <form onSubmit={checkAvailability} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
            <label htmlFor="productCode" style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>Product Code</label>
            <input
              id="productCode"
              type="text"
              placeholder="e.g. SR101"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              style={{ padding: "0.75rem 1rem", borderRadius: "0.5rem", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "1rem", textTransform: "uppercase" }}
            />
          </div>
          
          <button type="submit" disabled={loading || !code} style={{ padding: "0.75rem 1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "var(--primary)", color: "white", fontSize: "1rem", fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" }}>
            {loading ? "Checking..." : "CHECK AVAILABILITY"}
          </button>
        </form>

        {error && <div style={{ color: "var(--error)", marginTop: "1rem", fontSize: "0.875rem" }}>{error}</div>}

        {status === "AVAILABLE" && product && (
          <div style={{ marginTop: "2rem", padding: "1.5rem", border: "1px solid var(--success)", borderRadius: "0.5rem", backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
            <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem" }}>{product.code}</h2>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 1rem 0" }}>₹{product.price}</p>
            <p style={{ color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              🟢 AVAILABLE
            </p>
            <button onClick={handleOrder} style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "var(--foreground)", color: "var(--background)", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>
              ORDER NOW
            </button>
          </div>
        )}

        {status === "SOLD_OUT" && product && (
          <div style={{ marginTop: "2rem", padding: "1.5rem", border: "1px solid var(--error)", borderRadius: "0.5rem", backgroundColor: "rgba(239, 68, 68, 0.05)" }}>
            <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem" }}>{product.code}</h2>
            <p style={{ color: "var(--error)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", margin: "1rem 0" }}>
              🔴 SOLD OUT
            </p>
            <p style={{ fontSize: "0.875rem", opacity: 0.8, margin: 0 }}>
              Sorry, this product is no longer available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

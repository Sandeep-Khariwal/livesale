"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div style={{ maxWidth: "450px", width: "100%", padding: "2.5rem", borderRadius: "1rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center" }}>
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
      <h1 style={{ marginBottom: "1rem", color: "var(--success)" }}>Order Submitted!</h1>
      <p style={{ marginBottom: "1.5rem", fontSize: "1.1rem" }}>Your stock has been successfully reserved.</p>
      
      {orderNumber && (
        <div style={{ padding: "1rem", backgroundColor: "rgba(99, 102, 241, 0.05)", borderRadius: "0.5rem", border: "1px dashed var(--primary)", marginBottom: "2rem" }}>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "0.875rem" }}>Order Number</p>
          <h2 style={{ margin: "0.5rem 0 0 0", color: "var(--primary)" }}>{orderNumber}</h2>
        </div>
      )}

      <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "2rem" }}>
        Our team will verify your payment screenshot shortly. You will receive an update once confirmed.
      </p>

      <button onClick={() => router.push("/")} style={{ width: "100%", padding: "1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "var(--foreground)", color: "var(--background)", fontWeight: 600, cursor: "pointer" }}>
        BACK TO HOME
      </button>
    </div>
  );
}

export default function OrderSuccess() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backgroundColor: "var(--background)" }}>
      <Suspense fallback={<div>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}

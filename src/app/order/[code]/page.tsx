"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrderPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const productCode = decodeURIComponent(params.code);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    whatsapp: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1 = details, 2 = payment

  const [upiId, setUpiId] = useState("example@upi");

  useEffect(() => {
    // Check product and settings
    Promise.all([
      fetch(`/api/products/check?code=${encodeURIComponent(productCode)}`).then(res => res.json()),
      fetch(`/api/settings`).then(res => res.json())
    ])
      .then(([productData, settingsData]) => {
        if (productData.available && productData.product) {
          setProduct(productData.product);
        } else {
          setError(productData.error || "This product is sold out.");
        }
        if (settingsData.upiId) {
          setUpiId(settingsData.upiId);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load details.");
        setLoading(false);
      });
  }, [productCode]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshot) {
      setError("Please upload your payment screenshot.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Upload screenshot to our API which will upload to S3
      const formDataUpload = new FormData();
      formDataUpload.append("screenshot", screenshot);
      formDataUpload.append("productCode", product.code);
      formDataUpload.append("customerDetails", JSON.stringify(formData));

      const res = await fetch("/api/orders/create", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to success
        router.push(`/order/success?orderNumber=${data.orderNumber}`);
      } else {
        setError(data.error || "Order failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;

  if (error || !product) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--error)" }}>
        <h2>{error}</h2>
        <button onClick={() => router.push("/")} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1rem", backgroundColor: "var(--background)" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem", backgroundColor: "var(--surface)", borderRadius: "1rem", border: "1px solid var(--border)" }}>
        <h1 style={{ marginBottom: "0.5rem", fontSize: "1.5rem" }}>Order {product.code}</h1>
        <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--primary)", marginBottom: "2rem" }}>Amount: ₹{product.price}</p>

        {error && <div style={{ color: "var(--error)", marginBottom: "1rem" }}>{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3>Customer Details</h3>
            
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="name">Full Name</label>
                <input id="name" type="text" value={formData.name} onChange={handleChange} required style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }} />
              </div>
              
              <div>
                <label htmlFor="mobile">Mobile Number</label>
                <input id="mobile" type="tel" value={formData.mobile} onChange={handleChange} required style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }} />
              </div>
              
              <div>
                <label htmlFor="whatsapp">WhatsApp Number</label>
                <input id="whatsapp" type="tel" value={formData.whatsapp} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="address">Shipping Address</label>
                <textarea id="address" value={formData.address} onChange={handleChange} required rows={3} style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }} />
              </div>

              <div>
                <label htmlFor="city">City</label>
                <input id="city" type="text" value={formData.city} onChange={handleChange} required style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }} />
              </div>

              <div>
                <label htmlFor="state">State</label>
                <input id="state" type="text" value={formData.state} onChange={handleChange} required style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }} />
              </div>

              <div>
                <label htmlFor="pincode">Pincode</label>
                <input id="pincode" type="text" value={formData.pincode} onChange={handleChange} required style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }} />
              </div>
            </div>

            <button type="submit" style={{ marginTop: "1rem", padding: "1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "var(--foreground)", color: "var(--background)", fontWeight: 600, cursor: "pointer" }}>
              CONTINUE TO PAYMENT
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ padding: "1.5rem", backgroundColor: "rgba(99, 102, 241, 0.05)", border: "1px dashed var(--primary)", borderRadius: "0.5rem", textAlign: "center" }}>
              <h3 style={{ margin: "0 0 1rem 0" }}>Payment Instructions</h3>
              <p>Please pay exactly <strong>₹{product.price}</strong> to the UPI ID below:</p>
              <p style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "1rem 0" }}>
                {upiId}
              </p>
              <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>
                Once paid, upload the screenshot of the successful transaction to confirm your order.
              </p>
            </div>

            <div>
              <label htmlFor="screenshot" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Payment Screenshot</label>
              <input 
                id="screenshot" 
                type="file" 
                accept="image/*" 
                onChange={handleScreenshotChange} 
                required 
                style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="button" onClick={() => setStep(1)} style={{ padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontWeight: 600, cursor: "pointer" }}>
                BACK
              </button>
              <button type="submit" disabled={submitting || !screenshot} style={{ flex: 1, padding: "1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "var(--success)", color: "white", fontWeight: 600, cursor: "pointer" }}>
                {submitting ? "SUBMITTING..." : "SUBMIT ORDER"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

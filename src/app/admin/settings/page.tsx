"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setUpiId(data.settings.upiId || "");
        }
        setLoading(false);
      })
      .catch(() => {
        setMessage("Failed to load settings");
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId }),
      });
      if (res.ok) {
        setMessage("Settings saved successfully.");
      } else {
        setMessage("Failed to save settings.");
      }
    } catch (err) {
      setMessage("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: "2rem" }}>Settings</h1>
      
      <div style={{ maxWidth: "500px", padding: "2rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
        <h2>Payment Configuration</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <div>
            <label htmlFor="upiId" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>UPI ID</label>
            <input 
              id="upiId"
              type="text" 
              value={upiId} 
              onChange={e => setUpiId(e.target.value)} 
              placeholder="example@upi"
              required 
              style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }} 
            />
            <p style={{ fontSize: "0.875rem", opacity: 0.7, marginTop: "0.5rem" }}>
              This UPI ID will be shown to customers during the checkout process.
            </p>
          </div>
          
          <button type="submit" disabled={saving} style={{ padding: "0.75rem 1rem", backgroundColor: "var(--primary)", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
        {message && <p style={{ marginTop: "1rem", color: message.includes("success") ? "var(--success)" : "var(--error)" }}>{message}</p>}
      </div>
    </div>
  );
}

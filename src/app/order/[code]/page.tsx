
"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Cormorant_Garamond, Jost } from "next/font/google";
import Navbar from "../../../component/Navbar";
// import { razorpay } from "../../../lib/razorpay"; // NEW

import RazorpayPayButton from "../../../component/RazorpayPayButton";
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jost",
});

type Step = 1 | 2 | 3 | 4; // 1 = Reference Photo, 2 = Details, 3 = Payment, 4 = Confirm
type DetailsPhase = "mobile" | "existing" | "new";

const isTenDigitMobile = (v: string) => /^[6-9]\d{9}$/.test(v.trim());
const isSixDigitPincode = (v: string) => /^\d{6}$/.test(v.trim());
const isValidName = (v: string) => /^[A-Za-z][A-Za-z\s.'-]{1,}$/.test(v.trim());
const isValidPlaceName = (v: string) => /^[A-Za-z][A-Za-z\s.'-]{1,}$/.test(v.trim());
const isValidAddress = (v: string) => v.trim().length >= 10;

export default function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { code } = use(params);
  const productCode = decodeURIComponent(code);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [step, setStep] = useState<Step>(1);
  const [phase, setPhase] = useState<DetailsPhase>("mobile");
  const [locating, setLocating] = useState(false);
  
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [existingName, setExistingName] = useState("");
  const [existingAddress, setExistingAddress] = useState<any>(null);
  
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    whatsapp: "",
      landmark: "",   // NEW

    address: "",
    city: "",

    state: "",
    pincode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [referencePhoto, setReferencePhoto] = useState<File | null>(null);
  const [referencePhotoPreview, setReferencePhotoPreview] = useState<string | null>(null);

  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const [upiId, setUpiId] = useState("example@upi");
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // NEW — Razorpay button loading state (separate from the manual-flow `submitting`)
  // const [razorpayLoading, setRazorpayLoading] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/check?code=${encodeURIComponent(productCode)}`).then((res) => res.json()),
      fetch(`/api/settings`).then((res) => res.json()),
    ])
      .then(([productData, settingsData]) => {
        if (productData.available && productData.product) {
          setProduct(productData.product);
          console.log("Product data:", productData.product);
        } else {
          setError(productData.error || "This product is sold out.");
        }
        if (settingsData.upiId) setUpiId(settingsData.upiId);
        if (settingsData.qrCodeImageUrl) setQrCodeImageUrl(settingsData.qrCodeImageUrl);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load details.");
        setLoading(false);
      });
  }, [productCode]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, phase]);

  // ---------- STEP 1: REFERENCE PHOTO ----------

  const handleReferencePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferencePhoto(file);
      setReferencePhotoPreview(URL.createObjectURL(file));
    }
  };

  // ---------- STEP 2: DETAILS ----------

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTenDigitMobile(mobile)) {
      setMobileError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setMobileError("");

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/customers/lookup?mobile=${encodeURIComponent(mobile.trim())}`);
      const data = await res.json();

      if (data.found && data.address) {
        setExistingName(data.customer.name);
        setExistingAddress(data.address);
        setPhase("existing");
      } else if (data.found && !data.address) {
        setFormData((f) => ({ ...f, name: data.customer.name, mobile: mobile.trim(), whatsapp: data.customer.whatsapp || "" }));
        setPhase("new");
      } else {
        setFormData((f) => ({ ...f, mobile: mobile.trim() }));
        setPhase("new");
      }
    } catch {
      setError("Something went wrong. Please try again ");
    } finally {
      setLoading(false);
    }
  };

const handleUseThisAddress = () => {
  setFormData({
    name: existingName,
    mobile: mobile.trim(),
    whatsapp: "",
    address: existingAddress.address,
    landmark: existingAddress.landmark || "",   // NEW
    city: existingAddress.city,
    state: existingAddress.state,
    pincode: existingAddress.pincode,
  });
  setStep(3);
};

const handleChangeAddress = () => {
  setFormData({
    name: existingName,
    mobile: mobile.trim(),
    whatsapp: "",
    address: existingAddress?.address || "",
    landmark: existingAddress?.landmark || "",   // NEW
    city: existingAddress?.city || "",
    state: existingAddress?.state || "",
    pincode: existingAddress?.pincode || "",
  });
  setPhase("new");
};
  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data.address || {};

          setFormData((f) => ({
            ...f,
            address: [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(", ") || f.address,
            city: addr.city || addr.town || addr.village || f.city,
            state: addr.state || f.state,
            pincode: addr.postcode || f.pincode,
          }));
        } catch {
          // silent fail
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false)
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((f) => ({ ...f, [id]: value }));
    if (fieldErrors[id]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const validateStep1Form = () => {
    const errors: Record<string, string> = {};

    if (!isValidName(formData.name)) {
      errors.name = "Enter a valid full name (letters only, at least 2 characters).";
    }
    if (formData.whatsapp && !isTenDigitMobile(formData.whatsapp)) {
      errors.whatsapp = "Enter a valid 10-digit WhatsApp number, or leave it blank.";
    }
    if (!isValidAddress(formData.address)) {
      errors.address = "Address looks too short. Please enter your full address.";
    }

    if (!isValidPlaceName(formData.city)) {
      errors.city = "Enter a valid city name (letters only).";
    }
    if (!formData.landmark.trim()) {
  errors.landmark = "Please enter a landmark.";
}
    if (!isValidPlaceName(formData.state)) {
      errors.state = "Enter a valid state name (letters only).";
    }
    if (!isSixDigitPincode(formData.pincode)) {
      errors.pincode = "Enter a valid 6-digit pincode.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirmAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1Form()) {
      setError("Please fix the highlighted fields before continuing.");
      return;
    }
    setError("");
    setStep(3);
  };

  // ---------- STEP 4: SCREENSHOT ----------

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handleCopyUpi = async () => {
    await navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const upiIntentLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    "Merchant"
  )}&am=${product?.price || 0}&cu=INR&tn=${encodeURIComponent(`Order ${productCode}`)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshot) {
      setError("Please upload your payment screenshot.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("screenshot", screenshot);
      if (referencePhoto) {
        formDataUpload.append("referencePhoto", referencePhoto);
      }
      formDataUpload.append("productCode", product.code);
      formDataUpload.append("customerDetails", JSON.stringify(formData));

      const res = await fetch("/api/orders/create", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/order/success?orderNumber=${data.orderNumber}`);
      } else {
        setError(data.error || "Order failed. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- NEW: RAZORPAY PAYMENT ----------
  // Uses the same customer details / reference photo already collected in
  // steps 1–2, but skips the screenshot step entirely — Razorpay confirms
  // the payment itself, so on success we go straight to the success page.
  // const handleRazorpayPayment = async () => {
  //   setError("");
  //   setRazorpayLoading(true);

  //   const fd = new FormData();
  //   fd.append("productCode", product.code);
  //   fd.append("customerDetails", JSON.stringify(formData));
  //   if (referencePhoto) {
  //     fd.append("referencePhoto", referencePhoto);
  //   }

  //   await razorpay (fd, {
  //     onSuccess: (orderNumber) => {
  //       router.push(`/order/success?orderNumber=${orderNumber}`);
  //     },
  //     onError: (message) => {
  //       setError(message);
  //       setRazorpayLoading(false);
  //     },
  //     onDismiss: () => {
  //       // user closed the Razorpay popup without paying — just re-enable the button
  //       setRazorpayLoading(false);
  //     },
  //   });
  // };

  if (loading && !product) {
    return (
      <div
        className={`${cormorant.variable} ${jost.variable} font-jost`}
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #1a0508 0%, #0a0304 60%, #12060a 100%)",
          color: "#f6ecd9",
        }}
      >
        Loading...
      </div>
    );
  }

  if (error && !product) {
    return (
      <div
        className={`${cormorant.variable} ${jost.variable} font-jost`}
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #1a0508 0%, #0a0304 60%, #12060a 100%)",
          color: "#ffb0b0",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h2>{error}</h2>
        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: "1rem",
            padding: "0.6rem 1.2rem",
            borderRadius: "0.5rem",
            border: "1px solid #d4af5a3d",
            background: "transparent",
            color: "#f3d68f",
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const goldInputStyle = {
    width: "100%",
    padding: "0.85rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid #d4af5a3d",
    background: "#000000a0",
    color: "#f6ecd9",
    fontSize: "1rem",
    outline: "none",
  };

  const goldInputErrorStyle = {
    ...goldInputStyle,
    border: "1px solid #ff6b6b",
  };

  const errorTextStyle = {
    color: "#ff9b9b",
    fontSize: "0.75rem",
    marginTop: "0.35rem",
    marginBottom: 0,
  };

  const goldPrimaryBtn = {
    padding: "1rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "linear-gradient(135deg, #f3d68f, #d4af5a)",
    color: "#2c0810",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.5px",
  };

  const goldSecondaryBtn = {
    padding: "1rem",
    borderRadius: "0.5rem",
    border: "1px solid #d4af5a3d",
    background: "transparent",
    color: "#f6ecd9",
    fontWeight: 600,
    cursor: "pointer",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 500,
    marginBottom: "0.4rem",
    color: "#f3d68f",
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
  };

  const stepBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f3d68f, #d4af5a)",
    color: "#2c0810",
    fontSize: "0.75rem",
    fontWeight: 700,
    flexShrink: 0,
  };

  const payMethodLabelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#f3d68f",
    letterSpacing: "0.03em",
    marginBottom: "0.9rem",
  };

  const orDividerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    color: "#a8927b",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    margin: "0.25rem 0",
  };

  const orLineStyle = { flex: 1, height: "1px", background: "#d4af5a26" };

  return (
    <div
      className={`${cormorant.variable} ${jost.variable} font-jost`}
      style={{
        position: "relative",
        minHeight: "100dvh",
        padding: "1.5rem 1rem 3rem",
        background: "linear-gradient(160deg, #1a0508 0%, #0a0304 60%, #12060a 100%)",
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Navbar />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(500px 500px at 80% 10%, #f3d68f14, transparent 60%), radial-gradient(400px 500px at 10% 90%, #4a0e1c33, transparent 60%)",
        }}
      />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 0,
          opacity: 0.045,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div
        ref={topRef}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "600px",
          height: "fit-content",
          margin: "3.5rem auto 0",
          padding: "1.75rem 1.5rem",
          backgroundColor: "#150609e6",
          borderRadius: "1rem",
          border: "1px solid #d4af5a3d",
          boxShadow: "0 20px 60px -15px #000000cc, 0 0 40px -10px #d4af5a33",
          boxSizing: "border-box",
          backdropFilter: "blur(10px) saturate(1.1)",
        }}
      >
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: "9px",
            border: "1px solid #d4af5a2e",
            borderRadius: "0.6rem",
          }}
        />

        {/* Product preview */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.75rem",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid #d4af5a3d",
            background: "#00000033",
          }}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.code}
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "0.5rem",
                objectFit: "cover",
                border: "1px solid #d4af5a3d",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "0.5rem",
                background: "linear-gradient(135deg, #f3d68f22, #d4af5a22)",
                border: "1px solid #d4af5a3d",
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <p
              style={{
                margin: "0 0 0.2rem",
                fontSize: "0.68rem",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#a8927b",
                fontWeight: 500,
              }}
            >
              {product.code}
            </p>
            <h1
              style={{
                margin: "0 0 0.3rem",
                fontFamily: "var(--font-cormorant)",
                fontSize: "1.4rem",
                color: "#f6ecd9",
                fontWeight: 600,
                lineHeight: 1.15,
              }}
            >
              {product.name || `Order ${product.code}`}
            </h1>
            <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f3d68f", margin: 0 }}>
              ₹{product.price}
            </p>
            {typeof product.stock === "number" && (
              <p style={{ fontSize: "0.72rem", color: "#a8927b", margin: "0.15rem 0 0" }}>
                {product.stock} in stock
              </p>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2.5rem" }}>
          {["Photo", "Details", "Payment", "Confirm"].map((label, i) => {
            const active = step >= ((i + 1) as Step);
            return (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    margin: "0 auto 6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: active ? "1px solid #f3d68f" : "1px solid #d4af5a3d",
                    background: active ? "linear-gradient(135deg, #f3d68f, #d4af5a)" : "transparent",
                    color: active ? "#2c0810" : "#a8927b",
                    boxShadow: active ? "0 0 16px -4px #d4af5a99" : "none",
                    transition: "all 0.3s ease",
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    fontSize: "0.65rem",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: active ? "#f3d68f" : "#a8927b99",
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div
            style={{
              color: "#ffb0b0",
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              border: "1px solid #ff6b6b55",
              background: "#ff6b6b12",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        {/* ===== STEP 1: REFERENCE PHOTO ===== */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
             <h3
  style={{
    fontFamily: "var(--font-cormorant)",
    fontSize: "1.3rem",
    color: "#f6ecd9",
    margin: 0,
    fontWeight: 600,
  }}
>
   Upload LIVE Product/Color Photo
</h3>

<p
  style={{
    margin: "0.4rem 0 0",
    fontSize: "0.85rem",
    color: "#a8927b",
  }}
>
  Upload a screenshot or photo of the saree/suit color you saw during the LIVE.
  This helps us match the exact color and design correctly.
</p>
            </div>

            <label
              htmlFor="referencePhoto"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                padding: referencePhotoPreview ? "1rem" : "2.25rem 1rem",
                borderRadius: "0.75rem",
                border: `1.5px dashed ${referencePhotoPreview ? "#6fcf97" : "#d4af5a66"}`,
                backgroundColor: referencePhotoPreview ? "#6fcf9710" : "#00000033",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              {referencePhotoPreview ? (
                <>
                  <img
                    src={referencePhotoPreview}
                    alt="Reference photo preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "260px",
                      borderRadius: "0.5rem",
                      border: "1px solid #d4af5a3d",
                    }}
                  />
                  <p style={{ color: "#6fcf97", fontWeight: 600, margin: "0.3rem 0 0", fontSize: "0.88rem" }}>
                    ✓ Reference photo added — tap to change
                  </p>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #f3d68f, #d4af5a)",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"
                        stroke="#2c0810"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="13" r="3.5" stroke="#2c0810" strokeWidth="2" />
                    </svg>
                  </div>
                  <p style={{ margin: 0, color: "#f6ecd9", fontWeight: 600, fontSize: "0.95rem" }}>
                    Tap to choose photo
                  </p>
                  <p style={{ margin: 0, color: "#a8927b", fontSize: "0.78rem" }}>PNG or JPG · Reference taken from LIVE</p>
                </>
              )}
              <input
                id="referencePhoto"
                type="file"
                accept="image/*"
                onChange={handleReferencePhotoChange}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </label>

          {/* <button
  type="button"
  onClick={() => setStep(2)}
  disabled={!referencePhoto}
  style={{
    ...goldPrimaryBtn,
    opacity: referencePhoto ? 1 : 0.5,
    cursor: referencePhoto ? "pointer" : "not-allowed",
  }}
>
  {referencePhoto ? "Continue" : "Upload photo to continue"}
</button> */}

<button type="button" onClick={() => setStep(2)} style={goldPrimaryBtn}>
  {referencePhoto ? "Continue" : "Continue without photo"}
</button>
{/* bns */}
          </div>
        )}

        {/* ===== STEP 2: DETAILS ===== */}
        {step === 2 && phase === "mobile" && (
          <form onSubmit={handleMobileSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <h3
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "1.3rem",
                color: "#f6ecd9",
                margin: 0,
                marginBottom: "0.5rem",
                fontWeight: 600,
              }}
            >
              Mobile Number
            </h3>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10));
                if (mobileError) setMobileError("");
              }}
              required
              style={mobileError ? goldInputErrorStyle : goldInputStyle}
            />
            {mobileError && <p style={errorTextStyle}>{mobileError}</p>}
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={() => setStep(1)} style={goldSecondaryBtn}>
                BACK
              </button>
              <button
                type="submit"
                disabled={loading || !mobile.trim()}
                style={{ ...goldPrimaryBtn, flex: 1, opacity: loading || !mobile.trim() ? 0.6 : 1 }}
              >
                {loading ? "Checking..." : "Continue"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && phase === "existing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "1.3rem",
                color: "#f6ecd9",
                margin: 0,
                fontWeight: 600,
              }}
            >
              {existingName}
            </h3>
            <p style={{ color: "#6fcf97", fontWeight: 600, margin: 0 }}>Your details are already available.</p>
            <div style={{ padding: "1rem", borderRadius: "0.5rem", border: "1px solid #d4af5a3d", color: "#e8dccd" }}>
              <p style={{ margin: "0 0 0.5rem" }}>{existingAddress.address}</p>
                {existingAddress.landmark && (
    <p style={{ margin: "0 0 0.5rem", opacity: 0.85 }}>Landmark: {existingAddress.landmark}</p>
  )}
              <p style={{ margin: 0 }}>
  <p style={{ margin: 0 }}>
    {existingAddress.city}, {existingAddress.state} - {existingAddress.pincode}
  </p>              </p>
              <p style={{ margin: "0.5rem 0 0", opacity: 0.7 }}>📱 {mobile}</p>
            </div>
            <button onClick={handleUseThisAddress} style={goldPrimaryBtn}>
              USE THIS ADDRESS
            </button>
            <button onClick={handleChangeAddress} style={goldSecondaryBtn}>
              CHANGE ADDRESS
            </button>
          </div>
        )}

        {step === 2 && phase === "new" && (
          <form onSubmit={handleConfirmAddress} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} noValidate>
            <h3
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "1.3rem",
                color: "#f6ecd9",
                margin: 0,
                fontWeight: 600,
              }}
            >
              Customer Details
            </h3>

            <button
              type="button"
              onClick={handleUseLocation}
              disabled={locating}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px dashed #f3d68f",
                backgroundColor: "transparent",
                color: "#f3d68f",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {locating ? "Detecting your location..." : "📍 USE MY LOCATION"}
            </button>

            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="name" style={labelStyle}>Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={fieldErrors.name ? goldInputErrorStyle : goldInputStyle}
                />
                {fieldErrors.name && <p style={errorTextStyle}>{fieldErrors.name}</p>}
              </div>
              <div>
                <label htmlFor="mobile" style={labelStyle}>Mobile Number</label>
                <input id="mobile" type="tel" value={formData.mobile || mobile} disabled style={{ ...goldInputStyle, opacity: 0.6 }} />
              </div>
              <div>
                <label htmlFor="whatsapp" style={labelStyle}>WhatsApp (optional)</label>
                <input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, whatsapp: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }));
                    if (fieldErrors.whatsapp) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.whatsapp;
                        return next;
                      });
                    }
                  }}
                  style={fieldErrors.whatsapp ? goldInputErrorStyle : goldInputStyle}
                />
                {fieldErrors.whatsapp && <p style={errorTextStyle}>{fieldErrors.whatsapp}</p>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="address" style={labelStyle}>Address</label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={2}
                  style={fieldErrors.address ? goldInputErrorStyle : goldInputStyle}
                />
                {fieldErrors.address && <p style={errorTextStyle}>{fieldErrors.address}</p>}
              </div>

              {/* new */}
              <div style={{ gridColumn: "1 / -1" }}>
  <label htmlFor="landmark" style={labelStyle}>Landmark</label>
  <input
    id="landmark"
    type="text"
    placeholder="e.g. Near XYZ Temple / ABC School"
    value={formData.landmark}
    onChange={handleChange}
    style={goldInputStyle}
  />
</div>
              <div>
                <label htmlFor="city" style={labelStyle}>City</label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  style={fieldErrors.city ? goldInputErrorStyle : goldInputStyle}
                />
                {fieldErrors.city && <p style={errorTextStyle}>{fieldErrors.city}</p>}
              </div>
              <div>
                <label htmlFor="state" style={labelStyle}>State</label>
                <input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  style={fieldErrors.state ? goldInputErrorStyle : goldInputStyle}
                />
                {fieldErrors.state && <p style={errorTextStyle}>{fieldErrors.state}</p>}
              </div>
              <div>
                <label htmlFor="pincode" style={labelStyle}>Pincode</label>
                <input
                  id="pincode"
                  type="text"
                  inputMode="numeric"
                  value={formData.pincode}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, pincode: e.target.value.replace(/[^\d]/g, "").slice(0, 6) }));
                    if (fieldErrors.pincode) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.pincode;
                        return next;
                      });
                    }
                  }}
                  required
                  style={fieldErrors.pincode ? goldInputErrorStyle : goldInputStyle}
                />
                {fieldErrors.pincode && <p style={errorTextStyle}>{fieldErrors.pincode}</p>}
              </div>
            </div>

            <button type="submit" style={goldPrimaryBtn}>
              CONFIRM ADDRESS
            </button>
          </form>
        )}

        {/* ===== STEP 3: PAYMENT ===== */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                fontSize: "0.72rem",
                letterSpacing: "0.5px",
                color: "#a8927b",
              }}
            >
              🔒 Secure Payment
            </div>

            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "#f3d68f0d",
                border: "1px dashed #d4af5a",
                borderRadius: "0.5rem",
                textAlign: "center",
              }}
            >
              <p style={{ margin: "0 0 0.4rem", color: "#e8dccd", fontSize: "0.85rem" }}>Amount to Pay</p>
              <p style={{ fontSize: "1.9rem", fontWeight: 700, margin: 0, color: "#f3d68f" }}>₹{product.price}</p>
            </div>

            {/* ===== NEW: RAZORPAY — INSTANT PAYMENT (primary option) ===== */}
            <div
              style={{
                padding: "1.25rem",
                border: "1px solid #6fcf9755",
                borderRadius: "0.75rem",
                backgroundColor: "#6fcf970d",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={payMethodLabelStyle}>
                <span style={stepBadgeStyle}>⚡</span>
                Instant Payment — Recommended
              </div>

             <RazorpayPayButton
  productCode={product.code}
  amount={product.price}
  customerDetails={formData}
  referencePhoto={referencePhoto}
  onError={setError}
/>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#a8927b", textAlign: "center" }}>
                Order confirms automatically the moment payment succeeds — no screenshot needed.
              </p>
            </div>

            <div style={orDividerStyle}>
              <span style={orLineStyle} />
              OR PAY MANUALLY VIA UPI
              <span style={orLineStyle} />
            </div>

            <div
              style={{
                padding: "1.25rem",
                border: "1px solid #d4af5a3d",
                borderRadius: "0.75rem",
                backgroundColor: "#00000033",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={payMethodLabelStyle}>
                <span style={stepBadgeStyle}>1</span>
                Pay using any UPI app
              </div>

              
             <a   href={upiIntentLink}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem",
                  padding: "1.1rem 1rem",
                  borderRadius: "0.6rem",
                  border: "none",
                  background: "linear-gradient(135deg, #6fcf97, #4fae7a)",
                  color: "#08130c",
                  fontWeight: 700,
                  fontSize: "1rem",
                  textAlign: "center",
                  textDecoration: "none",
                  boxShadow: "0 8px 24px -8px #4fae7a80",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 3L4 14H11L10 21L20 9H13L13 3Z" fill="#08130c" />
                </svg>
                Pay ₹{product.price} Now
              </a>
              <p style={{ margin: "-0.4rem 0 0", fontSize: "0.75rem", color: "#a8927b", textAlign: "center" }}>
                Opens your UPI app — Google Pay, PhonePe, Paytm or BHIM
              </p>

              {qrCodeImageUrl && (
                <>
                  <div style={orDividerStyle}>
                    <span style={orLineStyle} />
                    OR SCAN QR
                    <span style={orLineStyle} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <img
                      src={qrCodeImageUrl}
                      alt="Merchant UPI QR"
                      style={{
                        width: "180px",
                        height: "180px",
                        objectFit: "contain",
                        border: "1px solid #d4af5a3d",
                        borderRadius: "0.5rem",
                        background: "#fff",
                        padding: "8px",
                      }}
                    />
                  </div>
                </>
              )}

              <div style={orDividerStyle}>
                <span style={orLineStyle} />
                OR PAY MANUALLY
                <span style={orLineStyle} />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  padding: "0.85rem 1rem",
                  border: "1px solid #d4af5a3d",
                  borderRadius: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p style={{ margin: "0 0 0.15rem", opacity: 0.7, fontSize: "0.72rem", color: "#e8dccd" }}>UPI ID</p>
                  <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "#f6ecd9" }}>{upiId}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  style={{
                    padding: "0.55rem 0.9rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #d4af5a3d",
                    backgroundColor: "transparent",
                    color: "#f3d68f",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.9rem 1rem",
                border: `1px solid ${paymentConfirmed ? "#6fcf97" : "#d4af5a3d"}`,
                borderRadius: "0.5rem",
                backgroundColor: paymentConfirmed ? "#6fcf9714" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={paymentConfirmed}
                onChange={(e) => setPaymentConfirmed(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#4fae7a", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.88rem", color: "#f6ecd9", fontWeight: 500 }}>
                I have successfully completed the payment of ₹{product.price} manually via UPI
              </span>
            </label>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="button" onClick={() => setStep(2)} style={goldSecondaryBtn}>
                BACK
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!paymentConfirmed}
                style={{
                  ...goldPrimaryBtn,
                  flex: 1,
                  opacity: paymentConfirmed ? 1 : 0.5,
                  cursor: paymentConfirmed ? "pointer" : "not-allowed",
                }}
              >
                Continue to Confirm →
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 4: SCREENSHOT & CONFIRM (manual UPI only) ===== */}
        {step === 4 && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "#f6ecd9",
                  fontWeight: 600,
                }}
              >
                Confirm Your Order
              </h3>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "#a8927b" }}>
                Upload the screenshot showing your successful payment of ₹{product.price}.
              </p>
            </div>

            <label
              htmlFor="screenshot"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                padding: screenshotPreview ? "1rem" : "2.25rem 1rem",
                borderRadius: "0.75rem",
                border: `1.5px dashed ${screenshotPreview ? "#6fcf97" : "#d4af5a66"}`,
                backgroundColor: screenshotPreview ? "#6fcf9710" : "#00000033",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              {screenshotPreview ? (
                <>
                  <img
                    src={screenshotPreview}
                    alt="Payment screenshot preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "280px",
                      borderRadius: "0.5rem",
                      border: "1px solid #d4af5a3d",
                    }}
                  />
                  <p style={{ color: "#6fcf97", fontWeight: 600, margin: "0.3rem 0 0", fontSize: "0.88rem" }}>
                    ✓ Screenshot added — tap to change
                  </p>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #f3d68f, #d4af5a)",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 16V4M12 4L7 9M12 4L17 9"
                        stroke="#2c0810"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16"
                        stroke="#2c0810"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p style={{ margin: 0, color: "#f6ecd9", fontWeight: 600, fontSize: "0.95rem" }}>
                    Tap to choose screenshot
                  </p>
                  <p style={{ margin: 0, color: "#a8927b", fontSize: "0.78rem" }}>PNG or JPG · payment confirmation page</p>
                </>
              )}
              <input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                required
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </label>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="button" onClick={() => setStep(3)} style={goldSecondaryBtn}>
                BACK
              </button>
              <button
                type="submit"
                disabled={submitting || !screenshot}
                style={{
                  flex: 1,
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "linear-gradient(135deg, #6fcf97, #4fae7a)",
                  color: "#08130c",
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: submitting || !screenshot ? 0.6 : 1,
                }}
              >
                {submitting ? "SUBMITTING..." : "CONFIRM ORDER"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
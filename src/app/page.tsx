"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cormorant_Garamond, Jost } from "next/font/google";
import Navbar from "../component/Navbar";

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

const VIDEOS = ["/v.mp4", "/v1.mp4", "/v2.mp4", "/v5.mp4"];

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

  const [activeVideo, setActiveVideo] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVideo((i) => (i + 1) % VIDEOS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

const [embers, setEmbers] = useState<{ left: number; size: number; drift: number; duration: number; delay: number }[]>([]);
  useEffect(() => {
    setEmbers(
      Array.from({ length: 12 }).map(() => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 2.5,
        drift: Math.random() * 70 - 35,
        duration: 9 + Math.random() * 10,
        delay: Math.random() * 10,
      }))
    );
  }, []);

  return (
    <div
      className={`${cormorant.variable} ${jost.variable} relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0304] py-6 font-jost text-cream`}
    >
      <Navbar />

      {/* Video background stack */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {VIDEOS.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 opacity-0 transition-opacity duration-[1100ms] ease-in-out ${
              i === activeVideo ? "z-[1] opacity-100" : ""
            }`}
          >
            <video
              src={src}
              autoPlay
              muted
              loop
              playsInline
              className="absolute left-1/2 top-1/2 h-auto min-h-full w-auto min-w-full -translate-x-1/2 -translate-y-1/2 scale-105 object-cover [filter:saturate(1.2)_contrast(1.08)_brightness(1)]"
            />
          </div>
        ))}
      </div>

      {/* Scrim overlay */}
      <div className="absolute inset-0 z-[1] [background:linear-gradient(100deg,#0a0304f0_0%,#0a0304cc_26%,#0a030466_42%,transparent_62%),linear-gradient(0deg,#0a0304aa_0%,transparent_20%,transparent_78%,#0a0304cc_100%),linear-gradient(340deg,#4a0e1c33,transparent_50%)]" />

      {/* Spotlight */}
      <div className="pointer-events-none absolute inset-0 z-[2] animate-spot-move [background:radial-gradient(420px_620px_at_var(--sx,70%)_40%,#f3d68f1c,transparent_65%)]" />

      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 z-[3] opacity-[0.045] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Embers */}
      {embers.map((em, i) => (
        <div
          key={i}
          className="absolute bottom-[-10px] z-[2] animate-rise rounded-full opacity-0 shadow-[0_0_6px_1px_#f3d68f77] [background:radial-gradient(circle,#f3d68f,#d4af5a_60%,transparent_72%)]"
          style={
            {
              left: `${em.left}vw`,
              width: em.size,
              height: em.size,
              "--drift": `${em.drift}px`,
              animationDuration: `${em.duration}s`,
              animationDelay: `${em.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Card */}
      <div className="relative z-[6] mt-14 animate-card-in">
        <div className="relative w-[400px] max-w-[90vw] rounded border border-[#d4af5a3d] px-6 py-[26px] backdrop-blur-[10px] backdrop-saturate-[1.1] [background:linear-gradient(180deg,#150609e6,#0d0407f2)] [box-shadow:0_40px_90px_-20px_#000000f0,0_0_0_1px_#00000080,0_0_60px_-18px_#d4af5a44] before:pointer-events-none before:absolute before:inset-[9px] before:border before:border-[#d4af5a2e] before:content-[''] sm:px-[34px] sm:py-[30px]">
          <div className="mb-2.5 flex items-center justify-center gap-3 before:h-px before:w-[22px] before:[background:linear-gradient(90deg,transparent,#d4af5a)] before:content-[''] after:h-px after:w-[22px] after:[background:linear-gradient(90deg,#d4af5a,transparent)] after:content-['']">
            <span className="text-[10px] uppercase tracking-[3.5px] text-gold-bright">Exclusive</span>
          </div>

          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="relative h-[9px] w-[9px]">
              <div className="absolute inset-0 animate-ping-slow rounded-full bg-coral" />
              <div className="absolute inset-0 rounded-full bg-coral shadow-[0_0_10px_2px_#ff6b6b55]" />
            </div>
            <h1 className="m-0 bg-[linear-gradient(180deg,#fff,#f3d68f_60%,#d4af5a)] bg-clip-text font-cormorant text-[22px] font-semibold tracking-[1px] text-transparent [text-shadow:0_0_30px_#d4af5a44]">
              Live Sale
            </h1>
          </div>

          <p className="mb-[22px] text-center text-[13.5px] font-light leading-[1.6] text-[#e8dccdcc]">
            Watching us on Instagram/Facebook?
            <br />
            Enter the Product Code shown during the LIVE to
            <br />
            check availability and place your order.
          </p>

          <form onSubmit={checkAvailability}>
            <label
              htmlFor="productCode"
              className="mb-[9px] block text-[11px] font-medium uppercase tracking-[2.5px] text-gold-bright"
            >
              Product Code
            </label>
            <div className="mb-5">
              <input
                id="productCode"
                type="text"
                placeholder="E.G. SR101"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full rounded-sm border border-[#d4af5a3d] bg-[#000000a0] px-4 py-[15px] font-sans text-base font-medium tracking-[0.5px] text-cream outline-none transition-[border-color,box-shadow] duration-[250ms] ease placeholder:font-light placeholder:text-[#a8927b] focus:border-gold-bright focus:shadow-[0_0_0_3px_#d4af5a30,0_0_22px_-6px_#d4af5a66]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code}
              className="relative w-full overflow-hidden rounded-sm border border-gold bg-transparent p-4 text-[12.5px] font-semibold uppercase tracking-[3px] text-gold-bright transition-[color,opacity] duration-[350ms] ease-[cubic-bezier(0.65,0,0.35,1)] before:absolute before:inset-0 before:origin-left before:scale-x-0 before:bg-[linear-gradient(135deg,#f3d68f,#d4af5a)] before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.65,0,0.35,1)] before:content-[''] disabled:cursor-not-allowed disabled:opacity-50 [&:not(:disabled):hover]:text-[#2c0810] [&:not(:disabled):hover::before]:scale-x-100"
            >
              <span className="relative z-[2] inline-flex items-center gap-2">
                {loading && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#f3d68f55] border-t-gold-bright" />
                )}
                <span>{loading ? "Checking…" : "Check Availability"}</span>
              </span>
            </button>
          </form>

          {error && (
            <div className="mt-3.5 rounded-sm border border-[#ff6b6b55] bg-[#ff6b6b12] px-3.5 py-2.5 text-center text-[12.5px] text-[#ffb0b0]">
              {error}
            </div>
          )}

          {status === "AVAILABLE" && product && (
            <div className="mt-[22px] rounded-sm border border-[#6fcf9744] bg-[#6fcf9710] p-5 text-center">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.code}
                  className="mb-3 h-[200px] w-full rounded object-cover"
                />
              )}
              <h2 className="mb-1.5 font-cormorant text-[22px] font-semibold text-gold-bright">
                {product.code}
              </h2>
              <p className="mb-2.5 text-lg font-semibold text-cream">₹{product.price}</p>
              <p className="mb-3.5 text-xs font-semibold tracking-wide text-success">● Available</p>
              <button
                onClick={handleOrder}
                className="w-full rounded-sm border-0 bg-[linear-gradient(135deg,#f3d68f,#d4af5a)] py-3.5 text-[12.5px] font-bold uppercase tracking-[2px] text-[#2c0810]"
              >
                Order Now
              </button>
            </div>
          )}

          {status === "SOLD_OUT" && product && (
            <div className="mt-[22px] rounded-sm border border-[#ff6b6b55] bg-[#ff6b6b0d] p-5 text-center">
              <h2 className="mb-1.5 font-cormorant text-[22px] font-semibold text-gold-bright">
                {product.code}
              </h2>
              <p className="mb-3.5 text-xs font-semibold tracking-wide text-coral">● Sold Out</p>
              <p className="text-xs text-[#e8dccdaa]">Sorry, this product is no longer available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
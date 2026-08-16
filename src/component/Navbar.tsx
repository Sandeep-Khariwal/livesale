"use client";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
      {/* Pure glass - no color tint, sirf blur */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 h-full backdrop-blur-xl backdrop-saturate-150 [mask-image:linear-gradient(180deg,black_0%,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(180deg,black_0%,black_60%,transparent_100%)]"
      />

      <img
        src="/logo-Radhika_Fashion-removebg-preview.png"
        alt="Radhika Sarees & More"
        className="h-14 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] sm:h-16 md:h-20"
      />

      <div className="flex items-center gap-2 sm:gap-5">
        
       {/* <a    href="/track"
          className="whitespace-nowrap rounded-sm border border-[#d4af5a3d] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.8px] text-[#f6ecd9] transition-all duration-200 ease-in-out hover:border-[#f3d68f] hover:bg-[#d4af5a14] hover:text-[#f3d68f] sm:px-3.5 sm:py-2 sm:text-[12px] sm:tracking-[1.5px]"
        >
          Track Order
        </a> */}

        
<a href="https://wa.me/91XXXXXXXXXX"
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap rounded-sm border border-[#6fcf9755] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.8px] text-[#6fcf97] transition-all duration-200 ease-in-out hover:border-[#6fcf97] hover:bg-[#6fcf9714] sm:px-3.5 sm:py-2 sm:text-[12px] sm:tracking-[1.5px]"
        >
          💬 WhatsApp
        </a>
      </div>
    </nav>
  );
}
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";

// interface RazorpayPayButtonProps {
//   productCode: string;
//   amount: number;
//   customerDetails: {
//     name?: string;
//     mobile?: string;
//     whatsapp?: string;
//     address?: string;
//     city?: string;
//     state?: string;
//     pincode?: string;
//   };
//   referencePhoto: File | null;
//   onError: (message: string) => void;
// }

// export default function RazorpayPayButton({
//   productCode,
//   amount,
//   customerDetails,
//   referencePhoto,
//   onError,
// }: RazorpayPayButtonProps) {
//   const router = useRouter();

//   const [payingOnline, setPayingOnline] = useState(false);
//   const [scriptLoaded, setScriptLoaded] = useState(false);

//   useEffect(() => {
//     // Avoid loading Razorpay script multiple times
//     if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
//       setScriptLoaded(true);
//       return;
//     }

//     const script = document.createElement("script");
//     script.src = "https://checkout.razorpay.com/v1/checkout.js";
//     script.async = true;

//     script.onload = () => {
//       setScriptLoaded(true);
//     };

//     script.onerror = () => {
//       setScriptLoaded(false);
//       onError("Razorpay load nahi ho paya. Page refresh karke dobara try karein.");
//     };

//     document.body.appendChild(script);

//     return () => {
//       // Don't remove the global Razorpay script on component unmount
//     };
//   }, [onError]);

//   const handleRazorpayPayment = async () => {
//     onError("");

//     // IMPORTANT:
//     // Customer details are coming from customerDetails/formData
//     const customerName = customerDetails?.name?.trim() || "";
//     const customerMobile = customerDetails?.mobile?.trim() || "";
//     const customerAddress = customerDetails?.address?.trim() || "";
//     const customerCity = customerDetails?.city?.trim() || "";
//     const customerState = customerDetails?.state?.trim() || "";
//     const customerPincode = customerDetails?.pincode?.trim() || "";

//     // Validate customer details
//     if (!customerName) {
//       onError("Kripya apna naam bharein.");
//       return;
//     }

//     if (!customerMobile) {
//       onError("Kripya apna mobile number bharein.");
//       return;
//     }

//     if (!/^[6-9]\d{9}$/.test(customerMobile)) {
//       onError("Kripya valid 10-digit mobile number bharein.");
//       return;
//     }

//     // Backend /create route ab shipping address bhi upfront maangta hai
//     // (ShippingAddress ke required fields), isliye yahin validate kar lo.
//     if (!customerAddress || !customerCity || !customerState || !customerPincode) {
//       onError("Kripya poora shipping address (address, city, state, pincode) bharein.");
//       return;
//     }

//     if (!/^\d{6}$/.test(customerPincode)) {
//       onError("Kripya valid 6-digit pincode bharein.");
//       return;
//     }

//     if (!scriptLoaded || !(window as any).Razorpay) {
//       onError("Razorpay abhi load ho raha hai. Please thoda wait karke dobara try karein.");
//       return;
//     }

//     setPayingOnline(true);

//     try {
//       // -----------------------------------------
//       // 1. CREATE RAZORPAY ORDER
//       // (ab customerDetails bhi bheja jaata hai, kyunki backend
//       //  Order/Payment/ShippingAddress payment se PEHLE hi banata hai)
//       // -----------------------------------------
//       const orderRes = await fetch("/api/orders/razorpay/create", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           productCode,
//           customerDetails: {
//             ...customerDetails,
//             name: customerName,
//             mobile: customerMobile,
//             address: customerAddress,
//             city: customerCity,
//             state: customerState,
//             pincode: customerPincode,
//           },
//         }),
//       });

//       const orderData = await orderRes.json();

//       if (!orderRes.ok) {
//         onError(orderData.error || "Payment start nahi ho paya.");
//         setPayingOnline(false);
//         return;
//       }

//       // -----------------------------------------
//       // 2. OPEN RAZORPAY
//       // -----------------------------------------
//       const options = {
//         key: orderData.keyId,
//         amount: orderData.amount,
//         currency: orderData.currency || "INR",

//         name: "Radhika Sarees & More",
//         description: `Order for ${productCode}`,

//         order_id: orderData.razorpayOrderId,

//         prefill: {
//           name: customerName,
//           contact: customerMobile,
//         },

//         theme: {
//           color: "#d4af5a",
//         },

//         handler: async (response: any) => {
//           try {
//             // -----------------------------------------
//             // 3. VERIFY PAYMENT
//             // -----------------------------------------
//             const verifyFormData = new FormData();

//             verifyFormData.append(
//               "razorpay_order_id",
//               response.razorpay_order_id
//             );

//             verifyFormData.append(
//               "razorpay_payment_id",
//               response.razorpay_payment_id
//             );

//             verifyFormData.append(
//               "razorpay_signature",
//               response.razorpay_signature
//             );

//             verifyFormData.append(
//               "productCode",
//               productCode
//             );

//             verifyFormData.append(
//               "customerDetails",
//               JSON.stringify({
//                 ...customerDetails,
//                 name: customerName,
//                 mobile: customerMobile,
//                 address: customerAddress,
//                 city: customerCity,
//                 state: customerState,
//                 pincode: customerPincode,
//               })
//             );

//             if (referencePhoto) {
//               verifyFormData.append(
//                 "referencePhoto",
//                 referencePhoto
//               );
//             }

//             const verifyRes = await fetch(
//               "/api/orders/razorpay/verify",
//               {
//                 method: "POST",
//                 body: verifyFormData,
//               }
//             );

//             const verifyData = await verifyRes.json();

//             if (!verifyRes.ok) {
//               onError(
//                 verifyData.error ||
//                   "Payment ho gaya, lekin order confirm nahi ho paya."
//               );

//               setPayingOnline(false);
//               return;
//             }

//             // -----------------------------------------
//             // 4. SUCCESS
//             // -----------------------------------------
//             router.push(
//               `/order/success?orderNumber=${encodeURIComponent(
//                 verifyData.orderNumber
//               )}&confirmed=true`
//             );
//           } catch (error) {
//             console.error("Razorpay verification error:", error);

//             onError(
//               "Payment ho gaya, lekin order confirm nahi ho paya. Support se contact karein."
//             );

//             setPayingOnline(false);
//           }
//         },

//         modal: {
//           ondismiss: async () => {
//             // Customer closed the Razorpay popup without paying.
//             // Stock was already reserved when the Razorpay order was
//             // created, so we must release it here — otherwise stock
//             // stays locked forever even though no payment happened.
//             try {
//               await fetch("/api/orders/razorpay/cancel", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ razorpayOrderId: orderData.razorpayOrderId }),
//               });
//             } catch (err) {
//               console.error("Failed to release stock on cancel:", err);
//             } finally {
//               setPayingOnline(false);
//             }
//           },
//         },
//       };

//       const Razorpay = (window as any).Razorpay;

//       const rzp = new Razorpay(options);

//       rzp.on("payment.failed", (response: any) => {
//         console.error("Razorpay payment failed:", response);

//         onError(
//           response?.error?.description ||
//             "Payment failed. Dobara try karein."
//         );

//         setPayingOnline(false);
//       });

//       rzp.open();
//     } catch (error) {
//       console.error("Razorpay error:", error);

//       onError(
//         "Payment start nahi ho paya. Dobara try karein."
//       );

//       setPayingOnline(false);
//     }
//   };

//   return (
//     <button
//       type="button"
//       onClick={handleRazorpayPayment}
//       disabled={payingOnline || !scriptLoaded}
//       style={{
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         gap: "0.6rem",
//         padding: "1.1rem 1rem",
//         borderRadius: "0.6rem",
//         border: "none",
//         background:
//           "linear-gradient(135deg, #f3d68f, #d4af5a)",
//         color: "#2c0810",
//         fontWeight: 700,
//         fontSize: "1rem",
//         cursor:
//           payingOnline || !scriptLoaded
//             ? "not-allowed"
//             : "pointer",
//         opacity:
//           payingOnline || !scriptLoaded ? 0.7 : 1,
//         boxShadow:
//           "0 8px 24px -8px #d4af5a80",
//         width: "100%",
//       }}
//     >
//       {!scriptLoaded
//         ? "Loading Payment..."
//         : payingOnline
//         ? "Processing..."
//         : `💳 Pay Online ₹${amount}`}
//     </button>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface RazorpayPayButtonProps {
  productCode: string;
  amount: number;
  customerDetails: {
    name?: string;
    mobile?: string;
    whatsapp?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  referencePhoto: File | null;
  onError: (message: string) => void;
}

export default function RazorpayPayButton({
  productCode,
  amount,
  customerDetails,
  referencePhoto,
  onError,
}: RazorpayPayButtonProps) {
  const router = useRouter();

  const [payingOnline, setPayingOnline] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      setScriptLoaded(true);
    };

    script.onerror = () => {
      setScriptLoaded(false);
      onError("Razorpay load nahi ho paya. Page refresh karke dobara try karein.");
    };

    document.body.appendChild(script);

    return () => {
      // Don't remove the global Razorpay script on component unmount
    };
  }, [onError]);

  const handleRazorpayPayment = async () => {
    onError("");

    const customerName = customerDetails?.name?.trim() || "";
    const customerMobile = customerDetails?.mobile?.trim() || "";
    const customerAddress = customerDetails?.address?.trim() || "";
    const customerCity = customerDetails?.city?.trim() || "";
    const customerState = customerDetails?.state?.trim() || "";
    const customerPincode = customerDetails?.pincode?.trim() || "";

    if (!customerName) {
      onError("Kripya apna naam bharein.");
      return;
    }

    if (!customerMobile) {
      onError("Kripya apna mobile number bharein.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(customerMobile)) {
      onError("Kripya valid 10-digit mobile number bharein.");
      return;
    }

    if (!customerAddress || !customerCity || !customerState || !customerPincode) {
      onError("Kripya poora shipping address (address, city, state, pincode) bharein.");
      return;
    }

    if (!/^\d{6}$/.test(customerPincode)) {
      onError("Kripya valid 6-digit pincode bharein.");
      return;
    }

    if (!scriptLoaded || !(window as any).Razorpay) {
      onError("Razorpay abhi load ho raha hai. Please thoda wait karke dobara try karein.");
      return;
    }

    setPayingOnline(true);

    try {
      // 1. CREATE RAZORPAY ORDER
      const orderRes = await fetch("/api/orders/razorpay/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productCode,
          customerDetails: {
            ...customerDetails,
            name: customerName,
            mobile: customerMobile,
            address: customerAddress,
            city: customerCity,
            state: customerState,
            pincode: customerPincode,
          },
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        onError(orderData.error || "Payment start nahi ho paya.");
        setPayingOnline(false);
        return;
      }

      // 2. OPEN RAZORPAY
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",

        name: "Radhika Sarees & More",
        description: `Order for ${productCode}`,

        order_id: orderData.razorpayOrderId,

        prefill: {
          name: customerName,
          contact: customerMobile,
        },

        theme: {
          color: "#d4af5a",
        },

        handler: async (response: any) => {
          try {
            // 3. VERIFY PAYMENT
            const verifyFormData = new FormData();

            verifyFormData.append("razorpay_order_id", response.razorpay_order_id);
            verifyFormData.append("razorpay_payment_id", response.razorpay_payment_id);
            verifyFormData.append("razorpay_signature", response.razorpay_signature);
            verifyFormData.append("productCode", productCode);

            verifyFormData.append(
              "customerDetails",
              JSON.stringify({
                ...customerDetails,
                name: customerName,
                mobile: customerMobile,
                address: customerAddress,
                city: customerCity,
                state: customerState,
                pincode: customerPincode,
              })
            );

            if (referencePhoto) {
              verifyFormData.append("referencePhoto", referencePhoto);
            }

            const verifyRes = await fetch("/api/orders/razorpay/verify", {
              method: "POST",
              body: verifyFormData,
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              onError(
                verifyData.error || "Payment ho gaya, lekin order confirm nahi ho paya."
              );
              setPayingOnline(false);
              return;
            }

            // 4. SUCCESS
            router.push(
              `/order/success?orderNumber=${encodeURIComponent(verifyData.orderNumber)}&confirmed=true`
            );
          } catch (error) {
            console.error("Razorpay verification error:", error);
            onError(
              "Payment ho gaya, lekin order confirm nahi ho paya. Support se contact karein."
            );
            setPayingOnline(false);
          }
        },

        modal: {
          ondismiss: async () => {
            // Customer closed the Razorpay popup THEMSELVES, without any
            // decline happening. Marked as CANCELLED (see /cancel route),
            // NOT rejected — nobody declined anything, they just backed out.
            try {
              await fetch("/api/orders/razorpay/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ razorpayOrderId: orderData.razorpayOrderId }),
              });
            } catch (err) {
              console.error("Failed to release stock on cancel:", err);
            } finally {
              setPayingOnline(false);
            }
          },
        },
      };

      const Razorpay = (window as any).Razorpay;
      const rzp = new Razorpay(options);

      rzp.on("payment.failed", async (response: any) => {
        console.error("Razorpay payment failed:", response);

        // This IS an actual decline from the bank/gateway — mark it as
        // REJECTED. Different from modal.ondismiss above, which just means
        // the customer closed the popup without any decline happening.
        try {
          await fetch("/api/orders/razorpay/fail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: orderData.razorpayOrderId,
              reason: response?.error?.description || "Payment declined",
            }),
          });
        } catch (err) {
          console.error("Failed to mark payment as rejected:", err);
        }

        onError(response?.error?.description || "Payment failed. Dobara try karein.");
        setPayingOnline(false);
      });

      rzp.open();
    } catch (error) {
      console.error("Razorpay error:", error);
      onError("Payment start nahi ho paya. Dobara try karein.");
      setPayingOnline(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRazorpayPayment}
      disabled={payingOnline || !scriptLoaded}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        padding: "1.1rem 1rem",
        borderRadius: "0.6rem",
        border: "none",
        background: "linear-gradient(135deg, #f3d68f, #d4af5a)",
        color: "#2c0810",
        fontWeight: 700,
        fontSize: "1rem",
        cursor: payingOnline || !scriptLoaded ? "not-allowed" : "pointer",
        opacity: payingOnline || !scriptLoaded ? 0.7 : 1,
        boxShadow: "0 8px 24px -8px #d4af5a80",
        width: "100%",
      }}
    >
      {!scriptLoaded
        ? "Loading Payment..."
        : payingOnline
        ? "Processing..."
        : `💳 Pay Online ₹${amount}`}
    </button>
  );
}
"use client";

import { useEffect, useState } from "react";

export default function ConfirmPage() {
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [buyerId, setBuyerId] = useState<string | null>(null);

  useEffect(() => {
    setPaymentId(localStorage.getItem("payment_id"));
    setBuyerId(localStorage.getItem("user_id"));
  }, []);

  async function handleConfirm() {
    if (!paymentId || !buyerId) {
      alert("Missing payment or user info.");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/confirm-purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, buyer_id: buyerId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirm failed");

      alert("Purchase confirmed!");
    } catch (err) {
      console.error("Confirm error:", err);
      alert("Error confirming purchase");
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Confirm Purchase</h1>
      <button
        onClick={handleConfirm}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow"
      >
        Confirm Purchase
      </button>
    </div>
  );
}

"use client";

export default function ConfirmPage() {
  async function handleConfirm() {
    await fetch("http://localhost:5000/confirm-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: "payment_id_here", buyerId: "user123" }),
    });
    alert("Purchase confirmed");
  }

  return (
    <div className="p-8">
      <h1>Confirm Purchase</h1>
      <button onClick={handleConfirm} className="bg-green-500 text-white px-4 py-2 rounded">
        Confirm Purchase
      </button>
    </div>
  );
}

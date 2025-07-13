// pages/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [payments, setPayments] = useState<any[]>([]);
  const userId = typeof window !== 'undefined' ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:5000/payments/${userId}`)
      .then((res) => res.json())
      .then(setPayments);
  }, [userId]);

  async function handleAutoRelease() {
    const res = await fetch("http://localhost:5000/auto-release", {
      method: "POST",
    });
    const result = await res.json();
    alert(result.message || "Auto-release complete");
  }

  async function confirmPurchase(paymentId: string) {
    await fetch("http://localhost:5000/confirm-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, buyerId: userId }),
    });
    alert("Purchase confirmed");
  }

  async function reportSeller(paymentId: string) {
    const reason = prompt("Why are you reporting this seller?");
    if (!reason) return;

    await fetch("http://localhost:5000/report-seller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, buyerId: userId, reason }),
    });
    alert("Seller reported");
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">My Payments</h1>
      <button
        className="mb-4 bg-purple-600 text-white px-4 py-2 rounded"
        onClick={handleAutoRelease}
      >
        Run Auto-Release
      </button>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2">Payment ID</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created At</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.id}</td>
                <td className="px-4 py-2">${(p.total_amount / 100).toFixed(2)}</td>
                <td className="px-4 py-2">{p.status}</td>
                <td className="px-4 py-2">{new Date(p.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 space-x-2">
                  {p.status === 'paid' && (
                    <>
                      <button
                        onClick={() => confirmPurchase(p.id)}
                        className="bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => reportSeller(p.id)}
                        className="bg-red-600 text-white px-2 py-1 rounded"
                      >
                        Report
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!payments.length && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  No payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

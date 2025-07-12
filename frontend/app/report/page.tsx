"use client";

import { useState } from "react";

export default function ReportPage() {
  const [reason, setReason] = useState("");

  async function report() {
    await fetch("http://localhost:5000/report-seller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: "payment_id_here", buyerId: "user123", reason }),
    });
    alert("Seller reported");
  }

  return (
    <div className="p-8">
      <h1>Report Seller</h1>
      <textarea
        className="border p-2 w-full"
        placeholder="Describe the issue..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button onClick={report} className="mt-2 bg-red-600 text-white px-4 py-2 rounded">
        Submit Report
      </button>
    </div>
  );
}

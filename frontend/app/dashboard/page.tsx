"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";

interface Payment {
  payment_id: string;
  total_amount: number;
  status: string;
  // add other fields you expect to receive
}

export default function DashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const userId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (!userId) return;

    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/${userId}`)
      .then((res) => setPayments(res.data))
      .catch((err) => console.error("Failed to load payments:", err));
  }, [userId]);

  const handleConfirm = async (payment_id: string) => {
    if (!payment_id || !userId) {
      alert("Missing payment ID or user ID");
      return;
    }

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/confirm-purchase`,
        { payment_id, buyer_id: userId }
      );
      alert("Purchase confirmed");
      window.location.reload();
    } catch (err) {
      console.error("Confirm API error:", err);
      alert("Failed to confirm purchase");
    }
  };

  const handleReport = async (payment_id: string) => {
    if (!userId) {
      alert("User not logged in");
      return;
    }
  
    const reason = prompt("Enter report reason:");
    if (!reason) return;
  
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/report-seller`,
        { payment_id, original_owner_id: userId, reason }
      );
      alert("Reported successfully");
      window.location.reload();
    } catch (error) {
      console.error("Report API error:", error);
      alert("Failed to report seller");
    }
  };
  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-6">Your Payments</h1>
      {payments.length === 0 && <p>No payments found.</p>}
      {payments.map((p) => (
        <div key={p.payment_id} className="border p-4 rounded-lg shadow mb-4">
          <p className="font-semibold">Amount: ${p.total_amount}</p>
          <p>Status: {p.status}</p>
          {p.status === "initiated" && (
            <div className="space-x-2 mt-2">
              <Button
                onClick={() => handleConfirm(p.payment_id)}
                className="bg-green-500 hover:bg-green-600"
              >
                Confirm Purchase
              </Button>
              <Button
                onClick={() => handleReport(p.payment_id)}
                variant="destructive"
              >
                Report Seller
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

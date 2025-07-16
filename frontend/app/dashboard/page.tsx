"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Payment {
  payment_id: string;
  total_amount: number;
  status: string;
}

export default function DashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportPaymentId, setReportPaymentId] = useState<string | null>(null);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (!userId) return;

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/${userId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load payments");
        return res.json();
      })
      .then((data) => setPayments(data))
      .catch((err) => console.error("Failed to load payments:", err));
  }, [userId]);

  const handleConfirm = async (payment_id: string) => {
    if (!payment_id || !userId) {
      alert("Missing payment ID or user ID");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/confirm-purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_id, buyer_id: userId }),
        }
      );

      if (!res.ok) throw new Error("Failed to confirm purchase");

      alert("Purchase confirmed");
      window.location.reload();
    } catch (err) {
      console.error("Confirm API error:", err);
      alert("Failed to confirm purchase");
    }
  };

  const handleOpenReport = (payment_id: string) => {
    setReportPaymentId(payment_id);
    setReportReason("");
    setReportDialogOpen(true);
  };

  const submitReport = async () => {
    if (!userId || !reportPaymentId || !reportReason.trim()) {
      alert("Please enter a report reason");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/report-seller`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_id: reportPaymentId,
            original_owner_id: userId,
            reason: reportReason,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to report seller");

      setReportDialogOpen(false);
      alert("Reported successfully");
      setTimeout(() => window.location.reload(), 1000);
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
              <Button onClick={() => handleOpenReport(p.payment_id)} variant="destructive">
                Report Seller
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Seller</DialogTitle>
            <DialogDescription>
              Explain why you are reporting this seller.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="mt-4"
            placeholder="Enter reason..."
            value={reportReason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setReportReason(e.target.value)
            }
          />
          <DialogFooter className="mt-4">
            <Button onClick={submitReport} disabled={!reportReason.trim()}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

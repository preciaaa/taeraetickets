'use client';

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
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from 'react';

interface Payment {
  payment_id: string;
  total_amount: number;
  status: string;
}

export default function profilePage() {
  const router = useRouter();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Dashboard-related states
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportPaymentId, setReportPaymentId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const initialise = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }

      const uid = session.user?.id;
      setUserId(uid);

      try {
        const res = await fetch(`http://localhost:5000/users/${uid}`);
        const data = await res.json();
        setVerified(data.verified);
        setStripeConnected(!!data.stripe_account_id);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
        setVerified(false);
        setStripeConnected(false);
      }

      setLoading(false);
    };

    initialise();
  }, [router]);

  // Fetch payments after userId is set
  useEffect(() => {
    if (!userId) return;
    setPaymentsLoading(true);
    setPaymentsError(null);

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/${userId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load payments");
        return res.json();
      })
      .then((data) => setPayments(data))
      .catch((err) => {
        console.error("Failed to load payments:", err);
        setPaymentsError("Failed to load payments");
      })
      .finally(() => setPaymentsLoading(false));
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user_id');
    router.push("/auth/login");
  };

  const handleVerification = async () => {
    router.push("/verification");
  };

  const handleCheckStripe = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`http://localhost:5000/users/${userId}`);
      const data = await res.json();

      if (!data.stripe_account_id) {
        router.push("/onboard");
      } else {
        alert("Stripe account already connected.");
        setStripeConnected(true);
      }
    } catch (err) {
      console.error("Failed to check Stripe account:", err);
      alert("An error occurred while checking Stripe account.");
    }
  };

  const handleConfirm = useCallback(async (payment_id: string) => {
    if (!payment_id || !userId) {
      alert("Missing payment ID or user ID");
      return;
    }

    setConfirmingId(payment_id);
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
    } finally {
      setConfirmingId(null);
    }
  }, [userId]);

  const handleOpenReport = useCallback((payment_id: string) => {
    setReportPaymentId(payment_id);
    setReportReason("");
    setReportDialogOpen(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!userId || !reportPaymentId || !reportReason.trim()) {
      alert("Please enter a report reason");
      return;
    }

    setReporting(true);
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
    } finally {
      setReporting(false);
    }
  }, [userId, reportPaymentId, reportReason]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-10">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-semibold text-center">Your Profile</h1>

        <div className="text-center space-y-2">
          <p className="text-gray-700">
            Verification Status:{" "}
            <span className={verified ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {verified ? "Verified" : "Not Verified"}
            </span>
          </p>

          <p className="text-gray-700">
            Stripe Account:{" "}
            <span className={stripeConnected ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {stripeConnected ? "Created" : "Not Created"}
            </span>
          </p>
        </div>

        {!stripeConnected && (
          <div className="text-center">
            <Button onClick={handleCheckStripe} className="w-full">
              Connect Stripe Account
            </Button>
          </div>
        )}

        <div className="text-center">
          <Button onClick={handleVerification} disabled={verified === true} className="w-full">
            {verified ? "Already Verified" : "Verify Me"}
          </Button>
        </div>

        <div className="text-center">
          <Button onClick={handleLogout} className="w-full">
            Log Out
          </Button>
        </div>
      </div>

      <hr className="my-6 border-gray-300" />
      <h2 className="text-2xl font-semibold text-center">Your Payments</h2>

      {paymentsLoading && <p>Loading payments...</p>}
      {paymentsError && <p className="text-red-600">{paymentsError}</p>}
      {!paymentsLoading && payments.length === 0 && <p>No payments found.</p>}

      {payments.map((p) => (
        <div
          key={p.payment_id}
          className="border p-4 rounded-lg shadow mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center"
        >
          <div>
            <p className="font-semibold">Amount: ${p.total_amount.toFixed(2)}</p>
            <p>Status: {p.status}</p>
          </div>

          {p.status === "initiated" && (
            <div className="space-x-2 mt-2 sm:mt-0">
              <Button
                onClick={() => handleConfirm(p.payment_id)}
                className="bg-green-500 hover:bg-green-600"
                disabled={confirmingId === p.payment_id}
              >
                {confirmingId === p.payment_id ? "Confirming..." : "Confirm Purchase"}
              </Button>
              <Button
                onClick={() => handleOpenReport(p.payment_id)}
                variant="destructive"
                disabled={reporting}
              >
                Report Seller
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Report Dialog */}
      <Dialog
        open={reportDialogOpen}
        onOpenChange={(open) => {
          setReportDialogOpen(open);
          if (!open) setReportReason("");
        }}
      >
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
            rows={4}
          />
          <DialogFooter className="mt-4">
            <Button onClick={submitReport} disabled={!reportReason.trim() || reporting}>
              {reporting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

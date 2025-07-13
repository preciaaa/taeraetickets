'use client';

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from 'react';

export default function profilePage() {
  const router = useRouter();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow-md space-y-6">
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
  );
}

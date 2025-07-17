// needa edit how listing_id is passed to checkout page

// npm install stripe
'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { apiRoutes } from '@/lib/apiRoutes';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CheckoutForm = ({ clientSecret }: { clientSecret: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const userId =
    typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
  const paymentId =
    typeof window !== 'undefined' ? localStorage.getItem('payment_id') : null;

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !paymentId || !userId) return;

    setSubmitting(true);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!
      }
    });

    if (result.error) {
      alert(result.error.message);
      setSubmitting(false);
    } else if (result.paymentIntent?.status === 'succeeded') {
      alert('💳 Payment successful!\nNow go to your dashboard to confirm the purchase.');
      router.push('/dashboard'); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <CardElement className="p-4 border rounded-lg" />
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
};

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const listingId = searchParams.get('listingId');
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const calledCheckout = useRef(false);

  useEffect(() => {
    if (!userId || !listingId || calledCheckout.current) return;
    calledCheckout.current = true;

    const loadCheckout = async () => {
      try {
        // Fetch listing details to show
        const listingResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listings/${listingId}`);
        if (!listingResponse.ok) throw new Error('Failed to load listing');
        const listingRes = await listingResponse.json();
        setListing(listingRes);

        // Start checkout
        const checkoutResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, listingId })
        });

        if (!checkoutResponse.ok) throw new Error('Failed to initiate payment');
        const checkoutRes = await checkoutResponse.json();

        setClientSecret(checkoutRes.clientSecret);
        localStorage.setItem('payment_id', checkoutRes.payment_id); // save for later confirm
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Failed to load listing or initiate payment');
        router.push('/'); // redirect on failure
      } finally {
        setLoading(false);
      }
    };

    loadCheckout();
  }, [userId, listingId, router]);

  if (loading) return <p>Loading...</p>;
  if (!clientSecret || !listing) return <p>Failed to load payment</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <div className="border p-3 mb-3 rounded">
        <div className="font-semibold">{listing.event_name || 'Event'}</div>
        <div className="text-sm text-gray-600">
          {/* Show some relevant details from listing */}
          Date: {new Date(listing.date).toLocaleDateString()}<br />
          Price: ${listing.price}
        </div>
      </div>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm clientSecret={clientSecret} />
      </Elements>
    </div>
  );
}

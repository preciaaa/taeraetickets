'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

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
      router.push('/dashboard'); // Manual confirm happens from dashboard
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const calledCheckout = useRef(false);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;

  useEffect(() => {
    if (!userId || calledCheckout.current) return;
    calledCheckout.current = true;

    const loadCheckout = async () => {
      try {
        // Load cart
        const { data: cartRes } = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/cart/${userId}`);
        setCart(cartRes);

        // Start checkout
        const { data: checkoutRes } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/checkout`,
          { userId }
        );

        setClientSecret(checkoutRes.clientSecret);
        localStorage.setItem('payment_id', checkoutRes.payment_id); // save for later confirm
      } catch (err) {
        console.error(err);
        alert('Failed to load cart or initiate payment');
      } finally {
        setLoading(false);
      }
    };

    loadCheckout();
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  if (!clientSecret) return <p>Payment failed to load</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      {cart.map((item) => (
        <div key={item.ticket_id} className="border p-3 mb-3 rounded">
          <div className="font-semibold">{item.event_name}</div>
          <div className="text-sm text-gray-600">
            {item.category} • {item.section} • Row {item.row}, Seat {item.seat_number}
          </div>
          <div className="text-sm">${item.price}</div>
        </div>
      ))}
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm clientSecret={clientSecret} />
      </Elements>
    </div>
  );
}

'use client';

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
    const router = useRouter()
    const [verified, setVerified] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const initialise = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/auth/login")
                return
              }
            const userId = session.user?.id
            try {
                const res = await fetch(`http://localhost:5000/users/${userId}`);
                const data = await res.json();
                setVerified(data.verified);
              } catch (err) {
                console.error("Failed to fetch verification status:", err);
                setVerified(false);
              }
              setLoading(false);
            };
        
        initialise();
    }, [router])

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/auth/login")
    }


    const handleVerification = () => {
        router.push("/verification");
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
        
            <div className="text-center">
                <p className="text-gray-700 mb-4">
                Verification Status:{" "}
                <span className={verified ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {verified ? "Verified" : "Not Verified"}
                </span>
                </p>
        
                <Button
                onClick={handleVerification}
                disabled={verified === true}
                className="w-full"
                >
                {verified ? "Already Verified" : "Verify Me"}
                </Button>
            </div>
        
            <div className="text-center">
                <Button
                onClick={handleLogout}
                className="w-full"
                >
                Log Out
                </Button>
            </div>
        </div>
        )
}

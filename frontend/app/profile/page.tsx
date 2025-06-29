'use client';

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function profilePage() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/auth/login");
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Profile page</h1>
            <Button onClick={handleLogout} className="mt-4 ml-2">Log Out</Button>
        </div>
    );
}
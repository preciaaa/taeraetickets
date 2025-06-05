import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuTrigger,
    NavigationMenuContent,
    NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";

import Link from "next/link";


export default function Navbar() {
    //replace with real auth logic later
    const isLoggedIn = false;
    let authbutton;
    if (isLoggedIn) {
        authbutton = (
            <Link href="/profile">
                <Button variant="outline">My Profile</Button>
            </Link>
        );
    } else {
        authbutton = (
            <Link href="/login">
                <Button>Sign In</Button>
            </Link>
        );
    }
    return (
        <nav className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-50 shadow-md">
            <Link href="/" className="text-2xl font-bold">
                🎟taeraetickets
            </Link>

            <NavigationMenu>
                <NavigationMenuList>
                    <NavigationMenuItem>
                        <NavigationMenuTrigger>Tickets</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <NavigationMenuLink href="/tickets/buy">Buy Tickets</NavigationMenuLink>
                            <NavigationMenuLink href="/tickets/sell">Sell Tickets</NavigationMenuLink>
                        </NavigationMenuContent>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                        <NavigationMenuTrigger>Chats</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <NavigationMenuLink href="/chatsnotifications">Notifications</NavigationMenuLink>
                            <NavigationMenuLink href="/chats">All Chats</NavigationMenuLink>
                        </NavigationMenuContent>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                            <NavigationMenuLink href="/cart" className="bg-black text-white rounded-full px-5">Cart</NavigationMenuLink>
                    </NavigationMenuItem>

                    {/* Add more menu items here */}
                </NavigationMenuList>
            </NavigationMenu>
            <div>{authbutton}</div>
        </nav>
    );
}

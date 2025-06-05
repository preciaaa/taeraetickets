// import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/ui/navbar";

// const tickets = [
//   {
//     id: "1",
//     event: "zerobaseone timeless world tour",
//     location: "Singapore Indoor Stadium",
//     date: "2025-07-21",
//     price: 180,
//   },
//   {
//     id: "2",
//     event: "Taylor Swift Eras Tour",
//     location: "KL Bukit Jalil Stadium",
//     date: "2025-09-12",
//     price: 210,
//   },
// ];

export default function HomePage() {
  return (
    <>
      <div className="min-h-screen bg-taeraeyellow overflow-hidden flex flex-col justify-center items-center">
        <main className="p-6 space-y-6">
          <p className="text-center text-gray-600">Buy and resell tickets securely.</p>
          <div className="flex items-center justify-center">
            <h1 className="font-bold text-center text-6xl">Safest place to buy tickets</h1>
          </div>
          {/* <div className="grid gap-4 md:grid-cols-2">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition">
            <CardContent className="p-4 space-y-2">
              <h2 className="text-xl font-semibold">{ticket.event}</h2>
              <p className="text-sm text-gray-500">{ticket.location}</p>
              <p className="text-sm">📅 {ticket.date}</p>
              <p className="text-lg font-bold">${ticket.price}</p>
              <Button variant="outline">View Ticket</Button>
            </CardContent>
          </Card>
        ))}
      </div> */}
        </main>
      </div>
    </>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tickets = [
  {
    id: "1",
    event: "zerobaseone timeless world tour",
    location: "Singapore Indoor Stadium",
    date: "2025-07-21",
    price: 180,
  },
  {
    id: "2",
    event: "Taylor Swift Eras Tour",
    location: "KL Bukit Jalil Stadium",
    date: "2025-09-12",
    price: 210,
  },
];

export default function BuyTicketsPage(){
    return(
        <main className="p-6">
            <h1 className="text-2xl font-bold">BUY HERE hehe</h1>
            <div className="grid gap-4 md:grid-cols-2">
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
      </div>
        </main>
    )
}
// import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const trending = [
    {
      title: "Taylor Swift · The Eras Tour",
      venue: "Singapore National Stadium",
      status: "hot",
    },
    {
      title: "Coldplay · Music Of The Spheres",
      venue: "Kallang Stadium",
      status: "hot",
    },
    {
      title: "IU · H.E.R World Tour",
      venue: "Indoor Stadium",
      status: "normal",
    },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden bg-[length:200%_200%] bg-[linear-gradient(120deg,_#FF0066,_#FFCC00,_#33CC33,_#0066FF,_#6600FF,_#FF0066)] animate-gradient-slow px-6 py-24 text-center text-white">
        <h1 className="max-w-4xl text-balance text-5xl font-extrabold drop-shadow-md md:text-7xl">
          The safest place to buy & sell tickets
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/90 md:text-xl">
          Zero hassle · Instant transfers · 100% buyer protection
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/tickets/buy" className="animate-float">
            <Button size="lg">Browse Tickets</Button>
          </Link>
          <Link href="/tickets/sell" className="animate-float [animation-delay:0.3s]">
            <Button variant="outline" size="lg" className="bg-white/10 text-white hover:bg-white/20">
              Sell Yours
            </Button>
          </Link>
        </div>
      </section>

      {/* TRENDING */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-3xl font-semibold">Trending now</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((t, i) => (
            <Card key={i} className="relative cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-lg">
              {t.status === "hot" && (
                <span className="absolute right-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                  HOT
                </span>
              )}
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
                <CardDescription>{t.venue}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  From S$80 · 4k+ tickets available
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" className="w-full">
                  View deals
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

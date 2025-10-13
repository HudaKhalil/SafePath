import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import MapViewCard from "@/components/MapViewCard";
import RouteButtons from "@/components/RouteButtons";
import AdCard from "@/components/AdCard";
import BottomNav from "@/components/BottomNav";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#EAF5EA]">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-6">
        <Header />
        <p className="mt-4 text-lg text-slate-700">
          Hi, <span className="font-medium">Sarah</span> 👋 Ready for a safer ride today?
        </p>

        <SearchBar />
        <MapViewCard />
        <RouteButtons />
        <AdCard />
      </div>

      <BottomNav />
    </main>
  );
}

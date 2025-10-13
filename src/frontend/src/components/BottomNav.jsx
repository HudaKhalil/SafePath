import { Home, Map, AlertTriangle, ParkingCircle, Users2 } from "lucide-react";

const Item = ({ icon: Icon, label, active }) => (
  <button
    className={`flex flex-col items-center gap-1 text-xs ${
      active ? "text-green-700" : "text-slate-500"
    }`}
  >
    <Icon />
    {label}
  </button>
);

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200">
      <div className="mx-auto max-w-3xl px-6 py-3 grid grid-cols-5">
        <Item icon={Home} label="Home" active />
        <Item icon={Map} label="Routes" />
        <Item icon={AlertTriangle} label="Report" />
        <Item icon={ParkingCircle} label="Bike Park" />
        <Item icon={Users2} label="Find Buddy" />
      </div>
    </nav>
  );
}

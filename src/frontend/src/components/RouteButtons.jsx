import { ShieldCheck, Zap } from "lucide-react";

export default function RouteButtons() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-5">
      <button className="flex items-center justify-center gap-2 rounded-2xl bg-sp-green text-white py-4 shadow-lg active:scale-[0.99]">
        <ShieldCheck />
        <span className="text-lg font-semibold">Go Safe</span>
      </button>

      <button className="flex items-center justify-center gap-2 rounded-2xl bg-sp-orange text-white py-4 shadow-lg active:scale-[0.99]">
        <Zap />
        <span className="text-lg font-semibold">Go Fast</span>
      </button>
    </div>
  );
}

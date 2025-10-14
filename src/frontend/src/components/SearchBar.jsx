import { Mic, Search } from "lucide-react";

export default function SearchBar() {
  return (
    <div className="mt-5">
      <label htmlFor="search" className="sr-only">Enter your start and destination</label>
      <div className="flex items-center gap-3 rounded-2xl bg-white/90 shadow-lg px-4 py-4">
        <Search className="shrink-0" />
        <input
          id="search"
          type="text"
          placeholder="Enter your start and destination"
          className="w-full bg-transparent outline-none placeholder:text-slate-400"
        />
        <button aria-label="Voice input" className="p-2 rounded-full hover:bg-slate-100">
          <Mic />
        </button>
      </div>
    </div>
  );
}

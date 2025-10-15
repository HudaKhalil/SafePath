// src/components/SearchBar.jsx
"use client";
import { Mic, Search } from "lucide-react";

export default function SearchBar({ value = "", onChange }) {
  return (
    <div>
      <label htmlFor="to" className="sr-only">Enter your destination</label>
      <div className="flex items-center gap-3 rounded-xl2 bg-sp-card shadow-soft px-4 py-4">
        <Search className="shrink-0 text-sp-inkMuted" />
        <input
          id="to"
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Where to go ? (e.g., O’Connell Bridge)"
          className="w-full bg-transparent outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          aria-label="Voice input"
          className="p-2 rounded-full hover:bg-sp-cardAlt"
        >
          <Mic className="text-sp-inkMuted" />
        </button>
      </div>
    </div>
  );
}

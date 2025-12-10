"use client";

import { ShieldCheck, Zap } from "lucide-react";

const Btn = ({ className = "", children }) => (
  <button
    className={
      "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-white shadow-soft " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      className
    }
  >
    {children}
  </button>
);

export default function RouteButtons() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <Btn className="bg-sp-safe hover:opacity-95 active:translate-y-px focus-visible:ring-sp-safe/60">
        <ShieldCheck />
        <span className="text-lg font-semibold">Go Safe</span>
      </Btn>
      <Btn className="bg-sp-fast hover:opacity-95 active:translate-y-px focus-visible:ring-sp-fast/60">
        <Zap />
        <span className="text-lg font-semibold">Go Fast</span>
      </Btn>
    </div>
  );
}

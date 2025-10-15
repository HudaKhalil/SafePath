"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import SideDrawer from "./SideDrawer";

export default function Header() {
  const [open, setOpen] = useState(false);
  const openMenu = useCallback(() => setOpen(true), []);
  const closeMenu = useCallback(() => setOpen(false), []);

  // 👇 listen for SidebarRail’s custom event
  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener("safepath:toggle-drawer", handler);
    return () => window.removeEventListener("safepath:toggle-drawer", handler);
  }, []);

  return (
    <>
      <header className="px-6 pt-6 pb-3 md:pl-0">
        <div className="flex items-center justify-between">
          {/* mobile burger (desktop uses the rail) */}
          <button
            onClick={openMenu}
            className="inline-flex items-center justify-center rounded-lg p-3 hover:bg-slate-100 md:hidden"
            aria-label="Open main menu"
          >
            <Menu className="h-6 w-6 text-sp-title" />
          </button>

          <a href="/" className="flex items-center gap-2 md:gap-3">
            <Image src="/logo.png" alt="SafePath" width={32} height={32} />
            <span className="hidden sm:inline-block text-lg md:text-xl font-semibold text-sp-title">
              SafePath
            </span>
          </a>

          <Image
            src="/user.png"
            alt="User profile"
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
      </header>

      {/* the actual drawer */}
      <SideDrawer open={open} onClose={closeMenu} />
    </>
  );
}


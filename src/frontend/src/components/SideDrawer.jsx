"use client";
import { useEffect, useRef } from "react";
import { X, Map, AlertTriangle, ParkingCircle, Users2, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SideDrawer({ open, onClose }) {
  const panelRef = useRef(null);
  const router = useRouter();

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus management
  useEffect(() => {
    if (open && panelRef.current) {
      const prev = document.activeElement;
      panelRef.current.focus();
      return () => prev && prev.focus?.();
    }
  }, [open]);

  const go = (href) => {
    onClose();
    if (href) router.push(href);
  };

  const items = [
    { icon: Map,           label: "Routes",       href: "/routes" },
    { icon: AlertTriangle, label: "Report Hazard",href: "/report" },
    { icon: ParkingCircle, label: "Bike Park",    href: "/bike-park" },
    { icon: Users2,        label: "Find Buddy",   href: "/buddy" },
    { icon: Settings,      label: "Settings",     href: "/settings" },
    { icon: User,          label: "Profile",      href: "/profile" },
  ];

  return (
    <>
      {/* overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Functions menu"
        tabIndex={-1}
        className={[
          "fixed inset-y-0 left-0 z-50 w-[84vw] max-w-sm",
          "bg-white shadow-2xl outline-none",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-200">
          <span className="font-semibold text-xl text-sp-title">SafePath</span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Close menu">
            <X />
          </button>
        </div>

        <nav className="px-2 py-2">
          <ul className="space-y-1">
            {items.map(({ icon: Icon, label, href }) => (
              <li key={label}>
                <button
                  onClick={() => go(href)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sp-bg text-sp-ink"
                >
                  <Icon className="h-5 w-5 text-sp-title" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

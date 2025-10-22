"use client";
import { Menu, Bookmark, History, Smartphone } from "lucide-react";

function RailItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 text-sm text-black/80 hover:text-black transition-colors"
    >
      <Icon className="h-6 w-6" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function SidebarRail() {
  const openDrawer = () => {
    window.dispatchEvent(new CustomEvent("safepath:toggle-drawer"));
  };
  return (
    <aside

      className={[
        "hidden md:flex fixed left-0 top-0 bottom-0 z-30 w-20",
        "bg-[#EEF4F0] border-r border-black/5"
      ].join(" ")}
      aria-label="Quick actions"
    >
    
      <div className="flex flex-col justify-between items-center w-full h-full py-6">
        {/* top group */}
        <div className="flex flex-col items-center gap-6 w-full">
          <RailItem icon={Menu} onClick={openDrawer} />
          <RailItem icon={Bookmark} label="Saved" onClick={() => { /* TODO: route */ }} />
          <RailItem icon={History} label="Recents" onClick={() => { /* TODO: route */ }} />

          {/* divider */}
          <div className="w-14 h-px bg-black/10 my-2" />

          {/* pinned city chip */}
          <button
            className="flex flex-col items-center gap-2"
            onClick={() => { /* TODO: open city list */ }}
          >
        
          </button>
        </div>

        {/* bottom group */}
        <div className="flex flex-col items-center w-full">
          <div className="w-14 h-px bg-black/10 mb-4" />
          <RailItem icon={Smartphone} label="Get app" onClick={() => { /* TODO */ }} />
        </div>
      </div>
    </aside>
  );
}

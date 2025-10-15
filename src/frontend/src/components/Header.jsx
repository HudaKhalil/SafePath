Header
// src/components/Header.jsx
import Image from "next/image";

export default function Header() {
  return (
    <header className="px-6 pt-2 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
        {/* logo circle */}
        <div className="w-18 h-18 rounded-full bg-gray-500 shadow-sm flex overflow-hidden">
          <Image
            src="/logo.png"
            alt="SafePath Logo"
            width={70}
            height={70}
            className="object-cover"
            priority
          />
        </div>
</div>
        {/* title */}
        <h1 className="text-4xl text-center md:text-4xl font-bold tracking-tight text-sp-title">
          SafePath
        </h1>

        {/* profile */}
        <button
          className="w-16 h-16 rounded-full shadow-sm hover:shadow-md transition-shadow flex overflow-hidden"
          aria-label="Open profile menu"
        >
          <Image
            className="rounded-full ring-2 ring-white/80"
            src="/user.png"
            alt="User profile"
            width={70}
            height={70}
          />
        </button>
      </div>
    </header>
  );
}


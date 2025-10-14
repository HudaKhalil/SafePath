import Image from "next/image";

export default function Header() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="SafePath logo"
          width={44}
          height={44}
          className="rounded-full"
        />
        <h1 className="text-2xl font-semibold text-green-900">SafePath</h1>
      </div>

      <Image
        src="/user.png"
        alt="User profile"
        width={44}
        height={44}
        className="rounded-full ring-2 ring-white/70"
      />
    </header>
  );
}

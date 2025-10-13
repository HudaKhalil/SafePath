import Image from "next/image";

export default function AdCard() {
  return (
    <article className="mt-5 rounded-2xl bg-white shadow-lg p-3 flex items-center gap-4">
      <Image
        src="/ad.png"
        alt="Partner shop"
        width={84}
        height={84}
        className="rounded-xl object-cover"
      />
      <div className="min-w-0">
        <p className="text-sm text-green-700 font-medium">🛴 Partner Shop</p>
        <h3 className="text-lg font-semibold truncate">CyclePro Shop</h3>
        <p className="text-slate-500">Get 15% off bike accessories</p>
      </div>
    </article>
  );
}

// src/components/AdCard.jsx
import Image from "next/image";

export default function AdCard() {
  return (
    <article className="rounded-2xl bg-sp-card shadow-soft p-3 flex items-center gap-4">
      <Image src="/ad.png" alt="Partner shop" width={200} height={84} className="rounded-xl object-cover" />
      <div className="min-w-0">
        <p className="text-sm text-sp-safe font-medium">🛒 Partner Shop</p>
        <h3 className="text-lg font-semibold truncate text-sp-ink">CyclePro Shop</h3>
        <p className="text-sp-inkMuted">Get 15% off bike accessories</p>
      </div>
    </article>
  );
}

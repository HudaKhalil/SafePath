import Image from "next/image";

export default function MapViewCard() {
  return (
    <div className="mt-6 rounded-3xl overflow-hidden shadow-xl">
      <Image
        src="/map.png"
        alt="Map preview"
        width={1200}
        height={800}
        className="h-60 w-full object-cover"
        priority
      />
    </div>
  );
}

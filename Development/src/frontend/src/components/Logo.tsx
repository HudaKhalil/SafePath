import Image from "next/image";

type Props = { size?: number; showName?: boolean };

export default function Logo({ size = 56, showName = true }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/safepath-logo.png"
        alt="SafePath logo"
        width={size}
        height={size}
        priority
      />
      {showName && (
        <span className="text-2xl font-semibold text-brand-700">SafePath</span>
      )}
    </div>
  );
}

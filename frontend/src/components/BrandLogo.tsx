interface BrandLogoProps {
  size?: number;
}

export function BrandLogo({ size = 36 }: BrandLogoProps) {
  return (
    <span className="inline-flex items-center justify-center rounded-[4px] bg-[#FFFDF8] border border-[var(--line)] p-1 shrink-0">
      <img
        src="/paybridge.png"
        alt="Logo PayBridge"
        width={size}
        height={size}
        className="object-contain block"
        style={{ width: size, height: size }}
      />
    </span>
  );
}

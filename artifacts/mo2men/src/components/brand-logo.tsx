interface BrandLogoProps {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 40, className = "" }: BrandLogoProps) {
  const base = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`;
  return (
    <img
      src={base}
      alt="Alson Coffee"
      width={size}
      height={size}
      className={`shrink-0 rounded-2xl shadow-sm ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

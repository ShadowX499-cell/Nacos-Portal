/** NACOS official seal — Nigeria circuit-board map in a green ring */
export default function NacosLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/nacos-logo.png"
      alt="NACOS Logo"
      width={size}
      height={size}
      className={`rounded-full object-contain ${className}`}
      onError={(e) => {
        // Fallback: hide broken image and show initials badge
        const el = e.currentTarget as HTMLImageElement;
        el.style.display = 'none';
        const parent = el.parentElement;
        if (parent && !parent.querySelector('.nacos-fallback')) {
          const badge = document.createElement('div');
          badge.className = 'nacos-fallback flex items-center justify-center rounded-full bg-brand-700 text-white font-bold text-xs';
          badge.style.width = `${size}px`;
          badge.style.height = `${size}px`;
          badge.textContent = 'N';
          parent.appendChild(badge);
        }
      }}
    />
  );
}

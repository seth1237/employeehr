export const ICON_KINDS = [
  "inventory",
  "payroll",
  "manufacturing",
  "warehouse",
  "crm",
  "procurement",
  "shipping",
  "projects",
] as const;

export type IconKind = (typeof ICON_KINDS)[number];

type IconProps = {
  kind: IconKind;
  size?: number;
};

export function AppIcon({ kind, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {kind === "inventory" && (
        <>
          <rect x="4" y="15" width="18" height="13" rx="2.2" fill="#C2410C" />
          <rect x="10" y="4" width="18" height="13" rx="2.2" fill="#F59E0B" />
          <path d="M10 10.5h18" stroke="#B45309" strokeWidth="1.4" />
          <path d="M4 21.5h18" stroke="#9A3412" strokeWidth="1.4" />
          <path d="M19 4v13" stroke="#B45309" strokeWidth="1.2" opacity=".45" />
        </>
      )}
      {kind === "payroll" && (
        <>
          <circle cx="13" cy="10" r="5.2" fill="#2563EB" />
          <path d="M4.5 27.5c.8-7.4 16.2-7.4 17 0Z" fill="#1D4ED8" />
          <circle cx="23.2" cy="21.2" r="6.4" fill="#FBBF24" />
          <path
            d="M23.2 17.6v7.2M20.6 19.4h3.4c1.2 0 2 .7 2 1.8s-.8 1.8-2 1.8h-3.4"
            stroke="#92400E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "manufacturing" && (
        <>
          <rect x="3" y="16" width="26" height="13" rx="2" fill="#475569" />
          <path d="M7 16V9h6v7M19 16V7h6v9" fill="#F97316" />
          <rect x="8.2" y="10.2" width="3.6" height="3.2" fill="#FFEDD5" />
          <rect x="20.2" y="8.4" width="3.6" height="3.2" fill="#FFEDD5" />
          <circle cx="16" cy="23" r="4.6" fill="#FB923C" />
          <circle cx="16" cy="23" r="1.7" fill="#FFF7ED" />
        </>
      )}
      {kind === "warehouse" && (
        <>
          <path d="M16 3 30 13v16H2V13Z" fill="#0F766E" />
          <path d="M16 3 30 13H2Z" fill="#14B8A6" />
          <rect x="12" y="18" width="8" height="11" fill="#CCFBF1" />
          <path d="M12 23.5h8" stroke="#0F766E" strokeWidth="1.3" />
        </>
      )}
      {kind === "crm" && (
        <>
          <circle cx="12" cy="10" r="5" fill="#7C3AED" />
          <path d="M3.8 26.8c1-7.2 14.4-7.2 15.4 0Z" fill="#6D28D9" />
          <circle cx="21.4" cy="11.4" r="4.4" fill="#C4B5FD" />
          <path d="M14.8 26.8c.8-6 11.8-6.4 13.4-.2Z" fill="#A78BFA" />
        </>
      )}
      {kind === "procurement" && (
        <>
          <rect x="6" y="5" width="20" height="24" rx="3" fill="#4F46E5" />
          <rect x="10" y="2.5" width="12" height="6" rx="2" fill="#A5B4FC" />
          <path
            d="M11 15.5h10M11 20.5h10M11 25h7"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "shipping" && (
        <>
          <rect x="2" y="12" width="18" height="11" rx="2" fill="#1D4ED8" />
          <path d="M20 15h7l3 5v3h-10Z" fill="#F59E0B" />
          <rect x="4" y="14.5" width="6" height="5" rx="1" fill="#DBEAFE" />
          <circle cx="9" cy="24.5" r="3.1" fill="#0F172A" />
          <circle cx="24" cy="24.5" r="3.1" fill="#0F172A" />
          <circle cx="9" cy="24.5" r="1.2" fill="#E2E8F0" />
          <circle cx="24" cy="24.5" r="1.2" fill="#E2E8F0" />
        </>
      )}
      {kind === "projects" && (
        <>
          <rect width="32" height="32" rx="4" fill="#0891B2" />
          <rect x="5" y="7" width="6" height="18" rx="1.4" fill="#A5F3FC" />
          <rect x="13" y="11" width="6" height="14" rx="1.4" fill="#ECFEFF" />
          <rect x="21" y="9" width="6" height="16" rx="1.4" fill="#67E8F9" />
        </>
      )}
    </svg>
  );
}

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="5" />
      <path
        d="M44 15a36 36 0 1 0 12 0M44 74a25 25 0 1 1 12 0M44 38a13 13 0 1 0 12 0"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}

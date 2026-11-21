export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-start gap-6 bg-navy px-7 pt-24 pb-12 text-white">
      <div className="flex size-18 items-center justify-center rounded-logo bg-accent text-navy">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" />
          <path d="M9.2 9.2l5.6 5.6" />
        </svg>
      </div>
      <h1 className="text-[40px] leading-[1.1] font-bold tracking-[-0.5px]">Local Pharm</h1>
      <p className="max-w-75 text-[17px] leading-normal">
        Домашняя аптечка: что есть, где лежит и когда истекает срок.
      </p>
    </main>
  );
}

/** Gameweek banner on a mown pitch with faint markings. */
export function PitchHero({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="pitch relative mb-6 overflow-hidden rounded-2xl px-5 py-6 text-white sm:px-8 sm:py-8">
      <svg
        aria-hidden
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <g fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="4">
          <rect x="20" y="20" width="1160" height="360" />
          <line x1="600" y1="20" x2="600" y2="380" />
          <circle cx="600" cy="200" r="70" />
          <rect x="20" y="100" width="150" height="200" />
          <rect x="20" y="150" width="55" height="100" />
          <rect x="1030" y="100" width="150" height="200" />
          <rect x="1125" y="150" width="55" height="100" />
          <path d="M170 160 A 60 60 0 0 1 170 240" />
          <path d="M1030 160 A 60 60 0 0 0 1030 240" />
        </g>
        <circle cx="600" cy="200" r="5" fill="white" fillOpacity="0.4" />
      </svg>
      <div className="relative">
        <h1 className="text-5xl font-bold drop-shadow-sm sm:text-6xl">{title}</h1>
        {children}
      </div>
    </section>
  )
}

export function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-black/25 px-3 py-2 backdrop-blur-sm">
      <dt className="truncate text-xs text-white/80">{label}</dt>
      <dd className="font-score text-lg leading-tight font-bold whitespace-nowrap tabular sm:text-2xl">{value}</dd>
    </div>
  )
}

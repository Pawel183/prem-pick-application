import { useId } from "react"
import { kitFor } from "@/lib/club-colors"
import { cn } from "@/lib/utils"

const BODY = "M22 6 L27 4 Q32 9 37 4 L42 6 L58 17 L51 29 L45 25 L45 60 L19 60 L19 25 L13 29 L6 17 Z"
const LEFT_SLEEVE = "M22 6 L6 17 L13 29 L19 25 L19 12 Z"
const RIGHT_SLEEVE = "M42 6 L58 17 L51 29 L45 25 L45 12 Z"

/** A club shirt in the team's home colours (decorative; the team name is always shown as text). */
export function Shirt({ team, className }: { team: string; className?: string }) {
  const kit = kitFor(team)
  const clip = useId()
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("drop-shadow-sm", className)}>
      <defs>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <path d={BODY} fill={kit.body} />
      {kit.stripes && (
        <g clipPath={`url(#${clip})`} fill={kit.stripes}>
          {[23, 31, 39].map((x) => (
            <rect key={x} x={x} y="0" width="4" height="64" />
          ))}
        </g>
      )}
      <path d={LEFT_SLEEVE} fill={kit.trim} opacity={kit.stripes ? 0 : 0.18} />
      <path d={RIGHT_SLEEVE} fill={kit.trim} opacity={kit.stripes ? 0 : 0.18} />
      <path d="M27 4 Q32 9 37 4" fill="none" stroke={kit.trim} strokeWidth="2.5" />
      <path d={BODY} fill="none" stroke="rgb(0 0 0 / 0.28)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

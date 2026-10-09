import { normalizeTeamName } from "@football/providers"

export type Kit = { body: string; trim: string; stripes?: string }

// Home-kit colours keyed by normalized team name (see normalizeTeamName). Approximate, for visuals only.
const KITS: Record<string, Kit> = {
  arsenal: { body: "#EF0107", trim: "#FFFFFF" },
  astonvilla: { body: "#670E36", trim: "#95BFE5" },
  bournemouth: { body: "#DA291C", trim: "#111111", stripes: "#111111" },
  brentford: { body: "#E30613", trim: "#111111", stripes: "#FFFFFF" },
  brighton: { body: "#0057B8", trim: "#FFFFFF", stripes: "#FFFFFF" },
  burnley: { body: "#6C1D45", trim: "#99D6EA" },
  chelsea: { body: "#034694", trim: "#FFFFFF" },
  coventry: { body: "#59CBE8", trim: "#FFFFFF" },
  coventrycity: { body: "#59CBE8", trim: "#FFFFFF" },
  crystalpalace: { body: "#1B458F", trim: "#C4122E", stripes: "#C4122E" },
  everton: { body: "#003399", trim: "#FFFFFF" },
  fulham: { body: "#FFFFFF", trim: "#111111" },
  hull: { body: "#F5A12D", trim: "#111111", stripes: "#111111" },
  hullcity: { body: "#F5A12D", trim: "#111111", stripes: "#111111" },
  ipswich: { body: "#0044AA", trim: "#FFFFFF" },
  leeds: { body: "#FFFFFF", trim: "#1D428A" },
  leicester: { body: "#003090", trim: "#FDBE11" },
  liverpool: { body: "#C8102E", trim: "#F6EB61" },
  luton: { body: "#F78F1E", trim: "#002D62" },
  manchestercity: { body: "#6CABDD", trim: "#FFFFFF" },
  manchesterunited: { body: "#DA291C", trim: "#FFFFFF" },
  middlesbrough: { body: "#E11B22", trim: "#FFFFFF" },
  newcastle: { body: "#241F20", trim: "#FFFFFF", stripes: "#FFFFFF" },
  norwich: { body: "#FFF200", trim: "#00A650" },
  norwichcity: { body: "#FFF200", trim: "#00A650" },
  nottinghamforest: { body: "#DD0000", trim: "#FFFFFF" },
  sheffieldunited: { body: "#EE2737", trim: "#111111", stripes: "#FFFFFF" },
  southampton: { body: "#D71920", trim: "#111111", stripes: "#FFFFFF" },
  stoke: { body: "#E03A3E", trim: "#FFFFFF", stripes: "#FFFFFF" },
  stokecity: { body: "#E03A3E", trim: "#FFFFFF", stripes: "#FFFFFF" },
  sunderland: { body: "#EB172B", trim: "#111111", stripes: "#FFFFFF" },
  tottenham: { body: "#FFFFFF", trim: "#132257" },
  watford: { body: "#FBEE23", trim: "#ED2127" },
  westbrom: { body: "#122F67", trim: "#FFFFFF", stripes: "#FFFFFF" },
  westbromwichalbion: { body: "#122F67", trim: "#FFFFFF", stripes: "#FFFFFF" },
  westham: { body: "#7A263A", trim: "#1BB1E7" },
  wolves: { body: "#FDB913", trim: "#231F20" },
}

/** Kit colours for a team; unknown teams get a stable colour derived from the name. */
export function kitFor(name: string): Kit {
  const known = KITS[normalizeTeamName(name)]
  if (known) return known
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return { body: `hsl(${hash % 360} 60% 42%)`, trim: "#FFFFFF" }
}

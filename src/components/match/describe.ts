export function describeStatPick(mode: string, range: string | null, exact: number | null, exactLabel: string) {
  return mode === "exact" ? `${exact ?? "–"} (${exactLabel.toLowerCase()})` : (range ?? "–")
}

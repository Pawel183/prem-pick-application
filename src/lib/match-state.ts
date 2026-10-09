/** A match is locked once it has kicked off or left the scheduled state. Server components render per request. */
export function hasKickedOff(match: { kickoff_at: string; status: string }, now: Date = new Date()) {
  return match.status !== "scheduled" || new Date(match.kickoff_at) <= now
}

import "server-only"
import { getProvider, type Call, type Provider } from "@football/providers"
import { createAdminClient } from "@/lib/supabase/admin"

// Headroom kept for the nightly results job on providers with a daily cap.
const RESERVED_FOR_CRON = 12

export class ApiBudgetError extends Error {
  constructor() {
    super("API_BUDGET_EXCEEDED")
  }
}

export class MissingApiKeyError extends Error {
  constructor(public envKey: string) {
    super(`MISSING_API_KEY:${envKey}`)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Active season + its configured provider. */
export async function getActiveSeason() {
  const { data, error } = await createAdminClient()
    .from("seasons")
    .select("id, api_season, provider")
    .eq("is_active", true)
    .single()
  if (error || !data) throw new Error("No active season")
  return { ...data, provider: getProvider(data.provider) }
}

/** Requests made today (UTC day, matching the providers' quota reset). */
export async function getTodayRequestCount() {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  const { count } = await createAdminClient()
    .from("api_requests")
    .select("id", { count: "exact", head: true })
    .gte("called_at", since.toISOString())
  return count ?? 0
}

/** Waits until fewer than `perMinute` requests were logged in the last 60 s (app + edge share the log). */
async function throttle(perMinute: number) {
  const { data } = await createAdminClient()
    .from("api_requests")
    .select("called_at")
    .gte("called_at", new Date(Date.now() - 60_000).toISOString())
    .order("called_at", { ascending: true })
  const recent = data ?? []
  if (recent.length < perMinute) return
  const freeAt = new Date(recent[recent.length - perMinute].called_at).getTime() + 60_000
  await sleep(Math.max(0, freeAt - Date.now()) + 250)
}

/**
 * Builds the `call` function the provider adapters use: server-only (the key never reaches
 * the client), logged to api_requests, throttled, and budget-guarded.
 */
export function createCall(provider: Provider): Call {
  const key = process.env[provider.envKey]
  if (!key) throw new MissingApiKeyError(provider.envKey)

  return async (endpoint, params = {}) => {
    if (provider.dailyLimit !== null && (await getTodayRequestCount()) >= provider.dailyLimit - RESERVED_FOR_CRON) {
      throw new ApiBudgetError()
    }
    await throttle(provider.perMinute)

    const url = new URL(`${provider.baseUrl}/${endpoint}`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

    let statusCode: number | null = null
    let error: string | null = null
    let body: unknown = null
    try {
      const res = await fetch(url, { headers: provider.authHeaders(key), cache: "no-store" })
      statusCode = res.status
      body = await res.json().catch(() => null)
      error = provider.parseError(res.status, body)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }

    await createAdminClient().from("api_requests").insert({
      endpoint: `${provider.id}:${endpoint}`,
      params,
      status_code: statusCode,
      error,
      source: "app",
    })

    if (error) throw new Error(`${provider.id} ${endpoint}: ${error}`)
    return body
  }
}

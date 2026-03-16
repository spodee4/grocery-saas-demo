// All API calls go through /api/coach/... proxy — keeps Mac mini token server-side
// and works from any device/network without needing Tailscale in the browser.
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // path is like /api/coaching/dashboard → proxy to /api/coach/coaching/dashboard
  const proxyPath = path.replace(/^\/api\//, "/api/coach/")
  const res = await fetch(proxyPath, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json()
}

export interface DashboardData {
  load: {
    date: string
    tss: number | null
    atl: number | null
    ctl: number | null
    tsb: number | null
    acwr: number | null
    resting_hr: number | null
    hrv_last_night: number | null
    hrv_weekly_avg: number | null
    hrv_status: string | null
    sleep_seconds: number | null
    deep_sleep_seconds: number | null
    rem_sleep_seconds: number | null
    body_battery_wake: number | null
    body_battery_eod: number | null
    steps: number | null
    stress_avg: number | null
    active_kcal: number | null
    total_kcal: number | null
    training_readiness_score: number | null
    training_readiness_level: string | null
    vo2_max: number | null
  } | null
  body: {
    date: string
    weight_kg: number | null
    fat_ratio: number | null
    fat_mass_kg: number | null
    muscle_mass_kg: number | null
  } | null
  last_workout: {
    date: string
    workout_type: string
    duration_min: number | null
    avg_hr: number | null
    hrTSS: number | null
    class_title: string | null
    source: string
  } | null
}

export interface TrendPoint {
  date: string
  ctl: number | null
  atl: number | null
  tsb: number | null
  acwr: number | null
  vo2_max: number | null
  tss: number | null
  hrv_last_night: number | null
  hrv_status: string | null
  resting_hr: number | null
  sleep_seconds: number | null
  deep_sleep_seconds: number | null
  body_battery_wake: number | null
  body_battery_eod: number | null
  training_readiness_score: number | null
}

export interface Workout {
  id: number
  date: string
  workout_type: string
  source: string
  duration_min: number | null
  distance_mi: number | null
  avg_hr: number | null
  max_hr: number | null
  hrTSS: number | null
  calories: number | null
  total_output_kj: number | null
  avg_cadence: number | null
  avg_power_watts: number | null
  zone1_pct: number | null
  zone2_pct: number | null
  zone3_pct: number | null
  zone4_pct: number | null
  zone5_pct: number | null
  class_title: string | null
}

export interface BodyPoint {
  date: string
  weight_kg: number | null
  fat_ratio: number | null
  fat_mass_kg: number | null
  muscle_mass_kg: number | null
  bone_mass_kg: number | null
}

// Client-side fetchers (used with TanStack Query)
export const fetchDashboard = () => apiFetch<DashboardData>("/api/coaching/dashboard")

export const fetchTrends = async (days = 90): Promise<TrendPoint[]> => {
  const res = await apiFetch<{ data: TrendPoint[] } | TrendPoint[]>(`/api/coaching/trends?days=${days}`)
  return Array.isArray(res) ? res : (res as any).data ?? []
}

export const fetchWorkouts = async (limit = 14, type?: string): Promise<Workout[]> => {
  const res = await apiFetch<{ workouts: Workout[] } | Workout[]>(
    `/api/coaching/workouts?limit=${limit}${type ? `&type=${type}` : ""}`
  )
  return Array.isArray(res) ? res : (res as any).workouts ?? []
}

export const fetchBody = (days = 90) =>
  apiFetch<{ history: BodyPoint[]; latest: BodyPoint | null }>(`/api/coaching/body?days=${days}`)

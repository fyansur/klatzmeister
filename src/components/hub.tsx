import { useEffect, useState } from "react"
import type { Types } from "use-lanyard"
import { motion } from "motion/react"
import { ArrowUpRight, Check, Copy, Monitor, Smartphone, Globe } from "lucide-react"
import SpotlightCard from "@/components/SpotlightCard"
import CountUp from "@/components/CountUp"
import RubberSegment from "@/components/RubberSegment"
import vscodeIcon from "@/assets/vscode.svg"

type Presence = Types.Presence
type Activity = Types.Activity

const STATUS = {
  online: { label: "Online", dot: "bg-emerald-400", glow: "shadow-emerald-400/60" },
  idle: { label: "Idle", dot: "bg-amber-400", glow: "shadow-amber-400/60" },
  dnd: { label: "Do not disturb", dot: "bg-rose-500", glow: "shadow-rose-500/60" },
  offline: { label: "Offline", dot: "bg-neutral-500", glow: "shadow-transparent" },
} as const

const ACTIVITY_LABEL: Record<number, string> = {
  0: "Playing",
  1: "Streaming",
  2: "Listening to",
  3: "Watching",
  5: "Competing in",
}

const SPOTLIGHT = "rgba(82, 39, 255, 0.22)" as const // iris

// hook kecil biar komponen yang nampilin waktu re-render tiap detik
function useNow(enabled = true) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [enabled])
  return now
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor(s / 60) % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

function assetUrl(key?: string, appId?: string) {
  if (!key) return null
  if (key.startsWith("spotify:")) return `https://i.scdn.co/image/${key.slice(8)}`
  if (key.startsWith("mp:")) return `https://media.discordapp.net/${key.slice(3)}`
  if (appId) return `https://cdn.discordapp.com/app-assets/${appId}/${key}.png`
  return null
}

function CardTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-200">
      <span>{children}</span>
      {icon}
    </div>
  )
}

/* ---------- Profile ---------- */

export function ProfileCard({ presence, className = "" }: { presence: Presence; className?: string }) {
  const { discord_user: user, kv } = presence
  const status = STATUS[presence.discord_status] ?? STATUS.offline
  const custom = presence.activities.find((a) => a.type === 4)
  const [copied, setCopied] = useState(false)
  const [banner, setBanner] = useState<{ banner: string | null; color: string | null }>({ banner: null, color: null })

  useEffect(() => {
    fetch("/api/discord")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setBanner(d))
      .catch(() => {})
  }, [])

  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=256${user.avatar.startsWith("a_") ? "&animated=true" : ""}`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`
  const decoration = user.avatar_decoration_data?.sku_id
    ? `https://cdn.discordapp.com/media/v1/collectibles-shop/${user.avatar_decoration_data.sku_id}/animated.webp`
    : null
  const guild = user.primary_guild
  const guildBadge = guild?.badge
    ? `https://cdn.discordapp.com/clan-badges/${guild.identity_guild_id}/${guild.badge}?size=16`
    : null

  const devices = [
    presence.active_on_discord_desktop && { icon: <Monitor size={13} />, label: "Desktop" },
    presence.active_on_discord_mobile && { icon: <Smartphone size={13} />, label: "Mobile" },
    presence.active_on_discord_web && { icon: <Globe size={13} />, label: "Web" },
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[]

  const copy = () => {
    navigator.clipboard.writeText(user.username)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <SpotlightCard spotlightColor={SPOTLIGHT} className={`p-0! ${className}`}>
      <div className="relative h-28 overflow-hidden" style={{ background: banner.color ? `linear-gradient(135deg, ${banner.color}, #0a0a0a)` : "linear-gradient(135deg, var(--color-iris), var(--color-ember))" }}>
        {banner.banner && (
          <img
            src={banner.banner}
            alt=""
            onError={() => setBanner((b) => ({ ...b, banner: null }))}
            className="h-full w-full object-cover opacity-70 grayscale-[35%]"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-neutral-950/90" />
        <span className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-medium text-neutral-200 backdrop-blur">
          <span className={`size-2 rounded-full shadow-[0_0_8px] ${status.dot} ${status.glow}`} />
          {status.label}
        </span>
      </div>

      <div className="relative px-6 pb-6">
        <div className="relative -mt-12 size-24">
          <img src={avatar} alt={user.global_name ?? user.username} className="size-24 rounded-full border-4 border-neutral-950 bg-neutral-900 object-cover" />
          {decoration && <img src={decoration} alt="" className="pointer-events-none absolute inset-0 size-24 scale-[1.2]" />}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{user.global_name ?? user.username}</h2>
          <button
            onClick={copy}
            aria-label="Copy username"
            className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
          <span>@{user.username}</span>
          {guild?.tag && (
            <span className="flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-300">
              {guildBadge && <img src={guildBadge} alt="" className="size-3.5" />}
              {guild.tag}
            </span>
          )}
          {devices.map((d) => (
            <span key={d.label} data-tip={`Active on ${d.label}`} aria-label={`Active on ${d.label}`} className="text-emerald-400">
              {d.icon}
            </span>
          ))}
        </div>

        {custom?.state && (
          <p className="mt-4 text-sm text-neutral-300">
            {custom.emoji && !custom.emoji.id && <span className="mr-1">{custom.emoji.name}</span>}
            {custom.state}
          </p>
        )}

        {kv.about && (
          <p className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm leading-relaxed text-neutral-400">
            {kv.about}
          </p>
        )}
      </div>
    </SpotlightCard>
  )
}

/* ---------- Activity ---------- */

function ActivityItem({ activity, kv }: { activity: Activity; kv: Record<string, string> }) {
  const now = useNow(!!activity.timestamps?.start)
  const isVSCode = activity.name === "Visual Studio Code"
  const image = assetUrl(activity.assets?.large_image, activity.application_id)
  const small = assetUrl(activity.assets?.small_image, activity.application_id)

  return (
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/15">
      {image && (
        <div
          className="absolute inset-0 scale-125 bg-cover bg-center opacity-15 blur-2xl transition-opacity group-hover:opacity-25"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      <div className="relative size-16 shrink-0">
        {image ? (
          <img src={image} alt="" className="size-16 rounded-lg object-cover" />
        ) : (
          <div className="grid size-16 place-items-center rounded-lg bg-white/5">
            {isVSCode ? <img src={vscodeIcon} alt="" className="size-9" /> : <i className="bi bi-controller text-2xl text-neutral-500" />}
          </div>
        )}
        {small && <img src={small} alt="" className="absolute -bottom-1 -right-1 size-6 rounded-full border-2 border-neutral-950" />}
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="truncate text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          {isVSCode ? "Working on" : `${ACTIVITY_LABEL[activity.type] ?? "Doing"} ${activity.name}`}
        </p>
        <p className="truncate text-sm font-medium text-white">{isVSCode ? kv.currentproject ?? activity.details : activity.details ?? activity.name}</p>
        {activity.state && <p className="truncate text-xs text-neutral-400">{activity.state}</p>}
        {activity.timestamps?.start && (
          <p className="mt-0.5 font-mono text-xs text-neutral-500">{fmt(now - activity.timestamps.start)} elapsed</p>
        )}
      </div>
    </div>
  )
}

export function ActivityCard({ presence, className = "" }: { presence: Presence; className?: string }) {
  // custom status (4) udah di profile, spotify punya card sendiri
  const list = presence.activities.filter((a) => a.type !== 4 && a.name !== "Spotify")

  return (
    <SpotlightCard spotlightColor={SPOTLIGHT} className={`flex flex-col ${className}`}>
      <CardTitle icon={<span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />}>Live activity</CardTitle>
      {list.length === 0 ? (
        <div className="grid flex-1 place-items-center py-8 text-center">
          <div>
            <i className="bi bi-moon-stars text-2xl text-neutral-600" />
            <p className="mt-2 text-sm text-neutral-500">Nothing going on right now.</p>
          </div>
        </div>
      ) : (
        <div className="scrollbar-none scroll-fade -mx-2 min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-2">
          {list.map((a) => (
            <ActivityItem key={a.id} activity={a} kv={presence.kv} />
          ))}
        </div>
      )}
    </SpotlightCard>
  )
}

/* ---------- Spotify (server/spotify.ts) ---------- */

const API = "/api/spotify"

interface NowPlaying {
  playing: boolean
  progress: number
  duration: number
  track: { name: string; artists: string; album: string; image: string | null; url: string }
}

function useNowPlaying() {
  const [state, setState] = useState<{ np: NowPlaying | null; at: number }>({ np: null, at: 0 })

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch(`${API}/now-playing`)
        .then((r) => (r.ok ? r.json() : null))
        .then((np) => alive && setState({ np, at: Date.now() }))
        .catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  return state
}

export function NowPlayingCard({ className = "" }: { className?: string }) {
  const { np, at } = useNowPlaying()
  const now = useNow(!!np?.playing)

  if (!np) {
    return (
      <SpotlightCard spotlightColor={SPOTLIGHT} className={`flex flex-col ${className}`}>
        <CardTitle icon={<i className="bi bi-spotify text-sm" />}>Now playing</CardTitle>
        <div className="flex flex-1 items-center gap-4">
          <div className="flex h-10 items-end gap-1">
            {[0.4, 0.7, 0.3, 0.55].map((h, i) => (
              <span key={i} className="w-1.5 rounded-full bg-neutral-700" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
          <p className="text-sm text-neutral-500">Not listening to anything.</p>
        </div>
      </SpotlightCard>
    )
  }

  const { track, duration } = np
  const elapsed = np.playing ? Math.min(np.progress + now - at, duration) : np.progress

  return (
    <SpotlightCard spotlightColor="rgba(249, 115, 22, 0.18)" className={`flex flex-col ${className}`}>
      {track.image && (
        <div className="absolute inset-0 scale-125 bg-cover bg-center opacity-20 blur-3xl" style={{ backgroundImage: `url(${track.image})` }} />
      )}
      <div className="relative">
        <CardTitle icon={<i className="bi bi-spotify text-sm text-[#1ed760]" />}>{np.playing ? "Now playing" : "Paused"}</CardTitle>
        <a href={track.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
          {track.image && (
            <img
              src={track.image}
              alt={track.album}
              className={`size-20 shrink-0 rounded-full object-cover ring-4 ring-white/40 motion-safe:animate-[spin_12s_linear_infinite] ${np.playing ? "" : "[animation-play-state:paused]"}`}
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{track.name}</p>
            <p className="truncate text-sm text-neutral-400">{track.artists}</p>
            <p className="truncate text-xs text-neutral-500">{track.album}</p>
          </div>
        </a>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${np.playing ? "bg-linear-to-r from-iris to-ember" : "bg-neutral-500"}`}
            style={{ width: `${(elapsed / duration) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-neutral-500">
          <span>{fmt(elapsed)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </SpotlightCard>
  )
}

/* ---------- Top tracks / artists ---------- */

interface TopItem {
  name: string
  sub: string
  image: string | null
  url: string
}

type TopTab = "tracks" | "artists"
const TOP_TABS: { value: TopTab; label: string }[] = [
  { value: "tracks", label: "Tracks" },
  { value: "artists", label: "Artists" },
]

export function TopCard({ className = "" }: { className?: string }) {
  const [tab, setTab] = useState<TopTab>("tracks")
  const [data, setData] = useState<Partial<Record<TopTab, TopItem[] | "error">>>({})

  // ambil dua-duanya sekali di awal biar ganti tab nggak loading lagi
  useEffect(() => {
    for (const { value } of TOP_TABS) {
      fetch(`${API}/top-${value}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((items: TopItem[]) => setData((d) => ({ ...d, [value]: items })))
        .catch(() => setData((d) => ({ ...d, [value]: "error" })))
    }
  }, [])

  const items = data[tab]
  const round = tab === "artists" ? "rounded-full" : "rounded-lg"
  const [first, ...rest] = Array.isArray(items) ? items : []

  return (
    <SpotlightCard spotlightColor={SPOTLIGHT} className={`flex flex-col ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-300">Top · 4 weeks</span>
        <RubberSegment
          items={TOP_TABS}
          value={tab}
          onChange={(v) => setTab(v as TopTab)}
          size="sm"
          trackColor="rgba(255, 255, 255, 0.06)"
          thumbColor="linear-gradient(135deg, var(--color-iris), var(--color-ember))"
          textColor="#a3a3a3"
          activeTextColor="#ffffff"
          aria-label="Top tracks or artists"
          className="text-xs"
        />
      </div>

      {/* #1 ikut ke-scroll bareng list biar layar pendek tetap kebaca */}
      <div className="scrollbar-none scroll-fade -mx-2 min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {items === "error" ? (
          <p className="text-sm text-neutral-500">Couldn't load top {tab}.</p>
        ) : !first ? (
          <div className="space-y-2">
            <div className="h-[88px] animate-pulse rounded-xl bg-white/5" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        ) : (
          // key = tab biar animasinya keulang tiap ganti tab
          <div key={tab}>
            <motion.a
              href={first.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-white/10 p-3"
            >
              {first.image && (
                <div
                  className="absolute inset-0 scale-150 bg-cover bg-center opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
                  style={{ backgroundImage: `url(${first.image})` }}
                />
              )}
              <div className="relative shrink-0">
                {first.image && <img src={first.image} alt="" aria-hidden className={`absolute inset-0 size-16 ${round} opacity-70 blur-lg`} />}
                {first.image ? (
                  <img
                    src={first.image}
                    alt=""
                    className={`relative size-16 ${round} object-cover shadow-lg shadow-black/40 ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105`}
                  />
                ) : (
                  <div className={`relative size-16 ${round} bg-white/10`} />
                )}
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ember">Most played</p>
                <p className="truncate text-lg font-semibold tracking-tight text-white">{first.name}</p>
                {first.sub && <p className="truncate text-sm text-neutral-300/80">{first.sub}</p>}
              </div>
              <span className="relative select-none bg-linear-to-br from-iris to-ember bg-clip-text pr-1 text-5xl font-black leading-none tracking-tighter text-transparent">
                01
              </span>
            </motion.a>

            <ol className="mt-2 space-y-0.5">
              {rest.map((item, i) => (
                <motion.li
                  key={item.url}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + Math.min(i, 10) * 0.035, duration: 0.3, ease: "easeOut" }}
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06]"
                  >
                    <span
                      className={`w-6 font-mono text-xs tabular-nums ${
                        i < 2 ? "bg-linear-to-br from-iris to-ember bg-clip-text font-bold text-transparent" : "text-neutral-500 group-hover:text-neutral-300"
                      }`}
                    >
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className={`size-10 shrink-0 ${round} object-cover ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105`}
                      />
                    ) : (
                      <div className={`size-10 shrink-0 ${round} bg-white/5`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-200 group-hover:text-white">{item.name}</p>
                      {item.sub && <p className="truncate text-xs text-neutral-500">{item.sub}</p>}
                    </div>
                    <ArrowUpRight
                      size={14}
                      className="shrink-0 -translate-x-1 text-neutral-500 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </a>
                </motion.li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </SpotlightCard>
  )
}

/* ---------- GitHub & jam ---------- */

interface Contributions {
  login: string
  total: number
  weeks: { date: string; count: number; level: number }[][]
}

const GITHUB_URL = import.meta.env.VITE_GITHUB_URL
const dayLabel = (date: string) =>
  new Date(`${date}T00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })

// iris -> ember, level 3 campuran keduanya
const LEVEL_BG = ["bg-white/[0.06]", "bg-iris/45", "bg-iris", "bg-[color-mix(in_oklab,var(--color-iris),var(--color-ember))]", "bg-ember"]

export function GitHubCard({ className = "" }: { className?: string }) {
  const [data, setData] = useState<Contributions | "error" | null>(null)

  useEffect(() => {
    fetch("/api/github")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData("error"))
  }, [])

  return (
    <SpotlightCard spotlightColor={SPOTLIGHT} className={className}>
      <CardTitle
        icon={
          data && data !== "error" && (
            <span>
              <CountUp to={data.total} separator="," duration={1.5} /> contributions
            </span>
          )
        }
      >
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
          <i className="bi bi-github mr-2" />
          GitHub
        </a>
      </CardTitle>
      {data === "error" ? (
        <p className="text-sm text-neutral-500">Couldn't load contributions.</p>
      ) : !data ? (
        <div className="h-[75px] animate-pulse rounded-lg bg-white/5" />
      ) : (
        // minggu terbaru di kanan, minggu lama kepotong di kiri sesuai lebar card
        <div className="flex justify-end gap-[2px] overflow-hidden">
          {data.weeks.map((week) => (
            <div key={week[0].date} className="flex shrink-0 flex-col gap-[2px]">
              {week.map((d) => (
                <span
                  key={d.date}
                  data-tip={`${d.count || "No"} contribution${d.count === 1 ? "" : "s"}`}
                  data-tip-sub={dayLabel(d.date)}
                  className={`size-[9px] rounded-[2px] transition-transform hover:scale-150 ${LEVEL_BG[d.level] ?? LEVEL_BG[0]}`}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </SpotlightCard>
  )
}

export function ClockCard({ className = "" }: { className?: string }) {
  const now = useNow()
  const time = new Date(now).toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour12: false })
  const [h] = time.split(":").map(Number)
  const mood = h < 5 ? "probably asleep" : h < 11 ? "morning" : h < 15 ? "afternoon" : h < 19 ? "evening" : "night owl hours"

  return (
    <SpotlightCard spotlightColor={SPOTLIGHT} className={className}>
      <CardTitle icon={<span className="text-[10px]">UTC+7</span>}>Local time</CardTitle>
      <p className="font-mono text-4xl font-medium tabular-nums tracking-tight text-white">{time}</p>
      <p className="mt-1 text-sm text-neutral-500">Jakarta · {mood}</p>
    </SpotlightCard>
  )
}

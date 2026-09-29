import { useEffect, useState } from "react"
import { useLanyard } from "use-lanyard"
import Grainient from "@/components/Grainient"
import DecryptedText from "@/components/DecryptedText"
import ShinyText from "@/components/ShinyText"
import Dock from "@/components/Dock"
import HoverTip from "@/components/HoverTip"
import { ActivityCard, ClockCard, GitHubCard, NowPlayingCard, ProfileCard, TopCard } from "@/components/hub"

const USER_ID = import.meta.env.VITE_DISCORD_USER_ID as `${bigint}`

// sekali per page load, di luar react biar StrictMode nggak ngitung dobel
const viewsRequest: Promise<{ views: number } | null> = fetch("/api/views", { method: "POST" })
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null)

const SOCIALS = [
  { icon: "github", label: "GitHub", href: import.meta.env.VITE_GITHUB_URL },
  { icon: "spotify", label: "Spotify", href: import.meta.env.VITE_SPOTIFY_URL },
  { icon: "steam", label: "Steam", href: import.meta.env.VITE_STEAM_URL },
  { icon: "globe", label: "Website", href: import.meta.env.VITE_WEBSITE_URL },
].filter((s) => s.href)

const dockProps = {
  className: "border-white/10! bg-neutral-950/60 backdrop-blur-xl",
  items: SOCIALS.map((s) => ({
    icon: <i className={`bi bi-${s.icon} text-lg text-neutral-200`} />,
    label: s.label,
    onClick: () => window.open(s.href, "_blank", "noopener,noreferrer"),
  })),
  panelHeight: 64,
  baseItemSize: 48,
  magnification: 68,
}

export default function App() {
  const presence = useLanyard(USER_ID)
  const [minTimePassed, setMinTimePassed] = useState(false)
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    viewsRequest.then((d) => d && setViews(d.views))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const name = presence?.discord_user.global_name ?? presence?.discord_user.username ?? "klatzmeister"

  return (
    <div className="relative min-h-svh text-neutral-200 selection:bg-iris/50">
      <div className="fixed inset-0 -z-10 bg-neutral-950">
        {/* palet utama web, disamain sama @theme di index.css */}
        <Grainient
          color1="#F97316"
          color2="#5227FF"
          color3="#ffffff"
          timeSpeed={0.25}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          contrast={1.5}
          zoom={1.1}
        />
      </div>

      {!presence || !minTimePassed ? (
        <div className="grid min-h-svh place-items-center">
          <DecryptedText
            text="./initializing"
            animateOn="view"
            speed={40}
            maxIterations={20}
            className="font-mono text-sm uppercase tracking-[0.4em] text-neutral-300"
            encryptedClassName="font-mono text-sm uppercase tracking-[0.4em] text-ember/80"
          />
        </div>
      ) : (
        <>
          {/* lg ke atas: pas satu layar, card bawah scroll di dalem. layar kecil tetap scroll biasa */}
          <div className="flex flex-col lg:h-svh">
            <header className="sticky top-0 z-40 shrink-0">
              <div className="mx-auto flex max-w-6xl items-center justify-between p-6 pb-0">
                <span className="font-mono text-sm lowercase text-neutral-300">./{name}</span>
                {views !== null && <ShinyText text={`${views.toLocaleString("en-US")} page views`} speed={3} color="#ffffff" shineColor="#e5e5e5" className="text-xs" />}
              </div>
            </header>

            {/* pb-24 = ruang dock bawah; xl ke atas dock pindah ke kanan & floating */}
            <main className="mx-auto w-full max-w-6xl min-h-0 flex-1 px-6 pt-6 pb-24 xl:pb-6">
              <section className="grid h-full grid-cols-1 gap-4 md:grid-cols-6 lg:grid-rows-[auto_auto_minmax(12rem,1fr)]">
                <ProfileCard presence={presence} className="md:col-span-3 lg:col-span-2 lg:row-span-2" />
                <NowPlayingCard className="md:col-span-3 lg:col-span-4" />
                <ClockCard className="md:col-span-3 lg:col-span-2" />
                <GitHubCard className="md:col-span-3 lg:col-span-2" />
                <ActivityCard presence={presence} className="max-h-96 md:col-span-3 lg:max-h-none" />
                <TopCard className="max-h-96 md:col-span-3 lg:max-h-none" />
              </section>
            </main>
          </div>

          <HoverTip />

          {SOCIALS.length > 0 && (
            <>
              <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
                <Dock orientation="vertical" {...dockProps} />
              </div>
              <div className="fixed inset-x-0 bottom-4 z-40 xl:hidden">
                <Dock {...dockProps} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

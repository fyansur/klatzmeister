import type { IncomingMessage, ServerResponse } from "node:http"

// backend spotify mini, dipasang di dev server vite (vite.config.ts) & server/index.ts buat production
export type Env = Record<string, string | undefined>

const SCOPES = "user-read-currently-playing user-top-read"
const NOW_PLAYING_TTL = 5_000
const TOP_TTL = 30 * 60_000
const TOP_RANGE = "short_term" // ~4 minggu terakhir. medium_term = 6 bulan, long_term = ~1 tahun

// cache kecil biar banyak visitor nggak nembak API luar tiap request (dipake github.ts juga)
export function cached<T>(ttl: number, load: () => Promise<T>) {
  let value: T
  let at = 0
  let pending: Promise<T> | null = null
  return async () => {
    if (Date.now() - at >= ttl) {
      pending ??= load()
        .then((v) => ((value = v), (at = Date.now()), v))
        .finally(() => (pending = null))
      await pending
    }
    return { value, at }
  }
}

export function spotifyApi(env: Env) {
  const {
    SPOTIFY_CLIENT_ID: clientId,
    SPOTIFY_CLIENT_SECRET: clientSecret,
    SPOTIFY_REDIRECT_URI: redirectUri,
    SPOTIFY_REFRESH_TOKEN: refreshToken,
  } = env

  async function tokenRequest(body: Record<string, string>) {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    })
    const data: any = await r.json()
    if (!r.ok) throw new Error(`spotify token: ${data.error_description ?? data.error}`)
    return data
  }

  let token = { value: "", expiresAt: 0 }
  async function api(path: string) {
    if (Date.now() > token.expiresAt - 60_000) {
      const data = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken! })
      token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
    }
    return fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${token.value}` } })
  }

  const nowPlaying = cached(NOW_PLAYING_TTL, async () => {
    const r = await api("/me/player/currently-playing")
    if (r.status === 204) return null
    if (!r.ok) throw new Error(`spotify now-playing: ${r.status}`)
    const d: any = await r.json()
    if (!d.item) return null // iklan / podcast
    return {
      playing: d.is_playing as boolean,
      progress: d.progress_ms as number,
      duration: d.item.duration_ms as number,
      track: {
        name: d.item.name as string,
        artists: d.item.artists.map((a: { name: string }) => a.name).join(", ") as string,
        album: d.item.album.name as string,
        image: (d.item.album.images[0]?.url ?? null) as string | null,
        url: d.item.external_urls.spotify as string,
      },
    }
  })

  async function top(type: "tracks" | "artists") {
    const r = await api(`/me/top/${type}?limit=20&time_range=${TOP_RANGE}`)
    if (!r.ok) throw new Error(`spotify top ${type}: ${r.status}`)
    const { items }: any = await r.json()
    return items
  }

  // bentuk sama buat tracks & artists: { name, sub, image, url }
  const topTracks = cached(TOP_TTL, async () =>
    (await top("tracks")).map((t: any) => ({
      name: t.name as string,
      sub: t.artists.map((a: { name: string }) => a.name).join(", ") as string,
      image: (t.album.images[1]?.url ?? t.album.images[0]?.url ?? null) as string | null,
      url: t.external_urls.spotify as string,
    })),
  )
  const topArtists = cached(TOP_TTL, async () =>
    (await top("artists")).map((a: any) => ({
      name: a.name as string,
      sub: (a.genres ?? []).slice(0, 2).join(", ") as string,
      image: (a.images?.[1]?.url ?? a.images?.[0]?.url ?? null) as string | null,
      url: a.external_urls.spotify as string,
    })),
  )

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost")
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(JSON.stringify(body))
    }

    const route = url.pathname.match(/^\/api\/spotify\/([\w-]+)$/)?.[1]
    if (!route) return next()
    if (!clientId || !clientSecret) return send(503, { error: "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET missing in .env" })

    try {
      switch (route) {
        // sekali jalan buat dapet refresh token, ulangi kalau scope berubah / token di-revoke
        case "login":
          res.writeHead(302, {
            Location: "https://accounts.spotify.com/authorize?" + new URLSearchParams({ response_type: "code", client_id: clientId, scope: SCOPES, redirect_uri: redirectUri! }),
          })
          return res.end()

        case "callback": {
          const code = url.searchParams.get("code")
          if (!code) return send(400, { error: url.searchParams.get("error") ?? "missing code" })
          const data = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri! })
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
          return res.end(`Paste this into .env, then restart the server:\n\nSPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`)
        }

        case "now-playing": {
          if (!refreshToken) return send(503, { error: "not connected, open /api/spotify/login" })
          const { value, at } = await nowPlaying()
          // majuin progress sesuai umur cache
          return send(200, value && { ...value, progress: value.playing ? Math.min(value.progress + Date.now() - at, value.duration) : value.progress })
        }

        case "top-tracks":
        case "top-artists": {
          if (!refreshToken) return send(503, { error: "not connected, open /api/spotify/login" })
          const { value } = await (route === "top-tracks" ? topTracks : topArtists)()
          return send(200, value)
        }

        default:
          return send(404, { error: "not found" })
      }
    } catch (err) {
      console.error(err)
      send(502, { error: "spotify request failed" })
    }
  }
}

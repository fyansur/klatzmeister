import type { IncomingMessage, ServerResponse } from "node:http"
import { cached, type Env } from "./spotify.ts"

// lanyard nggak ngasih banner, jadi ambil langsung dari discord pake bot token
const TTL = 15 * 60_000

export function discordApi(env: Env) {
  const { DISCORD_BOT_TOKEN: token, VITE_DISCORD_USER_ID: userId } = env

  const profile = cached(TTL, async () => {
    const r = await fetch(`https://discord.com/api/v10/users/${userId}`, { headers: { Authorization: `Bot ${token}` } })
    if (!r.ok) throw new Error(`discord: ${r.status} ${await r.text()}`)
    const u: any = await r.json()
    return {
      banner: u.banner
        ? `https://cdn.discordapp.com/banners/${u.id}/${u.banner}.webp?size=600${u.banner.startsWith("a_") ? "&animated=true" : ""}`
        : null,
      color: (u.banner_color ?? null) as string | null,
    }
  })

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (new URL(req.url ?? "/", "http://localhost").pathname !== "/api/discord") return next()
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(JSON.stringify(body))
    }

    if (!token || !userId) return send(503, { error: "DISCORD_BOT_TOKEN / VITE_DISCORD_USER_ID missing in .env" })
    try {
      send(200, (await profile()).value)
    } catch (err) {
      console.error(err)
      send(502, { error: "discord request failed" })
    }
  }
}

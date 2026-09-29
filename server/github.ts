import type { IncomingMessage, ServerResponse } from "node:http"
import { cached, type Env } from "./spotify.ts"

const TTL = 60 * 60_000
const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"]
const QUERY = `{ viewer { login contributionsCollection { contributionCalendar {
  totalContributions weeks { contributionDays { date contributionCount contributionLevel } }
} } } }`

// kalender kontribusi setahun terakhir punya pemilik GITHUB_TOKEN
export function githubApi(env: Env) {
  const token = env.GITHUB_TOKEN

  const calendar = cached(TTL, async () => {
    const r = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "klatzmeister" },
      body: JSON.stringify({ query: QUERY }),
    })
    const body: any = await r.json()
    if (!r.ok || body.errors) throw new Error(`github: ${r.status} ${JSON.stringify(body.errors ?? body.message)}`)
    const cal = body.data.viewer.contributionsCollection.contributionCalendar
    return {
      login: body.data.viewer.login as string,
      total: cal.totalContributions as number,
      // weeks[minggu][hari minggu..sabtu]
      weeks: cal.weeks.map((w: any) =>
        w.contributionDays.map((d: any) => ({ date: d.date as string, count: d.contributionCount as number, level: LEVELS.indexOf(d.contributionLevel) })),
      ),
    }
  })

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (new URL(req.url ?? "/", "http://localhost").pathname !== "/api/github") return next()
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(JSON.stringify(body))
    }

    if (!token) return send(503, { error: "GITHUB_TOKEN missing in .env" })
    try {
      send(200, (await calendar()).value)
    } catch (err) {
      console.error(err)
      send(502, { error: "github request failed" })
    }
  }
}

import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join, resolve, sep } from "node:path"
import { spotifyApi } from "./spotify.ts"
import { githubApi } from "./github.ts"
import { discordApi } from "./discord.ts"
import { viewsApi } from "./views.ts"

// production: npm run build && npm run server. /api/* + file dist/ dari satu proses
const apis = [spotifyApi(process.env), githubApi(process.env), discordApi(process.env), viewsApi()]
const port = Number(process.env.PORT ?? 3001)

const DIST = resolve("dist")
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname)
  } catch {
    return res.writeHead(400).end()
  }
  const file = resolve(join(DIST, pathname === "/" ? "index.html" : pathname))
  // tolak ../ yang keluar dari dist
  if (!file.startsWith(DIST + sep)) return res.writeHead(404).end()

  try {
    const body = await readFile(file)
    // file di assets/ namanya ada hash, aman di-cache lama
    const cache = pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache"
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": cache })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
}

createServer((req, res) => {
  // oper ke api berikutnya kalau path-nya bukan punya dia, terakhir baru file statis
  const run = (i: number): unknown => (i < apis.length ? apis[i](req, res, () => run(i + 1)) : serveStatic(req, res))
  run(0)
}).listen(port, () => {
  console.log(`klatzmeister on :${port}`)
})

import type { IncomingMessage, ServerResponse } from "node:http"
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

// counter page view, disimpen di file. production: mount .data/ ke volume biar nggak reset pas redeploy
const FILE = ".data/views.json"

function load() {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")).views as number
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return 0
    throw err // file ada tapi rusak: mending error daripada ketimpa jadi 0
  }
}

export function viewsApi() {
  let views = load()

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== "POST" || new URL(req.url ?? "/", "http://localhost").pathname !== "/api/views") return next()
    res.setHeader("Content-Type", "application/json")
    try {
      mkdirSync(dirname(FILE), { recursive: true })
      // tulis ke tmp dulu terus rename, biar file nggak setengah jadi kalau proses mati di tengah
      writeFileSync(`${FILE}.tmp`, JSON.stringify({ views: views + 1 }))
      renameSync(`${FILE}.tmp`, FILE)
      views++
      res.end(JSON.stringify({ views }))
    } catch (err) {
      console.error(err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: "failed to save views" }))
    }
  }
}

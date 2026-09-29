import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from "@tailwindcss/vite";
import { spotifyApi } from "./server/spotify.ts";
import { githubApi } from "./server/github.ts";
import { discordApi } from "./server/discord.ts";
import { viewsApi } from "./server/views.ts";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apis = [spotifyApi(env), githubApi(env), discordApi(env), viewsApi()];

  return {
    plugins: [
      react(),
      tailwindcss(),
      // /api/* langsung di dev server, nggak perlu nyalain backend terpisah
      {
        name: "api",
        configureServer: (server) => apis.forEach((api) => server.middlewares.use(api)),
        configurePreviewServer: (server) => apis.forEach((api) => server.middlewares.use(api)),
      },
    ],
    // callback spotify cuma nerima 127.0.0.1, bukan localhost
    server: { host: "127.0.0.1" },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

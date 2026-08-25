import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite rejects requests whose Host header it doesn't recognise (a
    // DNS-rebinding protection). Tunnel URLs (loca.lt, ngrok, etc.) have
    // an unpredictable hostname each run, so allow any host - this is
    // only ever run for short local dev / user-testing sessions, never
    // deployed as-is.
    allowedHosts: true,
    // Vite defaults to the IPv6 loopback (::1) only. Tunnel tools
    // (localtunnel, ngrok) connect via IPv4 127.0.0.1, so without this
    // the tunnel gets "connection refused" even though the dev server
    // is "running".
    host: "127.0.0.1",
  },
  // Same two settings for `vite preview` (serving the production build) -
  // this is what's actually tunneled for remote user testing, since a
  // static build avoids the dev server's HMR websocket and heavy
  // per-module request count, both of which were unreliable over a free
  // localtunnel connection.
  preview: {
    allowedHosts: true,
    host: "127.0.0.1",
    port: 4173,
  },
})

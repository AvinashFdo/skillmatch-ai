import axios from "axios";

// The frontend only ever talks to the Node/Express backend - never
// directly to the Python AI service, matching the proposed architecture.
//
// Configurable via VITE_API_BASE_URL (set in frontend/.env) so this can
// point at a public tunnel URL during remote user testing without
// touching source code - defaults back to localhost for normal dev.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // Skips localtunnel's interstitial "friendly reminder" HTML page,
    // which would otherwise break JSON parsing on the first request
    // through a loca.lt tunnel URL. Harmless/ignored against localhost.
    "bypass-tunnel-reminder": "true",
  },
});

export default apiClient;

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // skips localtunnel's interstitial HTML page
    "bypass-tunnel-reminder": "true",
  },
});

export default apiClient;

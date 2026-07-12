import axios from "axios";

const apiBaseUrl = (process.env.UMI_APP_API_BASE_URL || "").replace(/\/$/, "");

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export function configureHttpClient() {
  if (apiBaseUrl) {
    axios.defaults.baseURL = apiBaseUrl;
  }
  axios.defaults.withCredentials = true;
}

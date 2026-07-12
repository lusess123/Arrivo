import axios from "axios";
import { redirectToLogin } from './auth-redirect';

const apiBaseUrl = (process.env.UMI_APP_API_BASE_URL || "").replace(/\/$/, "");
let interceptorConfigured = false;

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export function configureHttpClient() {
  if (apiBaseUrl) {
    axios.defaults.baseURL = apiBaseUrl;
  }
  axios.defaults.withCredentials = true;

  if (interceptorConfigured) return;
  interceptorConfigured = true;
  axios.interceptors.response.use(
    response => response,
    error => {
      if (error?.response?.status === 401) redirectToLogin();
      return Promise.reject(error);
    },
  );
}

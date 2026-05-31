import axios from "axios";
const baseURL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({ baseURL, timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("merchant_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("merchant_token");
      localStorage.removeItem("merchant_user");
    }
    return Promise.reject(err);
  }
);
export default api;

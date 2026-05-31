import api from "./client";

export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  const token = data.token || data.accessToken;
  const user = data.user || data;
  if (!token) throw new Error("No token returned");
  if (user?.role && user.role !== "admin") throw new Error("Not an admin account");
  localStorage.setItem("admin_token", token);
  localStorage.setItem("admin_user", JSON.stringify(user));
  return { token, user };
};

export const logout = () => {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
};

export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem("admin_user") || "null"); }
  catch { return null; }
};

export const isLoggedIn = () => !!localStorage.getItem("admin_token");

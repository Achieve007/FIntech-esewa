import api from "./client";

export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  const token = data.token || data.accessToken;
  const user = data.user || data;
  if (!token) throw new Error("No token returned");
  localStorage.setItem("merchant_token", token);
  localStorage.setItem("merchant_user", JSON.stringify(user));
  return { token, user };
};

export const register = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  return data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await api.put("/auth/change-password", { currentPassword, newPassword });
  return data;
};

export const logout = () => {
  localStorage.removeItem("merchant_token");
  localStorage.removeItem("merchant_user");
};

export const isLoggedIn = () => !!localStorage.getItem("merchant_token");

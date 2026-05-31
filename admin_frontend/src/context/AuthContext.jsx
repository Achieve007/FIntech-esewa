import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authApi.getStoredUser());
  const [ready, setReady] = useState(true);

  const login = async (email, password) => {
    const { user } = await authApi.login(email, password);
    setUser(user);
    return user;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, ready, login, logout, isAuthed: !!user }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { get_current_user, get_stored_token, login, set_stored_token } from "../api/hydropulse_api";

// Контекст авторизации хранит текущего пользователя и токен.
// Им пользуются Login, Sidebar и Admin, чтобы понимать роль пользователя.
const AuthContext = createContext({
  user: null,
  token: "",
  isLoading: true,
  isAdmin: false,
  loginUser: async () => {},
  logout: () => {},
});

export const AuthContextProvider = ({ children }) => {
  const [token, setToken] = useState(get_stored_token());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    let is_active = true;

    async function load_user() {
      // Если токена нет, пользователь считается гостем.
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // Если токен есть, проверяем его на backend через /api/auth/me.
        const result = await get_current_user();
        if (is_active) setUser(result.user);
      } catch (error) {
        // Просроченный или поврежденный токен удаляем из localStorage.
        set_stored_token("");
        if (is_active) {
          setToken("");
          setUser(null);
        }
      } finally {
        if (is_active) setIsLoading(false);
      }
    }

    load_user();

    return () => {
      is_active = false;
    };
  }, [token]);

  const loginUser = useCallback(async (username, password) => {
    // После успешного входа сохраняем токен, чтобы перезагрузка страницы не выбивала из системы.
    const result = await login(username, password);
    set_stored_token(result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    // Выход полностью очищает локальную сессию.
    set_stored_token("");
    setToken("");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAdmin: Boolean(user && user.role === "admin"),
      loginUser,
      logout,
    }),
    [user, token, isLoading, loginUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  return useContext(AuthContext);
}

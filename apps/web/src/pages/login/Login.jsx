import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import "./login.scss";

// Страница входа работает с AuthContext: после успешного логина токен сохраняется,
// и пользователь переходит в админку.
const Login = () => {
  const navigate = useNavigate();
  const { user, loginUser, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await loginUser(username, password);
      navigate("/admin");
    } catch (err) {
      setError("Неверный логин или пароль");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className="loginPage">
        <div className="loginPanel">
          <h1>Вы вошли</h1>
          <p>{user.username} · {user.role}</p>
          <div className="loginActions">
            <button type="button" onClick={() => navigate("/admin")}>База данных</button>
            <button type="button" className="secondary" onClick={logout}>Выйти</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loginPage">
      <form className="loginPanel" onSubmit={handleSubmit}>
        <h1>Вход в HydroPulse</h1>
        <p>Администратор может добавлять, редактировать и удалять данные. Обычный пользователь только просматривает.</p>

        <label>
          Логин
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>

        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <div className="loginError">{error}</div>}

        <button type="submit" disabled={isSubmitting || !username.trim() || !password}>
          {isSubmitting ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
};

export default Login;

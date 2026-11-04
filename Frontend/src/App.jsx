
import { useState, useEffect } from "react";
import "./App.css";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import UsersPage from "./pages/Users";
import Login from "./pages/Login";
import Jobs from "./pages/Jobs";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {

  const [activePage, setActivePage] = useState("Dashboard");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Load the previously selected theme.
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  useEffect(() => {
    if (currentUser) {
      console.log(
        "CURRENT USER:",
        JSON.stringify(currentUser, null, 2)
      );
    }
  }, [currentUser]);
  // Apply the theme to the entire application.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Verify the saved login token when the app starts.
  useEffect(() => {
    async function verifyAuthentication() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Authentication failed.");
        }

        const user = await response.json();

        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("access_token");
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    verifyAuthentication();
  }, []);

  // Called after a successful login.
  async function handleLoginSuccess(user) {
    setCurrentUser(user);
    setActivePage("Dashboard");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to retrieve user profile.");
      }

      const freshUser = await response.json();

      setCurrentUser(freshUser);
      setIsAuthenticated(true);

    } catch (error) {
      console.error("Failed to refresh user profile:", error);

      localStorage.removeItem("access_token");
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  }


  // Log out the current user.
  function handleLogout() {
    localStorage.removeItem("access_token");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActivePage("Dashboard");
  }

  // Toggle between light and dark themes.
  function handleToggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
  }

  // Show a loading message while verifying the session.
  if (isCheckingAuth) {
    return (
      <div className="auth-loading">
        Verifying your session...
      </div>
    );
  }

  // Show login when the user is not authenticated.
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render the authenticated application.
  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <div className="main-area">
        <Topbar
          onLogout={handleLogout}
          currentUser={currentUser}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {activePage === "Dashboard" && <Dashboard />}

        {activePage === "Companies" && <Companies />}

        {activePage === "Users" && (
          <UsersPage currentUser={currentUser} />
        )}

        {activePage === "Jobs" && (
          <Jobs currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}

export default App;

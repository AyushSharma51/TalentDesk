
import { useState, useEffect } from "react";
import "./App.css";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";

import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import UsersPage from "./pages/Users";
import Login from "./pages/Login";
import Jobs from "./pages/Jobs";
import Applicants from "./pages/Applicants";
import ApplicantDetails from "./pages/ApplicantDetails";
import Interviews from "./pages/Interviews";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedApplicantId, setSelectedApplicantId] = useState(null);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );

  // Apply the selected theme.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Verify the user's existing authentication session.
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
      } catch (error) {
        console.error("Authentication verification failed:", error);

        localStorage.removeItem("access_token");
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    verifyAuthentication();
  }, []);

  // Refresh the user profile after a successful login.
  async function handleLoginSuccess() {
    setActivePage("Dashboard");
    setSelectedApplicantId(null);

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
    setSelectedApplicantId(null);
  }

  // Handle sidebar navigation.
  function handlePageChange(page) {
    setActivePage(page);
    setSelectedApplicantId(null);
  }

  // Return to the applicants listing.
  function handleBackToApplicants() {
    setSelectedApplicantId(null);
  }

  // Toggle between light and dark themes.
  function handleToggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
  }

  // Show authentication loading screen.
  if (isCheckingAuth) {
    return (
      <div className="auth-loading">
        Verifying your session...
      </div>
    );
  }

  // Show login screen when unauthenticated.
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={handlePageChange}
      />

      <div className="main-area">
        <Topbar
          onLogout={handleLogout}
          currentUser={currentUser}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          activePage={activePage}
        />

        {/* Dashboard */}
        {activePage === "Dashboard" && (
          <Dashboard currentUser={currentUser} />
        )}

        {/* Companies */}
        {activePage === "Companies" && (
          <Companies />
        )}

        {/* Users */}
        {activePage === "Users" && (
          <UsersPage currentUser={currentUser} />
        )}

        {/* Jobs */}
        {activePage === "Jobs" && (
          <Jobs currentUser={currentUser} />
        )}

        {/* Applicants */}
        {activePage === "Applicants" && (
          selectedApplicantId ? (
            <ApplicantDetails
              applicantId={selectedApplicantId}
              onBack={handleBackToApplicants}
            />
          ) : (
            <Applicants
              currentUser={currentUser}
              onViewApplicant={setSelectedApplicantId}
            />
          )
        )}

        {/* Interviews */}
        {activePage === "Interviews" && (
          <Interviews currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}

export default App;

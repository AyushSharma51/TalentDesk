
import { useState } from "react";
import { Sun, Moon, CalendarDays } from "lucide-react";

function Topbar({ onLogout, currentUser, theme, onToggleTheme }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // User information
  const userName = currentUser?.full_name || "User";
  const userEmail = currentUser?.email || "";

  // Determine the role to display in the profile
  const isSuperAdmin = currentUser?.global_role === "super_admin";
  const companyAssignments = currentUser?.company_assignments || [];

  const userRole = isSuperAdmin
    ? "super_admin"
    : companyAssignments.find(
        (assignment) => assignment.role === "admin"
      )?.role ||
      companyAssignments[0]?.role ||
      currentUser?.global_role ||
      "user";

  // Format the role for display
  const formattedRole = userRole
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  // Generate initials for the profile avatar
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Format today's date
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Close the profile menu and log out
  function handleLogout() {
    setIsProfileOpen(false);
    onLogout();
  }

  return (
    <header className="topbar">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        Workspace <span>/</span> <strong>Dashboard</strong>
      </div>

      {/* Today's date */}
      <div className="date-display" aria-label={`Today's date: ${today}`}>
        <CalendarDays size={16} strokeWidth={1.8} />
        <span>{today}</span>
      </div>

      {/* Theme toggle and profile */}
      <div className="topbar-actions">
        {/* Light / dark mode toggle */}
        <button
          type="button"
          className="theme-toggle-button"
          onClick={onToggleTheme}
          aria-label={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          title={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {theme === "dark" ? (
            <Sun size={19} strokeWidth={1.8} />
          ) : (
            <Moon size={19} strokeWidth={1.8} />
          )}
        </button>

        {/* Profile avatar and dropdown */}
        <div className="profile-menu">
          <button
            type="button"
            className="profile-avatar"
            aria-label="Toggle profile menu"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen((open) => !open)}
          >
            {initials || "U"}
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown">
              <div className="profile-details">
                <strong>{userName}</strong>
                <span>{userEmail}</span>
                <span className="profile-role">{formattedRole}</span>
              </div>

              <div className="profile-divider" />

              <button
                type="button"
                className="profile-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;

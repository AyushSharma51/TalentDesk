import {
  LayoutDashboard,
  Building2,
  BriefcaseBusiness,
  Users,
  CalendarDays,
  Settings,
} from "lucide-react";

import logo from "../../assets/logo.jpg";

// Sidebar navigation items and their icons.
const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Companies", icon: Building2 },
  { label: "Jobs", icon: BriefcaseBusiness },
  { label: "Applicants", icon: Users },
  { label: "Interviews", icon: CalendarDays },
  { label: "Users", icon: Users },
];

function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sidebar">
      {/* Brand logo and application name */}
      <div className="brand">
        <img
          src={logo}
          alt="TalentDesk logo"
          className="brand-mark"
        />
        <span>TalentDesk</span>
      </div>

      {/* Main workspace navigation */}
      <p className="nav-heading">WORKSPACE</p>

      <nav className="navigation" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const isActive = activePage === item.label;

          // Only these pages are currently implemented.
          const isAvailable =
            item.label === "Dashboard" ||
            item.label === "Companies" ||
            item.label === "Jobs" ||
            item.label === "Users";
            
          // Use the Lucide icon associated with this item.
          const Icon = item.icon;

          return (
            <button
              type="button"
              className={`nav-item ${isActive ? "active" : ""}`}
              key={item.label}
              onClick={() => {
                if (isAvailable) {
                  setActivePage(item.label);
                }
              }}
              aria-current={isActive ? "page" : undefined}
              title={
                isAvailable
                  ? item.label
                  : `${item.label} page is not available yet`
              }
            >
              <span className="nav-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={1.8} />
              </span>

              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section: settings and workspace information */}
      <div className="sidebar-bottom">
        {/* Settings navigation placeholder */}
        <button
          type="button"
          className="nav-item settings-item"
          title="Settings page is not available yet"
          onClick={() => {
            // Connect the Settings page here when it is implemented.
          }}
        >
          <span className="nav-icon" aria-hidden="true">
            <Settings size={20} strokeWidth={1.8} />
          </span>

          <span className="nav-label">Settings</span>
        </button>

        {/* Current workspace information */}
        <div className="workspace-note">
          <div className="workspace-avatar">T</div>

          <div className="workspace-info">
            <strong>TalentDesk</strong>
            <small>HR Workspace</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

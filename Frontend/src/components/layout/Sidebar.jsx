
const navigationItems = [
  { label: "Dashboard", icon: "⌂" },
  { label: "Companies", icon: "▦" },
  { label: "Jobs", icon: "▤" },
  { label: "Applicants", icon: "♙" },
  { label: "Interviews", icon: "▣" },
  { label: "Users", icon: "♧" },
];

function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">T</div>
        <span>TalentDesk</span>
      </div>

      <p className="nav-heading">WORKSPACE</p>

      <nav className="navigation">
        {navigationItems.map((item) => (
          <button
            className={`nav-item ${
              activePage === item.label ? "active" : ""
            }`}
            key={item.label}
            onClick={() => {
              if (
                item.label === "Dashboard" ||
                item.label === "Companies"
              ) {
                setActivePage(item.label);
              }
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item">
          <span className="nav-icon">⚙</span>
          <span>Settings</span>
        </button>

        <div className="workspace-note">
          <div className="workspace-avatar">T</div>
          <div>
            <strong>TalentDesk</strong>
            <small>HR Workspace</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

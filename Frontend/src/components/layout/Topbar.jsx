
function Topbar() {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        Workspace <span>/</span> <strong>Dashboard</strong>
      </div>

      <div className="topbar-actions">
        <label className="search-box">
          <span>⌕</span>
          <input placeholder="Search anything..." />
          <kbd>⌘ K</kbd>
        </label>

        <button className="icon-button" aria-label="Notifications">
          ♧
        </button>

        <div className="profile-avatar">A</div>
      </div>
    </header>
  );
}

export default Topbar;

import { useState } from "react";
import "./App.css";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <div className="main-area">
        <Topbar />

        {activePage === "Dashboard" && <Dashboard />}
        {activePage === "Companies" && <Companies />}
      </div>
    </div>
  );
}

export default App;

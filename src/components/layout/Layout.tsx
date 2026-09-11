import React, { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import "../../styles/index.css";
import "./Layout.css";

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <div className="layout-container">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="main-content-wrapper">
        <TopNav onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="main-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

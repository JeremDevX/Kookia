import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import "../../styles/index.css";
import "./Layout.css";

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useLayoutEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    mainContent.scrollTop = 0;
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" });
    }
  }, [location.key, location.hash]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <div className="layout-container">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} returnFocusRef={menuButtonRef} />
      <div className="main-content-wrapper">
        <TopNav onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} menuButtonRef={menuButtonRef} />
        <main ref={mainContentRef} className="main-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

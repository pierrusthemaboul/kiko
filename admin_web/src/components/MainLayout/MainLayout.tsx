import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, Database, Image as ImageIcon, Rocket, Sparkles, Shield, ListChecks, Menu, ChevronLeft, Users, BarChart, Orbit, MailWarning, Smartphone, Trophy } from 'lucide-react';
import { VERSION } from '../../version';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navItems = [
    { to: "/", icon: <LayoutGrid size={20} />, label: "Événements Officiels" },
    { to: "/sas", icon: <Database size={20} />, label: "Table SAS" },
    { to: "/antichambre", icon: <Sparkles size={20} />, label: "Antichambre" },
    { to: "/retouche-image", icon: <ImageIcon size={20} />, label: "Retouche Image" },
    { to: "/admin-option", icon: <Sparkles size={20} />, label: "Curateur IA" },
    { to: "/moderation", icon: <Shield size={20} />, label: "Modération" },
    { to: "/signalements", icon: <MailWarning size={20} />, label: "Signalements" },
    { to: "/one-by-one", icon: <ListChecks size={20} />, label: "1 par 1" },
    { to: "/users", icon: <Users size={20} />, label: "Utilisateurs" },
    { to: "/daily-scores", icon: <Trophy size={20} />, label: "Scores du Jour" },
    { to: "/analytics", icon: <BarChart size={20} />, label: "Diagnostic" },
    { to: "/viz-3d", icon: <Orbit size={20} />, label: "Explorateur 3D" },
    { to: "/social-media", icon: <Smartphone size={20} />, label: "Social Media" },
  ];

  return (
    <div className={`main-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <div className="mobile-brand">
          <Rocket size={24} className="brand-logo" />
          <h1>k Events</h1>
        </div>
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && <div className="mobile-drawer-overlay" onClick={closeMobileMenu} />}

      <aside className={`main-sidebar ${isMobileMenuOpen ? 'mobile-visible' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <Rocket size={24} className="brand-logo" />
            {isSidebarOpen && <h1>k Events</h1>}
          </div>
          <button className="toggle-sidebar" onClick={toggleSidebar}>
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
              title={item.label}
              onClick={closeMobileMenu}
            >
              <span className="nav-icon">{item.icon}</span>
              {(isSidebarOpen || isMobileMenuOpen) && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '10px',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          BUILD: {VERSION}
        </div>
    </div>
  );
};

export default MainLayout;

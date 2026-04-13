import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, Database, Image as ImageIcon, Palette, Rocket, Sparkles, Shield, ListChecks, Menu, ChevronLeft, Users, BarChart } from 'lucide-react';
import { VERSION } from '../../version';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className={`main-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className="main-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <Rocket size={24} className="brand-logo" />
            {isSidebarOpen && <h1>k Events</h1>}
          </div>
          <button className="toggle-sidebar" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Événements Officiels">
            <LayoutGrid size={20} className="nav-icon" />
            {isSidebarOpen && <span>Événements Officiels</span>}
          </NavLink>
          
          <NavLink to="/sas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Table SAS">
            <Database size={20} className="nav-icon" />
            {isSidebarOpen && <span>Table SAS</span>}
          </NavLink>

          <NavLink to="/antichambre" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Antichambre">
            <Sparkles size={20} className="nav-icon" />
            {isSidebarOpen && <span>Antichambre</span>}
          </NavLink>

          <NavLink to="/retouche-image" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Retouche Image">
            <ImageIcon size={20} className="nav-icon" />
            {isSidebarOpen && <span>Retouche Image</span>}
          </NavLink>
          
          <NavLink to="/admin-option" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Curateur IA">
            <Sparkles size={20} className="nav-icon" />
            {isSidebarOpen && <span>Curateur IA</span>}
          </NavLink>

          <NavLink to="/moderation" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Modération">
             <Shield size={20} className="nav-icon" />
             {isSidebarOpen && <span>Modération</span>}
          </NavLink>
          
          <NavLink to="/lab" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Laboratoire">
             <Palette size={20} className="nav-icon" />
             {isSidebarOpen && <span>Laboratoire</span>}
          </NavLink>

          <NavLink to="/one-by-one" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="1 par 1">
             <ListChecks size={20} className="nav-icon" />
             {isSidebarOpen && <span>1 par 1</span>}
          </NavLink>

          <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Utilisateurs">
             <Users size={20} className="nav-icon" />
             {isSidebarOpen && <span>Utilisateurs</span>}
          </NavLink>

          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Diagnostic">
             <BarChart size={20} className="nav-icon" />
             {isSidebarOpen && <span>Diagnostic</span>}
          </NavLink>
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

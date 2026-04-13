import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, Database, Image as ImageIcon, Palette, Rocket, Sparkles, Shield, ListChecks } from 'lucide-react';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      {/* Sidebar de Navigation Globale */}
      <aside className="main-sidebar">
        <div className="sidebar-brand">
          <Rocket size={24} className="brand-logo" />
          <h1>k Events <span style={{fontSize: '10px'}}>[V2.2.1.b - 13/04 09:00]</span></h1>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutGrid size={20} />
            <span>Événements Officiels</span>
          </NavLink>
          
          <NavLink to="/sas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Database size={20} />
            <span>Table SAS</span>
          </NavLink>

          <NavLink to="/antichambre" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Sparkles size={20} />
            <span>Antichambre</span>
          </NavLink>

          <NavLink to="/retouche-image" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ImageIcon size={20} />
            <span>Retouche Image</span>
          </NavLink>
          
          <NavLink to="/admin-option" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Sparkles size={20} />
            <span>Curateur IA</span>
          </NavLink>

          <NavLink to="/moderation" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Shield size={20} />
             <span>Modération</span>
          </NavLink>
          
          <NavLink to="/lab" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Palette size={20} />
             <span>Laboratoire</span>
          </NavLink>

          <NavLink to="/one-by-one" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <ListChecks size={20} />
             <span>1 par 1</span>
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
          BUILD: V2.2.1.b - 13/04/2026 09:00
        </div>
    </div>
  );
};

export default MainLayout;

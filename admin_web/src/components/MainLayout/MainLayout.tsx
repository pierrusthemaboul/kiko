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
          <h1>KIKO ADMIN</h1>
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

      {/* Contenu de la Page Active */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;

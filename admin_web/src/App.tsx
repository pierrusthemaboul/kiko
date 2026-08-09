import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import EventsPage from './pages/EventsPage';
import SasPage from './pages/Sas/SasPage';
import AntichambrePage from './pages/Antichambre/AntichambrePage';
import AdminOptionsPage from './pages/AdminOptions/AdminOptionsPage';
import RetoucheImagePage from './pages/RetoucheImage/RetoucheImagePage';
import ModerationPage from './pages/ModerationPage';
import SignalementsPage from './pages/SignalementsPage';
import OneByOnePage from './pages/OneByOne/OneByOnePage';
import MainLayout from './components/MainLayout/MainLayout';
import EventEditorPage from './pages/EventEditor/EventEditorPage';
import UsersPage from './pages/UsersPage/UsersPage';
import UserProfilePage from './pages/UsersPage/UserProfilePage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import Visualisation3DPage from './pages/Visualisation3D/Visualisation3DPage';
import SocialMediaPage from './pages/SocialMedia/SocialMediaPage';
import MarketingDashboardPage from './pages/MarketingDashboard/MarketingDashboardPage';
import DailyScoresPage from './pages/DailyScoresPage/DailyScoresPage';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0f1117'
      }}>
        <Loader2 className="spin" color="#6366f1" size={40} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <LoginPage /> : <Navigate to="/" />} 
        />
        
        {/* Routes nécessitant d'être connecté et wrappées par MainLayout */}
        <Route path="/" element={session ? <MainLayout /> : <Navigate to="/login" />}>
          <Route index element={<EventsPage />} />
          <Route path="sas" element={<SasPage />} />
          <Route path="antichambre" element={<AntichambrePage />} />
          <Route path="retouche-image" element={<RetoucheImagePage />} />
          <Route path="admin-option" element={<AdminOptionsPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="signalements" element={<SignalementsPage />} />
          <Route path="one-by-one" element={<OneByOnePage />} />
          <Route path="edit-event/:id" element={<EventEditorPage />} />
          
          {/* User Management Section */}
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:userId" element={<UserProfilePage />} />
          
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="viz-3d" element={<Visualisation3DPage />} />
          <Route path="social-media" element={<SocialMediaPage />} />
          <Route path="marketing-dashboard" element={<MarketingDashboardPage />} />
          <Route path="daily-scores" element={<DailyScoresPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

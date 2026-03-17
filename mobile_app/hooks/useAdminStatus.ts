import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/supabaseClients';

export default function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (data) {
          setIsAdmin(data.is_admin);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut admin:', error);
    }
  };

  return { isAdmin };
}
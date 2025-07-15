import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'user' | null;

export function useUserRole() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_role', {
        _user_id: user?.id,
      });

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user'); // Default to user role
      } else {
        setUserRole(data || 'user');
      }
    } catch (error) {
      console.error('Error:', error);
      setUserRole('user');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    fetchUserRole();
  }, [user, fetchUserRole]);

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isModerator =
    userRole === 'moderator' ||
    userRole === 'admin' ||
    userRole === 'super_admin';

  const hasRole = useCallback((role: UserRole): boolean => {
    if (!userRole || !role) return false;

    const roleHierarchy = {
      user: 1,
      moderator: 2,
      admin: 3,
      super_admin: 4,
    };

    return roleHierarchy[userRole] >= roleHierarchy[role];
  }, [userRole]);

  return {
    userRole,
    loading,
    isSuperAdmin,
    isAdmin,
    isModerator,
    hasRole,
    refetch: fetchUserRole,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { checkUserRole, type UserRole } from '@/utils/roleValidation';

export type { UserRole } from '@/utils/roleValidation';

export function useUserRole() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRole = useCallback(async () => {
    if (!user?.id) {
      setUserRole(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      const result = await checkUserRole(user.id);
      
      if (result.success) {
        setUserRole(result.role || 'user');
      } else {
        console.error('Error fetching user role:', result.error);
        setError(result.error || 'Failed to fetch user role');
        setUserRole('user'); // Default to user role on error
      }
    } catch (error) {
      console.error('Unexpected error fetching user role:', error);
      setError('Unexpected error occurred');
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
    error,
    isSuperAdmin,
    isAdmin,
    isModerator,
    hasRole,
    refetch: fetchUserRole,
  };
}

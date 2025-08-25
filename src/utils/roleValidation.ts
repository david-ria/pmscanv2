import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { offlineAwareSupabase } from '@/lib/supabaseSafeWrapper';

/**
 * Role validation utilities for secure user role management
 */

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'user';

// Zod schemas for role validation
export const UserRoleSchema = z.enum(['super_admin', 'admin', 'moderator', 'user']);

export const RoleElevationSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID format'),
  newRole: UserRoleSchema.refine(role => role !== 'super_admin', {
    message: 'Super admin role cannot be assigned through this function'
  }),
  changeReason: z.string().min(10, 'Change reason must be at least 10 characters').max(500, 'Change reason too long')
});

export const SuperAdminInitSchema = z.object({
  targetEmail: z.string().email('Invalid email format')
});

/**
 * Validates role hierarchy - ensures users can only manage roles below their level
 */
export const validateRoleHierarchy = (currentUserRole: UserRole, targetRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    moderator: 2,
    admin: 3,
    super_admin: 4,
  };

  return roleHierarchy[currentUserRole] > roleHierarchy[targetRole];
};

/**
 * Securely elevate user role with validation and audit logging
 */
export const elevateUserRole = async (
  targetUserId: string,
  newRole: UserRole,
  changeReason: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate input
    const validatedData = RoleElevationSchema.parse({
      targetUserId,
      newRole,
      changeReason
    });

    // Call the secure database function with safe handling
    const result = await offlineAwareSupabase.rpc('elevate_user_role', {
      target_user_id: validatedData.targetUserId,
      new_role: validatedData.newRole,
      change_reason: validatedData.changeReason
    });

    if (result.error) {
      return {
        success: false,
        error: result.isOffline 
          ? 'Unable to update role while offline. Please try again when connected.' 
          : result.error
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Initialize first super admin (one-time use only)
 */
export const initializeSuperAdmin = async (
  targetEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate input
    const validatedData = SuperAdminInitSchema.parse({ targetEmail });

    // Call the secure database function with safe handling
    const result = await offlineAwareSupabase.rpc('initialize_super_admin', {
      target_user_email: validatedData.targetEmail
    });

    if (result.error) {
      return {
        success: false,
        error: result.isOffline
          ? 'Unable to initialize super admin while offline. Please try again when connected.'
          : result.error
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Get role audit logs (super admin only)
 */
export const getRoleAuditLogs = async (): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('role_audit_log')
      .select(`
        id,
        target_user_id,
        changed_by,
        old_role,
        new_role,
        change_reason,
        created_at,
        target_profile:profiles!role_audit_log_target_user_id_fkey(first_name, last_name),
        changer_profile:profiles!role_audit_log_changed_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Enhanced role checking with better error handling
 */
export const checkUserRole = async (userId: string): Promise<{
  success: boolean;
  role?: UserRole;
  error?: string;
}> => {
  try {
    const result = await offlineAwareSupabase.rpc('get_user_role', {
      _user_id: userId
    });

    if (result.error) {
      return {
        success: false,
        error: result.isOffline
          ? 'Unable to check user role while offline'
          : result.error
      };
    }

    return {
      success: true,
      role: result.data as UserRole || 'user'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
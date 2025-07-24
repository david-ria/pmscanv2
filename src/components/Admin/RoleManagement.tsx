import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';
import { elevateUserRole, getRoleAuditLogs, initializeSuperAdmin } from '@/utils/roleValidation';
import { validateSecureId, validateUserInput, sanitizeInput } from '@/utils/formValidation';
import { Shield, Users, History } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  target_user_id: string;
  changed_by: string;
  old_role: UserRole;
  new_role: UserRole;
  change_reason: string;
  created_at: string;
  target_profile?: { first_name?: string; last_name?: string };
  changer_profile?: { first_name?: string; last_name?: string };
}

export function RoleManagement() {
  const { isSuperAdmin, loading } = useUserRole();
  const { toast } = useToast();
  
  const [targetUserId, setTargetUserId] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [changeReason, setChangeReason] = useState('');
  const [isElevating, setIsElevating] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isSuperAdmin && showAuditLogs) {
      loadAuditLogs();
    }
  }, [isSuperAdmin, showAuditLogs]);

  const loadAuditLogs = async () => {
    const result = await getRoleAuditLogs();
    if (result.success) {
      setAuditLogs(result.data || []);
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate user ID
    const userIdError = validateSecureId(targetUserId, 'User ID');
    if (userIdError) {
      newErrors.targetUserId = userIdError;
    }

    // Validate change reason
    const reasonError = validateUserInput(changeReason, 'Change reason');
    if (reasonError) {
      newErrors.changeReason = reasonError;
    } else if (changeReason.length < 10) {
      newErrors.changeReason = 'Change reason must be at least 10 characters';
    } else if (changeReason.length > 500) {
      newErrors.changeReason = 'Change reason must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoleElevation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the form errors before submitting",
        variant: "destructive"
      });
      return;
    }

    setIsElevating(true);
    
    try {
      const result = await elevateUserRole(
        targetUserId,
        newRole,
        sanitizeInput(changeReason)
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "User role elevated successfully",
        });
        
        // Reset form
        setTargetUserId('');
        setNewRole('user');
        setChangeReason('');
        setErrors({});
        
        // Refresh audit logs if showing
        if (showAuditLogs) {
          loadAuditLogs();
        }
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsElevating(false);
    }
  };

  const handleSuperAdminInit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!superAdminEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setIsInitializing(true);
    
    try {
      const result = await initializeSuperAdmin(superAdminEmail);

      if (result.success) {
        toast({
          title: "Success",
          description: "Super admin initialized successfully",
        });
        setSuperAdminEmail('');
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Access denied. Super admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Elevation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Elevate User Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRoleElevation} className="space-y-4">
            <div>
              <Label htmlFor="targetUserId">User ID</Label>
              <Input
                id="targetUserId"
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user UUID"
                className={errors.targetUserId ? 'border-destructive' : ''}
              />
              {errors.targetUserId && (
                <p className="text-sm text-destructive mt-1">{errors.targetUserId}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newRole">New Role</Label>
              <Select value={newRole} onValueChange={(value: UserRole) => setNewRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="changeReason">Change Reason</Label>
              <Textarea
                id="changeReason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Explain why this role change is necessary (minimum 10 characters)"
                className={errors.changeReason ? 'border-destructive' : ''}
              />
              {errors.changeReason && (
                <p className="text-sm text-destructive mt-1">{errors.changeReason}</p>
              )}
            </div>

            <Button type="submit" disabled={isElevating}>
              {isElevating ? 'Elevating...' : 'Elevate Role'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Super Admin Initialization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Initialize First Super Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSuperAdminInit} className="space-y-4">
            <div>
              <Label htmlFor="superAdminEmail">Email Address</Label>
              <Input
                id="superAdminEmail"
                type="email"
                value={superAdminEmail}
                onChange={(e) => setSuperAdminEmail(e.target.value)}
                placeholder="Enter email for first super admin"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This can only be used once when no super admin exists.
              </p>
            </div>

            <Button type="submit" disabled={isInitializing}>
              {isInitializing ? 'Initializing...' : 'Initialize Super Admin'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Audit Log Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Role Change Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            variant="outline"
          >
            {showAuditLogs ? 'Hide' : 'Show'} Audit Log
          </Button>

          {showAuditLogs && (
            <div className="mt-4 space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground">No role changes recorded.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {log.target_profile?.first_name} {log.target_profile?.last_name} 
                          ({log.target_user_id.slice(0, 8)}...)
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.old_role} → {log.new_role}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm">
                      <strong>Changed by:</strong> {log.changer_profile?.first_name} {log.changer_profile?.last_name}
                    </p>
                    <p className="text-sm">
                      <strong>Reason:</strong> {log.change_reason}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
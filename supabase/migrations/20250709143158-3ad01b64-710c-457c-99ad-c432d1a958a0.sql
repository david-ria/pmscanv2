-- Clean up old pending invitations for testing
DELETE FROM public.group_invitations 
WHERE invitee_email = 'david.riallant@groupe-tera.com' 
AND status = 'pending';
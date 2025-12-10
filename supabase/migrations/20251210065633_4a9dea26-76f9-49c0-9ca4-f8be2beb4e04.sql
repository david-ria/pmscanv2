-- Sécurisation de la vue des profils de groupe
ALTER VIEW public.group_member_profiles SET (security_invoker = true);

-- Sécurisation de la vue des mesures de groupe
ALTER VIEW public.measurements_group_view SET (security_invoker = true);
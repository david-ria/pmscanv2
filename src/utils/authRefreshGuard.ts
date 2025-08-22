export function attachAuthRefreshGuard(supabase: any) {
  if (!supabase || !supabase.auth) return;

  supabase.auth.getSession().then(({ error }: any) => {
    if (error && /refresh_token_not_found|invalid refresh token|Invalid Refresh Token/i.test(error.message || '')) {
      supabase.auth.signOut({ scope: 'local' }).finally(() => {
        if (location.pathname !== '/auth') location.replace('/auth?reason=sessionExpired');
      });
    }
  });

  supabase.auth.onAuthStateChange((event: string) => {
    if (event === 'SIGNED_OUT') {
      if (location.pathname !== '/auth') location.replace('/auth');
    }
  });
}
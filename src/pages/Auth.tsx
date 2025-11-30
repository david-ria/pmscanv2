import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupLogo, setGroupLogo] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  
  const redirectPath = searchParams.get('redirect');
  const groupName = searchParams.get('groupName');
  const groupLogoParam = searchParams.get('groupLogo');
  const groupIdParam = searchParams.get('group');

  // Fetch group logo if we have a group context
  useEffect(() => {
    // If logo URL is provided in params, use it directly
    if (groupLogoParam) {
      setGroupLogo(groupLogoParam);
      return;
    }

    // Otherwise, fetch from database as fallback
    const fetchGroupLogo = async () => {
      // Get groupId from multiple sources
      let groupId = groupIdParam; // Direct group parameter
      
      // Fallback: extract from redirectPath
      if (!groupId && redirectPath) {
        const match = redirectPath.match(/\/groups\/([^/]+)/);
        if (match) {
          groupId = match[1];
        }
      }
      
      if (!groupId) return;
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase
          .from('groups')
          .select('logo_url, name')
          .eq('id', groupId)
          .single();
        
        if (data?.logo_url) {
          setGroupLogo(data.logo_url);
        }
      } catch (error) {
        console.error('Failed to fetch group logo:', error);
      }
    };

    fetchGroupLogo();
  }, [groupIdParam, redirectPath, groupLogoParam]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: t('auth.connectionError'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.connectionSuccess'),
          description: t('auth.youAreConnected'),
        });
        navigate(redirectPath || '/');
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('auth.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        pseudo: pseudo,
      });

      if (error) {
        toast({
          title: t('auth.registrationError'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.registrationSuccess'),
          description: t('auth.checkEmailConfirm'),
        });
        if (redirectPath) {
          navigate(redirectPath);
        }
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('auth.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main role="main" className="py-12">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Welcome Header with Logo */}
          <div className="text-center space-y-4">
            {/* Group or App Logo */}
            <div className="flex justify-center">
              {groupLogo ? (
                <img 
                  src={groupLogo} 
                  alt={`${groupName} logo`} 
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <img 
                  src="/lovable-uploads/83ccf48a-d0be-4ac1-9039-4c4a8295958c.png" 
                  alt="AirSentinels logo" 
                  className="w-20 h-20 object-contain"
                />
              )}
            </div>
            
            {/* Welcome Message */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {groupName ? (
                  <>
                    {t('auth.welcomeTo')} <span className="text-primary">{groupName}</span>
                  </>
                ) : (
                  t('auth.welcome')
                )}
              </h1>
              <p className="text-muted-foreground mt-2">
                {groupName 
                  ? t('auth.joinGroupDescription')
                  : t('auth.continueToApp')
                }
              </p>
            </div>
          </div>

          <Card className="w-full">
            <CardHeader>
              <h2 className="text-center text-xl font-semibold">
                {t('auth.authentication')}
              </h2>
            </CardHeader>
            <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <LogIn className="h-4 w-4 mr-2" />
                  {loading ? t('auth.connecting') : t('auth.signIn')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pseudo">{t('auth.pseudo')}</Label>
                  <Input
                    id="pseudo"
                    placeholder={t('auth.pseudoPlaceholder')}
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                    <Input
                      id="firstName"
                      placeholder={t('auth.firstNamePlaceholder')}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                    <Input
                      id="lastName"
                      placeholder={t('auth.lastNamePlaceholder')}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">{t('auth.email')}</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword">{t('auth.password')}</Label>
                  <Input
                    id="signupPassword"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {loading ? t('auth.signingUp') : t('auth.signUp')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          </CardContent>
        </Card>
        </div>
      </div>
    </main>
  );
}

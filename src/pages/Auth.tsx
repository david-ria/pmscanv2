import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: t('auth.connectionError'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('auth.connectionSuccess'),
          description: t('auth.youAreConnected')
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('auth.unexpectedError'),
        variant: "destructive"
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
        last_name: lastName
      });
      
      if (error) {
        toast({
          title: t('auth.registrationError'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('auth.registrationSuccess'),
          description: t('auth.checkEmailConfirm')
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('auth.unexpectedError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{t('auth.authentication')}</CardTitle>
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
  );
}
import { useTranslation } from 'react-i18next';
import { GroupModeIndicator } from '@/components/GroupModeIndicator';

const Index = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <GroupModeIndicator />
        
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">{t('welcome.title')}</h1>
            <p className="text-xl text-muted-foreground">{t('welcome.subtitle')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

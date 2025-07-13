import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface MenuPageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export function MenuPageHeader({ title, subtitle, onBack }: MenuPageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex items-center gap-3 mb-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="h-9 w-9"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

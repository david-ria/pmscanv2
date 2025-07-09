import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export function UserInfoCard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="p-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground text-sm">
                {user?.email || t('account.user')}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
              <Badge variant="secondary" className="text-xs mt-1">
                {t('account.connected')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
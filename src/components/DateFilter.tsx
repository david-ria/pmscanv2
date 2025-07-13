import { useState } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isSameDay,
} from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface DateFilterProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  className?: string;
}

export function DateFilter({
  selectedDate,
  onDateChange,
  selectedPeriod,
  onPeriodChange,
  className,
}: DateFilterProps) {
  const { t, i18n } = useTranslation();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const periodLabels = {
    day: t('history.periods.day'),
    week: t('history.periods.week'),
    month: t('history.periods.month'),
    year: t('history.periods.year'),
  };

  const locale = i18n.language === 'fr' ? fr : enUS;

  const getDateRangeText = () => {
    switch (selectedPeriod) {
      case 'day':
        return format(selectedDate, 'EEEE d MMMM yyyy', { locale });
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'd MMM', { locale })} - ${format(weekEnd, 'd MMM yyyy', { locale })}`;
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale });
      case 'year':
        return format(selectedDate, 'yyyy', { locale });
      default:
        return '';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate = new Date(selectedDate);

    switch (selectedPeriod) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'year':
        newDate.setFullYear(
          newDate.getFullYear() + (direction === 'next' ? 1 : -1)
        );
        break;
    }

    onDateChange(newDate);
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* Period Selector */}
        <div className="flex items-center justify-center gap-1 mb-4">
          {(Object.keys(periodLabels) as TimePeriod[]).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPeriodChange(period)}
              className="text-xs h-8 px-3"
            >
              {periodLabels[period]}
            </Button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateDate('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Date Display / Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="flex-1 justify-center text-sm font-medium h-8"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {getDateRangeText()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(date);
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
                locale={locale}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateDate('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

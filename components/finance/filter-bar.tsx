'use client';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DATE_RANGE_LABELS } from '@/hooks/use-finance-filters';
import type { DateRange, Currency } from '@/hooks/use-finance-filters';

interface Props {
  dateRange: DateRange;
  currency: Currency;
  onDateChange: (r: DateRange) => void;
  onCurrencyChange: (c: Currency) => void;
  onExport?: () => void;
}

const CURRENCIES: { key: Currency; label: string }[] = [
  { key: 'eur',  label: '€'   },
  { key: 'tl',   label: '₺'   },
  { key: 'both', label: '₺+€' },
];

export function FinanceFilterBar({ dateRange, currency, onDateChange, onCurrencyChange, onExport }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex rounded-md border overflow-hidden text-xs">
        {(Object.entries(DATE_RANGE_LABELS) as [DateRange, string][]).map(([key, label]) => (
          <button key={key} onClick={() => onDateChange(key)}
            className={`px-3 py-1.5 transition-colors ${dateRange === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex rounded-md border overflow-hidden text-xs">
        {CURRENCIES.map(({ key, label }) => (
          <button key={key} onClick={() => onCurrencyChange(key)}
            className={`px-3 py-1.5 transition-colors ${currency === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {onExport && (
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={onExport}>
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
      )}
    </div>
  );
}

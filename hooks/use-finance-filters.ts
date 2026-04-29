'use client';
import { useState, useEffect } from 'react';

export type DateRange = 'today' | 'week' | 'month' | 'year';
export type Currency  = 'eur' | 'tl' | 'both';

export const DATE_RANGE_DAYS: Record<DateRange, number> = {
  today: 1,
  week:  7,
  month: 30,
  year:  365,
};

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Bugün',
  week:  'Bu Hafta',
  month: 'Bu Ay',
  year:  'Bu Yıl',
};

export interface FinanceFilters { dateRange: DateRange; currency: Currency }

const KEY = 'finance-filters-v1';
const DEFAULTS: FinanceFilters = { dateRange: 'month', currency: 'eur' };

export function useFinanceFilters() {
  const [filters, setFilters] = useState<FinanceFilters>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFilters((p) => ({ ...p, ...(JSON.parse(raw) as Partial<FinanceFilters>) }));
    } catch {}
  }, []);

  const update = (partial: Partial<FinanceFilters>) =>
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });

  return { filters, update, days: DATE_RANGE_DAYS[filters.dateRange] };
}

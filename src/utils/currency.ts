import { useMemo } from 'react';
import { useFinancialEngine } from '../context/FinancialEngineContext';

export function useCurrencyFormatter() {
  const { settings } = useFinancialEngine();
  const currencyCode = settings?.currency || 'USD';

  const formatter = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [currencyCode]);

  const numberFormatter = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const formatAmount = (amount: number) => formatter.format(amount);

  const formatNumber = (amount: number) => numberFormatter.format(amount);

  const currencySymbol = useMemo(() => {
    const parts = formatter.formatToParts(0);
    const sym = parts.find(p => p.type === 'currency')?.value;
    return sym || '$';
  }, [formatter]);

  return { formatAmount, formatNumber, currencySymbol, currencyCode };
}

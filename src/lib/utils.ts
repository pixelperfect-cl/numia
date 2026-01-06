/**
 * Numia v1.0 - Utility Functions
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Movement, Summary, DateFilterType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Currency configuration for formatting
 */
const currencyConfig: Record<string, { locale: string; decimals: number; symbol?: string }> = {
  CLP: { locale: 'es-CL', decimals: 0, symbol: '$' },
  USD: { locale: 'en-US', decimals: 2, symbol: '$' },
  EUR: { locale: 'es-ES', decimals: 2, symbol: '€' },
  ARS: { locale: 'es-AR', decimals: 0, symbol: '$' },
  BRL: { locale: 'pt-BR', decimals: 2, symbol: 'R$' },
};

/**
 * Format currency with support for multiple currencies
 * @param amount - The amount to format
 * @param currency - Currency code (CLP, USD, EUR, ARS, BRL). Defaults to CLP
 */
export function formatCurrency(amount: number, currency: string = 'CLP'): string {
  const config = currencyConfig[currency] || currencyConfig['CLP'];

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: string = 'CLP'): string {
  return currencyConfig[currency]?.symbol || currencyConfig['CLP'].symbol;
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date object in local time
 * This prevents timezone issues when converting date strings
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get current date in YYYY-MM-DD format in local timezone
 * This prevents timezone issues when initializing date inputs
 */
export function getTodayLocalDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to local string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate summary from movements
 */
export function calculateSummary(movements: Movement[]): Summary {
  let income = 0;
  let expenses = 0;

  movements.forEach(movement => {
    const amount = Math.abs(movement.amount);
    if (movement.type === 'income') {
      income += amount;
    } else if (movement.type === 'expense') {
      expenses += amount;
    }
  });

  return {
    income,
    expenses,
    balance: income - expenses,
  };
}

/**
 * Get date range from filter type
 */
export function getDateRangeFromType(type: DateFilterType, startDate?: string, endDate?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (type) {
    case 'TODAY':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;

    case 'THIS_WEEK':
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'LAST_WEEK':
      const lastWeekDayOfWeek = now.getDay();
      const lastWeekDiffToMonday = lastWeekDayOfWeek === 0 ? -6 : 1 - lastWeekDayOfWeek;
      start = new Date(now);
      start.setDate(now.getDate() + lastWeekDiffToMonday - 7); // Go back 7 days
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'THIS_MONTH':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;

    case 'LAST_MONTH':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;

    case 'THIS_YEAR':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;

    case 'LAST_YEAR':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;

    case 'CUSTOM':
      start = startDate ? new Date(startDate) : new Date(0);
      end = endDate ? new Date(endDate) : now;
      break;

    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  return { startDate: start, endDate: end };
}

/**
 * Filter movements by date range
 */
export function filterMovementsByDate(movements: Movement[], startDate: Date, endDate: Date): Movement[] {
  return movements.filter(movement => {
    const movementDate = parseLocalDate(movement.date);
    return movementDate >= startDate && movementDate <= endDate;
  });
}

/**
 * Calculate box balances from movements
 */
export function calculateBoxBalances(movements: Movement[]): Record<string, number> {
  const balances: Record<string, number> = {};

  movements.forEach(movement => {
    const box = movement.box || 'Efectivo';
    if (!balances[box]) {
      balances[box] = 0;
    }

    const amount = Math.abs(movement.amount);
    if (movement.type === 'income') {
      balances[box] += amount;
    } else if (movement.type === 'expense') {
      balances[box] -= amount;
    }
  });

  return balances;
}

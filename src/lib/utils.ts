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
  if (!dateString) return new Date();
  const parts = dateString.split('-');
  if (parts.length !== 3) return new Date(); // Fallback for invalid formats
  const [year, month, day] = parts.map(Number);
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

    case 'ALL':
      start = new Date(0); // Epoch
      end = new Date(2100, 11, 31, 23, 59, 59); // Far future
      break;

    case 'CUSTOM':
      start = startDate ? parseLocalDate(startDate) : new Date(0);
      end = endDate ? parseLocalDate(endDate) : now;
      if (endDate) {
        // Set end date to end of day if explicitly provided
        end.setHours(23, 59, 59, 999);
      }
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
/**
 * Generate a deterministic UUID from a string (v4-like format)
 * Use this to migrate Firebase IDs to Supabase UUIDs consistently
 */
export function stringToUuid(str: string): string {
  // If explicitly already a UUID, return it
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Seed for pseudo-random
  const seed = Math.abs(hash);
  const rng = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return Math.floor((x - Math.floor(x)) * 256);
  };

  const b = Array.from({ length: 16 }, (_, i) => rng(i));

  // Set version (4) and variant (8, 9, a, b)
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;

  const hex = b.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20)}`;
}

/**
 * Add period (months/years) to a date string (YYYY-MM-DD) avoiding timezone issues.
 * Ensures strict calendar addition (e.g. adding 1 month to Jan 1st always results in Feb 1st).
 */
export function addPeriodToDateString(dateStr: string, frequency: 'monthly' | 'yearly', amount: number = 1): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;

  // Split date parts
  const [yearStr, monthStr, dayStr] = dateStr.split('T')[0].split('-');
  let year = parseInt(yearStr);
  let month = parseInt(monthStr); // 1-12
  const day = parseInt(dayStr);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  if (frequency === 'monthly') {
    month += amount;

    // Handle positive overflow
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    // Handle negative overflow (subtracting months)
    while (month < 1) {
      month += 12;
      year -= 1;
    }
  } else if (frequency === 'yearly') {
    year += amount;
  }

  // Handle day overflow (e.g. Jan 31 + 1 month -> Feb 28)
  // We want the result to be valid.
  const daysInMonth = new Date(year, month, 0).getDate();
  const newDay = Math.min(day, daysInMonth);

  // Format
  // Format
  const m = month.toString().padStart(2, '0');
  const d = newDay.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Parses a "YYYY-MM-DD" string into a Date object at local midnight.
 * This prevents the timezone offset issues caused by `new Date("YYYY-MM-DD")` (which creates UTC date)
 * or `parseISO("YYYY-MM-DD")` (which also defaults to UTC for dates).
 */
export function parseLocalDateString(dateStr: string): Date {
  if (!dateStr) return new Date(); // Fallback
  // Ensure we only look at the date part if it's an ISO string
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

  const [year, month, day] = cleanStr.split('-').map(Number);

  // Note: Month is 0-indexed in Date constructor
  return new Date(year, month - 1, day);
}

/**
 * Numia v1.0 - Report Utilities
 * Helper functions for report calculations and data aggregation
 */

import type { Movement, Category, Subscription, Client, Project } from '@/types';
import { parseLocalDate } from './utils';

export interface CategoryBreakdown {
    categoryId: string;
    categoryName: string;
    total: number;
    percentage: number;
    count: number;
    color?: string;
    isOthers?: boolean; // Flag to identify the "Otros" category
}

export interface MonthlyTrend {
    month: string;
    income: number;
    expenses: number;
    balance: number;
}

export interface YearComparison {
    year: number;
    income: number;
    expenses: number;
    balance: number;
    movementCount: number;
}

export interface ClientRevenue {
    clientId: string;
    clientName: string;
    totalRevenue: number;
    activeServices: number;
    mrr: number;
}

export interface ProjectMetrics {
    total: number;
    byStatus: Record<string, number>;
    completionRate: number;
    overdue: number;
}

/**
 * Calculate category breakdown from movements
 */
export function calculateCategoryBreakdown(
    movements: Movement[],
    categories: Category[],
    type: 'income' | 'expense'
): CategoryBreakdown[] {
    const filtered = movements.filter(m => m.type === type);
    const total = filtered.reduce((sum, m) => sum + Math.abs(m.amount), 0);

    const grouped = filtered.reduce((acc, movement) => {
        const categoryId = movement.categoryId || 'uncategorized';
        if (!acc[categoryId]) {
            acc[categoryId] = {
                total: 0,
                count: 0
            };
        }
        acc[categoryId].total += Math.abs(movement.amount);
        acc[categoryId].count += 1;
        return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(grouped).map(([categoryId, data]) => {
        const category = categories.find(c => c.id === categoryId);
        return {
            categoryId,
            categoryName: category?.name || 'Sin categoría',
            total: data.total,
            percentage: total > 0 ? (data.total / total) * 100 : 0,
            count: data.count,
            color: category?.color
        };
    }).sort((a, b) => b.total - a.total);
}

/**
 * Calculate monthly trends from movements
 */
export function calculateMonthlyTrends(
    movements: Movement[],
    months: number = 12
): MonthlyTrend[] {
    const now = new Date();
    const trends: MonthlyTrend[] = [];

    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const monthMovements = movements.filter(m => {
            const movementDate = parseLocalDate(m.date);
            return movementDate.getFullYear() === date.getFullYear() &&
                movementDate.getMonth() === date.getMonth();
        });

        const income = monthMovements
            .filter(m => m.type === 'income')
            .reduce((sum, m) => sum + m.amount, 0);

        const expenses = monthMovements
            .filter(m => m.type === 'expense')
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);

        trends.push({
            month: monthKey,
            income,
            expenses,
            balance: income - expenses
        });
    }

    return trends;
}

/**
 * Calculate year-over-year comparison
 */
export function calculateYearOverYear(movements: Movement[]): YearComparison[] {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear];

    return years.map(year => {
        const yearMovements = movements.filter(m => {
            const date = parseLocalDate(m.date);
            return date.getFullYear() === year;
        });

        const income = yearMovements
            .filter(m => m.type === 'income')
            .reduce((sum, m) => sum + m.amount, 0);

        const expenses = yearMovements
            .filter(m => m.type === 'expense')
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);

        return {
            year,
            income,
            expenses,
            balance: income - expenses,
            movementCount: yearMovements.length
        };
    });
}

/**
 * Calculate Monthly Recurring Revenue from subscriptions
 */
export function calculateMRR(subscriptions: Subscription[]): number {
    return subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, sub) => {
            const amount = Number(sub.amount) || 0;
            if (sub.frequency === 'yearly') {
                return sum + (amount / 12);
            }
            return sum + amount;
        }, 0);
}

/**
 * Calculate Annual Recurring Revenue from subscriptions
 */
export function calculateARR(subscriptions: Subscription[]): number {
    return subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, sub) => {
            const amount = Number(sub.amount) || 0;
            if (sub.frequency === 'monthly') {
                return sum + (amount * 12);
            }
            return sum + amount;
        }, 0);
}

/**
 * Calculate payment collection rate
 */
export function calculateCollectionRate(
    subscriptions: Subscription[],
    movements: Movement[]
): number {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    if (activeSubscriptions.length === 0) return 100;

    // Calculate expected revenue (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    let expectedRevenue = 0;
    activeSubscriptions.forEach(sub => {
        const startDate = parseLocalDate(sub.startDate);
        if (startDate <= threeMonthsAgo) {
            const amount = Number(sub.amount) || 0;
            if (sub.frequency === 'monthly') {
                expectedRevenue += amount * 3;
            } else if (sub.frequency === 'yearly') {
                expectedRevenue += (amount / 12) * 3;
            }
        }
    });

    // Calculate actual revenue from movements
    const actualRevenue = movements
        .filter(m => {
            const date = parseLocalDate(m.date);
            return date >= threeMonthsAgo && m.subscriptionId;
        })
        .reduce((sum, m) => sum + Math.abs(m.amount), 0);

    return expectedRevenue > 0 ? (actualRevenue / expectedRevenue) * 100 : 100;
}

/**
 * Group revenue by client
 */
export function groupByClient(
    subscriptions: Subscription[],
    clients: Client[],
    movements: Movement[]
): ClientRevenue[] {
    const clientMap = new Map<string, ClientRevenue>();

    clients.forEach(client => {
        const clientSubs = subscriptions.filter(s => s.clientId === client.id);
        const activeSubs = clientSubs.filter(s => s.status === 'active');

        const totalRevenue = movements
            .filter(m => m.clientId === client.id)
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);

        const mrr = calculateMRR(activeSubs);

        clientMap.set(client.id, {
            clientId: client.id,
            clientName: client.name,
            totalRevenue,
            activeServices: activeSubs.length,
            mrr
        });
    });

    return Array.from(clientMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Calculate project metrics
 */
export function calculateProjectMetrics(projects: Project[]): ProjectMetrics {
    const byStatus = projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const completed = byStatus['completed'] || 0;
    const total = projects.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const now = new Date();
    const overdue = projects.filter(p => {
        if (!p.dueDate || p.status === 'completed') return false;
        const dueDate = parseLocalDate(p.dueDate);
        return dueDate < now;
    }).length;

    return {
        total,
        byStatus,
        completionRate,
        overdue
    };
}

/**
 * Get top N categories by amount
 */
export function getTopCategories(
    breakdown: CategoryBreakdown[],
    limit: number = 5
): CategoryBreakdown[] {
    return breakdown.slice(0, limit);
}

/**
 * Group categories with less than threshold percentage as "Otros"
 * @param breakdown - Category breakdown array
 * @param threshold - Percentage threshold (default 5%)
 * @returns New array with small categories grouped as "Otros"
 */
export function groupSmallCategories(
    breakdown: CategoryBreakdown[],
    threshold: number = 5
): CategoryBreakdown[] {
    if (breakdown.length === 0) return [];

    const mainCategories = breakdown.filter(cat => cat.percentage >= threshold);
    const smallCategories = breakdown.filter(cat => cat.percentage < threshold);

    if (smallCategories.length === 0) {
        return breakdown;
    }

    // Calculate totals for "Otros"
    const othersTotal = smallCategories.reduce((sum, cat) => sum + cat.total, 0);
    const othersCount = smallCategories.reduce((sum, cat) => sum + cat.count, 0);
    const othersPercentage = smallCategories.reduce((sum, cat) => sum + cat.percentage, 0);

    const othersCategory: CategoryBreakdown = {
        categoryId: 'others',
        categoryName: 'Otros',
        total: othersTotal,
        percentage: othersPercentage,
        count: othersCount,
        color: '#6b7280', // Gray color for "Otros"
        isOthers: true
    };

    return [...mainCategories, othersCategory];
}

/**
 * Calculate box balances from movements
 */
export function calculateBoxBalances(movements: Movement[]): Record<string, number> {
    return movements.reduce((acc, movement) => {
        const box = movement.box || 'default';
        if (!acc[box]) acc[box] = 0;

        if (movement.type === 'income') {
            acc[box] += movement.amount;
        } else {
            acc[box] -= Math.abs(movement.amount);
        }

        return acc;
    }, {} as Record<string, number>);
}

/**
 * Filter movements by date range
 */
export function filterMovementsByDateRange(
    movements: Movement[],
    startDate: Date | null,
    endDate: Date | null
): Movement[] {
    return movements.filter(m => {
        const date = parseLocalDate(m.date);
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
    });
}

/**
 * Get date range presets
 */
export function getDateRangePreset(preset: string): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
        case 'this-month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'last-month':
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'this-year':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'last-year':
            start.setFullYear(start.getFullYear() - 1, 0, 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(end.getFullYear() - 1, 11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        case 'last-3-months':
            start.setMonth(start.getMonth() - 3);
            start.setHours(0, 0, 0, 0);
            break;
        case 'last-6-months':
            start.setMonth(start.getMonth() - 6);
            start.setHours(0, 0, 0, 0);
            break;
        default:
            start.setFullYear(2000, 0, 1);
            break;
    }

    return { start, end };
}

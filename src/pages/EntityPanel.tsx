/**
 * Numia v7.1 - Dashboard "Clean Wave" (MRR Focus)
 */

import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { formatCurrency, calculateSummary, parseLocalDate } from '@/lib/utils';
import {
  isAfter,
  subMonths,
  parseISO,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subDays,
  format
} from 'date-fns';

// Components
import { PulseCard } from '@/components/dashboard/PulseCard';
import { BentoCard } from '@/components/dashboard/BentoCard';
import { MetricChartCard } from '@/components/dashboard/MetricChartCard';
import { AnnualRevenueWaveChart } from '@/components/dashboard/AnnualRevenueWaveChart';
import { YearlyServiceHeatmap } from '@/components/dashboard/YearlyServiceHeatmap';
import { MonthlyActivityHeatmap } from '@/components/dashboard/MonthlyActivityHeatmap';
import { MonthlyExpensesDonut } from '@/components/dashboard/MonthlyExpensesDonut';

// Data
import { getProjects, getSubscriptions } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/AuthContext';
import { Project, Subscription } from '@/types';
import { useIndicators } from '@/hooks/useIndicators';

interface EntityPanelProps {
  entityId: string;
  onBack: () => void;
}

export function EntityPanel({ entityId }: EntityPanelProps) {
  const { user } = useAuth();
  const { entities, movements, categories } = useData();
  const { isBalanceHidden } = usePrivacy();

  // State
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const entity = entities.find(e => e.id === entityId);
  const entityMovements = useMemo(() =>
    movements.filter(m => m.entityId === entityId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [movements, entityId]);

  const summary = calculateSummary(entityMovements);

  // Load Data
  useEffect(() => {
    async function load() {
      if (!user || !entityId) return;
      try {
        const { getClients } = await import('@/lib/supabase/database');
        const entityClients = (await getClients(user.uid)).filter(c => c.entityId === entityId);
        const subsPromises = entityClients.map(c => getSubscriptions(c.id, user.uid));
        const allSubs = (await Promise.all(subsPromises)).flat();
        setSubscriptions(allSubs);

        const rawProjects = await getProjects(user.uid);
        const myProjects = rawProjects.filter(p => p.entityId === entityId);
        setProjectsList(myProjects);

      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [entityId, user]);

  // --- METRICAS SERVICIOS ACTIVOS ---
  const { indicators } = useIndicators();
  const ufValue = indicators.find(i => i.codigo === 'uf')?.valor || 39730;

  // Active Services Breakdown & Trend
  const { activeServicesCount, activeBreakdown, servicesTrend, serviceCountHistory } = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    let monthly = 0;
    let yearly = 0;
    let newServices = 0;
    let lostServices = 0;

    subscriptions.forEach(sub => {
      // 1. Breakdown
      if (sub.status === 'active') {
        if (sub.frequency === 'monthly') monthly++;
        if (sub.frequency === 'yearly') yearly++;
      }

      // 2. Trend Calculation
      // New: Created in current month (Added to the system)
      const created = sub.createdAt ? new Date(sub.createdAt) : parseISO(sub.startDate);
      if (isWithinInterval(created, { start: currentMonthStart, end: currentMonthEnd })) {
        newServices++;
      }

      // Lost: archivedAt is in current month
      if (sub.status !== 'active' && sub.archivedAt) {
        const archived = parseISO(sub.archivedAt);
        if (isWithinInterval(archived, { start: currentMonthStart, end: currentMonthEnd })) {
          lostServices++;
        }
      }
    });

    const netTrend = newServices - lostServices;

    // Monthly active service count for sparkline (last 12 months)
    const countHistory = Array.from({ length: 12 }, (_, i) => {
      const monthDate = startOfMonth(subMonths(now, 11 - i));
      const count = subscriptions.filter(sub => {
        const created = sub.createdAt ? new Date(sub.createdAt) : parseISO(sub.startDate);
        if (created > monthDate) return false;
        if (sub.status !== 'active' && sub.archivedAt) {
          const archived = parseISO(sub.archivedAt);
          if (archived < monthDate) return false;
        }
        return true;
      }).length;
      return { value: count };
    });

    return {
      activeServicesCount: monthly + yearly,
      activeBreakdown: { monthly, yearly },
      servicesTrend: netTrend,
      serviceCountHistory: countHistory
    };
  }, [subscriptions]);

  // Total MRR value in UF
  const activeServicesValueUF = useMemo(() => {
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    let totalValueUF = 0;

    activeSubs.forEach(sub => {
      const monthlyValue = sub.frequency === 'monthly' ? sub.amount : sub.amount / 12;
      if (sub.currency === 'UF') {
        totalValueUF += monthlyValue;
      } else {
        totalValueUF += (monthlyValue / ufValue);
      }
    });

    return totalValueUF;
  }, [subscriptions, ufValue]);

  // --- DATE PARAMS FOR MONTHLY CALCS ---
  const dateParams = useMemo(() => {
    const now = new Date();
    return {
      currentStart: startOfMonth(now),
      currentEnd: endOfMonth(now),
      prevStart: startOfMonth(subMonths(now, 1)),
      prevEnd: endOfMonth(subMonths(now, 1))
    };
  }, []);

  // --- INCOME METRICS ---
  const { currentMonthIncome, incomeTrend, incomeHistory } = useMemo(() => {
    let current = 0;
    let prev = 0;
    const now = new Date();

    // Daily History Logic (Last 30 Days)
    const historyMap = new Map<string, number>();

    entityMovements.forEach(m => {
      if (m.type !== 'income') return;
      const mDate = parseLocalDate(m.date);

      if (isWithinInterval(mDate, { start: dateParams.currentStart, end: dateParams.currentEnd })) {
        current += m.amount;
      } else if (isWithinInterval(mDate, { start: dateParams.prevStart, end: dateParams.prevEnd })) {
        prev += m.amount;
      }

      // History Population
      const dayStr = format(mDate, 'yyyy-MM-dd');
      historyMap.set(dayStr, (historyMap.get(dayStr) || 0) + m.amount);
    });

    const history = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      history.push({
        value: historyMap.get(dateStr) || 0
      });
    }

    let trend = 0;
    if (prev > 0) {
      trend = ((current - prev) / prev) * 100;
    } else if (current > 0) {
      trend = 100;
    }

    return { currentMonthIncome: current, incomeTrend: trend, incomeHistory: history };
  }, [entityMovements, dateParams]);

  // --- EXPENSES & BALANCE HISTORY ---
  const { currentMonthExpenses, expensesTrend, balanceHistory, expensesHistory } = useMemo(() => {
    // 1. Expenses Logic
    const now = new Date();
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));

    let currentExp = 0;
    let prevExp = 0;

    // 2. Daily Balance Logic (Last 30 Days)
    const bHistory = [];
    let runningBalance = summary.balance;

    // Map movements by day for quick lookup of BALANCE adjustments
    const movementsByDay = new Map<string, number>();

    // Map for Expenses History
    const expensesMap = new Map<string, number>();

    entityMovements.forEach(m => {
      const mDate = parseLocalDate(m.date);
      const dayStr = format(mDate, 'yyyy-MM-dd');

      // Balance Calculation Prep
      const amount = m.type === 'income' ? m.amount : -m.amount;
      movementsByDay.set(dayStr, (movementsByDay.get(dayStr) || 0) + amount);

      // Expenses Prep
      if (m.type === 'expense') {
        expensesMap.set(dayStr, (expensesMap.get(dayStr) || 0) + m.amount);
      }
    });

    // Generate last 30 days
    // Balance: Work backwards from today
    // Expenses: Work forwards or just by index, mapped to same dates

    const eHistory = [];

    for (let i = 0; i < 30; i++) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      // Balance (Unshift because we go backwards in time relative to 'now' but array should be chronological?
      // Actually usually charts expect chronological.
      // My previous loop used unshift so [0] was 30 days ago.

      bHistory.unshift({
        date: dateStr,
        balance: runningBalance,
        day: format(date, 'dd/MM')
      });

      // Undo movements of this day to get yesterday's closing balance (for next iteration backwards)
      const dayNetChange = movementsByDay.get(dateStr) || 0;
      runningBalance -= dayNetChange;
    }

    // For Expenses History (Chronological)
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      eHistory.push({
        value: expensesMap.get(dateStr) || 0
      });
    }

    entityMovements.forEach(m => {
      if (m.type !== 'expense') return;
      const mDate = parseLocalDate(m.date);

      if (isWithinInterval(mDate, { start: currentStart, end: currentEnd })) {
        currentExp += m.amount;
      } else if (isWithinInterval(mDate, { start: prevStart, end: prevEnd })) {
        prevExp += m.amount;
      }
    });

    let trend = 0;
    if (prevExp > 0) {
      trend = ((currentExp - prevExp) / prevExp) * 100;
    } else if (currentExp > 0) {
      trend = 100;
    }
    // Add decimal precision to trend calculation if needed (display handled in ChartCard)
    trend = parseFloat(trend.toFixed(1));

    return {
      currentMonthExpenses: currentExp,
      expensesTrend: trend,
      balanceHistory: bHistory,
      expensesHistory: eHistory
    };
  }, [entityMovements, summary.balance]);

  // --- MONTHLY HEATMAP DATA ---
  const heatmapData = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const daysMap = new Map<string, { income: number; expense: number }>();

    entityMovements.forEach(m => {
      const mDate = parseLocalDate(m.date);
      if (isWithinInterval(mDate, { start, end })) {
        const dayStr = format(mDate, 'yyyy-MM-dd');
        const current = daysMap.get(dayStr) || { income: 0, expense: 0 };

        if (m.type === 'income') current.income += m.amount;
        if (m.type === 'expense') current.expense += m.amount;

        daysMap.set(dayStr, current);
      }
    });

    return Array.from(daysMap.entries()).map(([date, val]) => ({
      date,
      income: val.income,
      expense: val.expense
    }));
  }, [entityMovements]);

  // --- EXPENSE BREAKDOWN DATA ---
  const expensesBreakdown = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    // Palette for expenses
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6'];
    const catMap = new Map<string, number>();

    entityMovements.forEach(m => {
      if (m.type !== 'expense') return;
      const mDate = parseLocalDate(m.date);

      if (isWithinInterval(mDate, { start, end })) {
        let catName = 'Sin Categoría';
        if (m.categoryId) {
          const foundCat = categories.find(c => c.id === m.categoryId);
          if (foundCat) catName = foundCat.name;
        } else if (m.category) { // Fallback for old data
          catName = m.category;
        }

        catMap.set(catName, (catMap.get(catName) || 0) + m.amount);
      }
    });

    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by amount desc
      .map(([category, amount], index) => ({
        category,
        amount,
        color: colors[index % colors.length]
      }));
  }, [entityMovements, categories]);

  if (!entity) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 overflow-hidden relative selection:bg-cyan-500/30">

      {/* Ambient Gradients */}
      <div className="pointer-events-none fixed left-0 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />

      {/* Header Removed as per user request (Redundant with global selector) */}
      <div className="relative z-10 mb-6" />

      {/* DASHBOARD GRID */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto">

        {/* 1. Active Services - with monthly count sparkline */}
        <div className="col-span-1 h-32">
          <MetricChartCard
            label="Servicios Activos"
            value={`${activeServicesCount}`}
            subtext={`${activeBreakdown.yearly} Anuales · ${activeBreakdown.monthly} Mensuales`}
            data={serviceCountHistory}
            color="cyan"
            trend={servicesTrend !== 0 ? Math.abs(servicesTrend) : undefined}
            trendDirection={servicesTrend === 0 ? 'neutral' : (servicesTrend > 0 ? 'up' : 'down')}
          />
        </div>

        {/* 2. Income */}
        <div className="col-span-1 h-32">
          <MetricChartCard
            label="Ingresos Mes Actual"
            value={isBalanceHidden ? '****' : formatCurrency(currentMonthIncome)}
            subtext={`${incomeTrend > 0 ? '+' : ''}${incomeTrend.toFixed(1)}% vs mes anterior`}
            data={incomeHistory}
            color="emerald"
            trend={incomeTrend}
            trendDirection={incomeTrend >= 0 ? 'up' : 'down'}
          />
        </div>

        {/* 3. Expenses */}
        <div className="col-span-1 h-32">
          <MetricChartCard
            label="Gastos Mes Actual"
            value={isBalanceHidden ? '****' : formatCurrency(currentMonthExpenses)}
            subtext={`${expensesTrend > 0 ? '+' : ''}${expensesTrend.toFixed(1)}% vs mes anterior`}
            data={expensesHistory}
            color="rose"
            trend={expensesTrend}
            trendDirection={expensesTrend > 0 ? 'up' : 'down'} // Up is red/down for expenses
          />
        </div>

        {/* 4. Balance History Chart */}
        <div className="col-span-1 h-32">
          <MetricChartCard
            label="Evolución Balance (30d)"
            value={isBalanceHidden ? '****' : formatCurrency(summary.balance)}
            data={balanceHistory}
            dataKey="balance"
            color="cyan"
            // We can calculate net change over 30 days if we want a trend badge here too
            // or just leave it without explicit trend badge if the chart speaks for itself.
            // Let's deduce trend from start vs end balance
            trend={((balanceHistory[29]?.balance - balanceHistory[0]?.balance) / Math.abs(balanceHistory[0]?.balance)) * 100}
            trendDirection={balanceHistory[29]?.balance >= balanceHistory[0]?.balance ? 'up' : 'down'}
          />
        </div>

        {/* ROW 2: WAVE CHART & EXPENSES */}
        <div className="col-span-1 md:col-span-2 xl:col-span-3 h-[400px]">
          <BentoCard className="h-full" title="Proyección de Ingresos Anuales (MRR)">
            <AnnualRevenueWaveChart subscriptions={subscriptions} />
          </BentoCard>
        </div>

        {/* Expenses Donut (New) */}
        <div className="col-span-1 md:col-span-2 xl:col-span-1 h-[400px]">
          <BentoCard className="h-full">
            <MonthlyExpensesDonut
              data={expensesBreakdown}
              total={currentMonthExpenses}
              trend={expensesTrend}
            />
          </BentoCard>
        </div>

        {/* ROW 3: HEATMAPS */}
        <div className="col-span-1 md:col-span-2 xl:col-span-3 h-96">
          <BentoCard className="h-full" title="Mapa de Calor: Renovaciones Anuales">
            <div className="p-4 h-full">
              <YearlyServiceHeatmap subscriptions={subscriptions} />
            </div>
          </BentoCard>
        </div>

        {/* Monthly Activity Heatmap (Moved Here) */}
        <div className="col-span-1 md:col-span-2 xl:col-span-1 h-96">
          <BentoCard className="h-full" title="Mapa de Calor Mensual">
            <div className="p-4 h-full">
              <MonthlyActivityHeatmap data={heatmapData} />
            </div>
          </BentoCard>
        </div>

      </div>
    </div>
  );
}

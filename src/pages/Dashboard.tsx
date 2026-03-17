
/**
 * Numia v2.0 - Enhanced Command Center Dashboard
 * Dark theme with cyan accents
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency, calculateSummary, parseLocalDate } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, UserPlus, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// New Dashboard Components
import { MetricsOverview } from '@/components/dashboard/MetricsOverview';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { AnnualRevenueWaveChart } from '@/components/dashboard/AnnualRevenueWaveChart';
import { YearlyServiceHeatmap } from '@/components/dashboard/YearlyServiceHeatmap';
import { RecentMovementsWidget } from '@/components/dashboard/RecentMovementsWidget';
import { MonthlyRevenueChart } from '@/components/dashboard/MonthlyRevenueChart';

// Data Fetching
import { getClients, getProjects, getSubscriptions } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/AuthContext';
import type { Subscription, Project, Client } from '@/types';
import { differenceInDays, parseISO, isAfter, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { movements, entities, loading: loadingData } = useData();
  const { isBalanceHidden } = usePrivacy();

  // Local State for ERP Data
  const [loadingErp, setLoadingErp] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Load ERP Data
  useEffect(() => {
    async function loadErp() {
      if (!user) return;
      setLoadingErp(true);
      try {
        const [clientsData, projectsData] = await Promise.all([
          getClients(user.uid),
          getProjects(user.uid)
        ]);

        setClients(clientsData);
        setProjects(projectsData);

        // Get Subscriptions for all clients
        const allSubsPromises = clientsData.map(c => getSubscriptions(c.id, user.uid));
        const allSubsResults = await Promise.all(allSubsPromises);
        const allSubs = allSubsResults.flat();
        setSubscriptions(allSubs);

      } catch (e) {
        console.error("Error loading ERP data for dashboard", e);
      } finally {
        setLoadingErp(false);
      }
    }
    loadErp();
  }, [user]);

  // Calculate Financial Metrics from Context
  const totalSummary = calculateSummary(movements);

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Projects
    const activeProjs = projects.filter(p => p.status !== 'completed' && !p.archived);
    const riskyProjs = activeProjs.filter(p => {
      if (p.dueDate && isAfter(now, parseISO(p.dueDate))) return true;
      return false;
    });

    // Collections (Overdue vs Pending)
    let pending = 0;
    let overdue = 0;

    subscriptions.forEach(sub => {
      if (sub.status !== 'active') return;
      const nextDate = parseISO(sub.nextBillingDate);
      const diff = differenceInDays(nextDate, now);

      if (diff < 0) {
        overdue += sub.amount;
      } else if (diff <= 7) {
        pending += sub.amount;
      }
    });

    // Monthly Revenue (current month projected)
    const monthlyRevenue = movements
      .filter(m => {
        const date = parseLocalDate(m.date);
        return m.type === 'income' && date >= currentMonthStart && date <= currentMonthEnd;
      })
      .reduce((sum, m) => sum + m.amount, 0);

    // Monthly Expenses
    const monthlyExpenses = movements
      .filter(m => {
        const date = parseLocalDate(m.date);
        return m.type === 'expense' && date >= currentMonthStart && date <= currentMonthEnd;
      })
      .reduce((sum, m) => sum + Math.abs(m.amount), 0);

    // Calculate ARR (Annual Recurring Revenue) - ONLY yearly services
    const UF_VALUE = 37500; // Estimated
    const yearlySubs = subscriptions.filter(s => s.status === 'active' && s.frequency !== 'monthly');

    const arrCLP = yearlySubs
      .filter(s => s.currency !== 'UF')
      .reduce((sum, sub) => sum + sub.amount, 0);

    const arrUF = yearlySubs
      .filter(s => s.currency === 'UF')
      .reduce((sum, sub) => sum + sub.amount, 0);

    const arr = arrCLP + (arrUF * UF_VALUE);

    // Calculate changes (simplified - compare with previous month)
    // In production, you'd calculate actual previous month values
    const balanceChange = 12.4; // Mock
    const revenueChange = 8.2; // Mock
    const expensesChange = -3.1; // Mock
    const arrChange = 15.6; // Mock

    return {
      balance: totalSummary.balance,
      balanceChange,
      monthlyRevenue,
      revenueChange,
      monthlyExpenses,
      expensesChange,
      arr,
      arrChange,
      pendingCollections: pending,
      overdueAmount: overdue,
    };
  }, [movements, subscriptions, totalSummary.balance]);

  const loading = loadingData || loadingErp;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full pb-8">

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">

            {entities[0]?.logoUrl && (
              <img
                src={entities[0].logoUrl}
                alt={entities[0].name}
                className="h-10 w-auto object-contain"
              />
            )}
            <h1 className="text-3xl font-bold tracking-tight">
              {entities[0]?.name || 'Centro de Mando'}
            </h1>
          </div>
          <p className="text-muted-foreground">{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate('/movements?action=create')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Movimiento
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/erp/clients')}>
            <UserPlus className="mr-2 h-4 w-4" /> Cliente
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/erp/projects')}>
            <Briefcase className="mr-2 h-4 w-4" /> Proyecto
          </Button>
        </div>
      </div>

      {/* Main Layout Grid - 3 columns on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* Left Column - Main Content */}
        <div className="space-y-6">

          {/* Top Metrics Overview */}
          <MetricsOverview
            balance={metrics.balance}
            balanceChange={metrics.balanceChange}
            monthlyRevenue={metrics.monthlyRevenue}
            revenueChange={metrics.revenueChange}
            monthlyExpenses={metrics.monthlyExpenses}
            expensesChange={metrics.expensesChange}
            arr={metrics.arr}
            arrChange={metrics.arrChange}
            pendingCollections={metrics.pendingCollections}
            overdueAmount={metrics.overdueAmount}
            isBalanceHidden={isBalanceHidden}
            subscriptions={subscriptions}
          />

          {/* Annual Revenue Wave Chart */}
          <div className="bg-card/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <AnnualRevenueWaveChart subscriptions={subscriptions} />
          </div>

          {/* Recent Financial Movements */}
          <div className="bg-card/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden h-96">
            <RecentMovementsWidget movements={movements} limit={10} />
          </div>

          {/* Two Column Grid for Heatmap and Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Yearly Service Heatmap */}
            <div className="bg-card/40 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <YearlyServiceHeatmap subscriptions={subscriptions} />
            </div>

            {/* Monthly Revenue Bar Chart */}
            <div className="bg-card/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <MonthlyRevenueChart subscriptions={subscriptions} />
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="xl:block">
          <div className="sticky top-6">
            <DashboardSidebar
              subscriptions={subscriptions}
              isBalanceHidden={isBalanceHidden}
              onCreateService={() => navigate('/erp/clients')}
            />
          </div>
        </div>

      </div>

    </div>
  );
}

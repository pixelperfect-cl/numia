import type { Project, Movement } from "@/types";
import { useState, useEffect } from 'react';
import { getMovements } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectProfitability } from "../widgets/ProjectProfitability";
import { ProjectIncomeCard } from "../widgets/ProjectIncomeCard";
import { ProjectExpensesCard } from "../widgets/ProjectExpensesCard";

interface ProjectFinanceTabProps {
    project: Project;
}

export function ProjectFinanceTab({ project }: ProjectFinanceTabProps) {
    const { user } = useAuth();
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMovements = async () => {
        if (!user || !project.id) return;
        try {
            // Fetch ALL movements related to this project
            const movs = await getMovements(user.uid, { projectId: project.id });
            setMovements(movs);
        } catch (error) {
            console.error("Failed to fetch project movements", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovements();
    }, [project.id, user]);

    // Separate Income and Expenses
    const incomeMovements = movements.filter(m => m.type === 'income');
    const expenseMovements = movements.filter(m => m.type === 'expense');

    const totalIncome = incomeMovements.reduce((sum, m) => sum + m.amount, 0);
    const totalExpenses = expenseMovements.reduce((sum, m) => sum + m.amount, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* Top Level Summary */}
            <ProjectProfitability
                project={project}
                income={totalIncome}
                expenses={totalExpenses}
            />

            {/* Income and Expenses Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProjectIncomeCard
                    project={project}
                    movements={incomeMovements}
                    onUpdate={fetchMovements}
                />

                <ProjectExpensesCard
                    project={project}
                    expenses={expenseMovements}
                    onUpdate={fetchMovements}
                />
            </div>
        </div>
    );
}

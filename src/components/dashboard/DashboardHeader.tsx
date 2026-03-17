
import { Search, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface DashboardHeaderProps {
    entityName: string;
    mrr?: string;
}

export function DashboardHeader({ entityName, mrr }: DashboardHeaderProps) {
    // Mock Ticker Data (Market data is external, keeping static for now as requested context implied aapp data)
    const tickerItems = [
        { label: "UF", value: "$36.790" },
        { label: "USD", value: "$945" },
        { label: "EUR", value: "$1.020" },
        { label: "IPSA", value: "6.450 (+0.5%)" },
        { label: "MRR", value: mrr || "$0" }
    ];

    const [currentIndex, setCurrentIndex] = useState(0);

    // Simple auto-rotate ticker
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % tickerItems.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pt-2">
            {/* Left: Branding & Context */}
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-primary rounded flex items-center justify-center font-bold text-primary-foreground text-lg tracking-tighter shadow-sm">
                        E
                    </div>
                    <span className="font-bold text-xl tracking-tight hidden sm:block">ENTITY</span>
                </div>
                <div className="h-4 w-[1px] bg-border" />
                <div className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    {entityName}
                </div>
            </div>

            {/* Middle: Ticker */}
            <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 rounded-full bg-card border border-border text-xs font-mono text-muted-foreground w-[400px] overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />

                <div className="flex gap-8 animate-marquee whitespace-nowrap">
                    {/* Simple marquee effect (Manual implementation for react logic vs CSS) */}
                    {tickerItems.map((item, i) => (
                        <span key={i} className={i === currentIndex ? "text-primary font-bold transition-all" : "opacity-50"}>
                            {item.label}: {item.value}
                        </span>
                    ))}
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="relative hidden sm:block">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search (⌘K)"
                        className="h-8 w-48 rounded-md bg-card border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Bell className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Settings className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

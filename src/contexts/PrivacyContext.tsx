import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

interface PrivacyContextType {
    isBalanceHidden: boolean;
    togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const STORAGE_KEY = 'numia-privacy-mode';

function readInitial(): boolean {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return false;
        const parsed = JSON.parse(saved);
        return typeof parsed === 'boolean' ? parsed : false;
    } catch {
        return false;
    }
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(readInitial);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(isBalanceHidden));
        } catch {
            // storage disabled or full — privacy mode just won't persist
        }
    }, [isBalanceHidden]);

    const togglePrivacy = useCallback(() => setIsBalanceHidden((prev) => !prev), []);

    const value = useMemo(() => ({ isBalanceHidden, togglePrivacy }), [isBalanceHidden, togglePrivacy]);

    return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
}

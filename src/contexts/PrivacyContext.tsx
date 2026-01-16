import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
    isBalanceHidden: boolean;
    togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
        const saved = localStorage.getItem('numia-privacy-mode');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('numia-privacy-mode', JSON.stringify(isBalanceHidden));
    }, [isBalanceHidden]);

    const togglePrivacy = () => {
        setIsBalanceHidden(prev => !prev);
    };

    return (
        <PrivacyContext.Provider value={{ isBalanceHidden, togglePrivacy }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
}

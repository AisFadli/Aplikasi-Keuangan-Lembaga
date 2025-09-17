
import React, { useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Dashboard from './features/Dashboard';
import Transactions from './features/Transactions';
import Ledger from './features/Ledger';
import Reconciliation from './features/Reconciliation';
import Assets from './features/Assets';
import Reports from './features/Reports';
import Settings from './features/Settings';
import Accounts from './features/Accounts';
import Login from './features/Login';
import { useData } from './contexts/DataContext';
import type { UserRole } from './types';

export type Section = 'dashboard' | 'transactions' | 'ledger' | 'accounts' | 'reconciliation' | 'assets' | 'reports' | 'settings';

const ROLE_PERMISSIONS: Record<UserRole, Section[]> = {
    admin: ['dashboard', 'transactions', 'ledger', 'accounts', 'reconciliation', 'assets', 'reports', 'settings'],
    staff: ['dashboard', 'transactions', 'ledger', 'accounts', 'reconciliation', 'assets'],
    viewer: ['dashboard', 'reports'],
};

const App: React.FC = () => {
    const { session, profile, authLoading, signOut } = useData();
    const [activeSection, setActiveSection] = useState<Section>('dashboard');

    const allowedSections = useMemo(() => {
        if (!profile?.role) return [];
        return ROLE_PERMISSIONS[profile.role] || [];
    }, [profile]);

    const handleSetSection = useCallback((section: Section) => {
        if (allowedSections.includes(section)) {
            setActiveSection(section);
        } else {
            // Jika pengguna mencoba mengakses bagian yang tidak diizinkan, kembalikan ke dasbor
            setActiveSection('dashboard');
        }
    }, [allowedSections]);

    // Jika bagian aktif saat ini tidak lagi diizinkan (misalnya, setelah perubahan peran), reset ke dasbor
    if (!allowedSections.includes(activeSection)) {
        if (allowedSections.length > 0) {
           setActiveSection(allowedSections[0]);
        }
    }

    const renderSection = useCallback(() => {
        // Double-check permission before rendering
        if (!allowedSections.includes(activeSection)) {
            return <Dashboard />;
        }

        switch (activeSection) {
            case 'dashboard': return <Dashboard />;
            case 'transactions': return <Transactions />;
            case 'ledger': return <Ledger />;
            case 'accounts': return <Accounts />;
            case 'reconciliation': return <Reconciliation />;
            case 'assets': return <Assets />;
            case 'reports': return <Reports />;
            case 'settings': return <Settings />;
            default: return <Dashboard />;
        }
    }, [activeSection, allowedSections]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary"></div>
            </div>
        );
    }

    if (!session) {
        return <Login />;
    }

    return (
        <div className="min-h-screen">
            <Header
                activeSection={activeSection}
                setActiveSection={handleSetSection}
                onLogout={signOut}
                userRole={profile?.role}
            />
            <main className="max-w-7xl mx-auto px-4 pb-12">
                {renderSection()}
            </main>
        </div>
    );
};

export default App;

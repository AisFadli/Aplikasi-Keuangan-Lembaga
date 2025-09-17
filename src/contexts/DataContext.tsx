
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Account, Transaction, Asset, CompanySettings, TaxSettings, JournalEntry, Profile } from '../types';
import * as api from '../services/supabase';
import { defaultAccounts, defaultCompanySettings, defaultTaxSettings } from '../utils/helpers';

interface DataContextType {
    // Auth State
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    authLoading: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<any>;

    // App Data State
    accounts: Account[];
    transactions: Transaction[];
    assets: Asset[];
    companySettings: CompanySettings;
    taxSettings: TaxSettings;
    loading: boolean;
    error: string | null;
    transactionCount: number;
    accountCount: number;
    assetCount: number;
    fetchData: () => Promise<void>;
    addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
    updateAccount: (code: string, updates: Partial<Account>) => Promise<void>;
    deleteAccount: (code: string) => Promise<void>;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'entries'>, entries: Omit<JournalEntry, 'id'|'transaction_id'>[]) => Promise<void>;
    updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'entries'>>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>;
    updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;
    saveCompanySettings: (settings: CompanySettings) => Promise<void>;
    saveTaxSettings: (settings: TaxSettings) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Auth State
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // App Data State
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
    const [taxSettings, setTaxSettings] = useState<TaxSettings>(defaultTaxSettings);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [transactionCount, setTransactionCount] = useState(0);
    const [accountCount, setAccountCount] = useState(0);
    const [assetCount, setAssetCount] = useState(0);

    // Auth listener
    useEffect(() => {
        setAuthLoading(true);
        const { data: { subscription } } = api.onAuthStateChange(async (_event, session) => {
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const userProfile = await api.getUserProfile(currentUser.id);
                setProfile(userProfile);
            } else {
                setProfile(null);
            }
            setAuthLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);


    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [accs, trans, assts, compSettings, txSettings, transCount, accsCount, asstsCount] = await Promise.all([
                api.getAccounts(),
                api.getTransactions(),
                api.getAssets(),
                api.getCompanySettings(),
                api.getTaxSettings(), 
                api.getTransactionsCount(),
                api.getAccountsCount(),
                api.getAssetsCount(),
            ]);

            if (accs.length === 0) {
              await Promise.all(defaultAccounts.map(acc => api.createAccount(acc)));
              const newAccounts = await api.getAccounts();
              setAccounts(newAccounts);
            } else {
              setAccounts(accs);
            }
            
            setTransactions(trans);
            setAssets(assts);
            setCompanySettings(compSettings || defaultCompanySettings);
            setTaxSettings(txSettings || defaultTaxSettings);
            setTransactionCount(transCount);
            setAccountCount(accsCount || accs.length);
            setAssetCount(asstsCount);

        } catch (e: any) {
            setError(e.message);
            console.error("Failed to fetch data:", e);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // Fetch data only when user is logged in
    useEffect(() => {
        if (user) {
            fetchData();
        } else {
            // Clear data on logout
            setAccounts([]);
            setTransactions([]);
            setAssets([]);
            setCompanySettings(defaultCompanySettings);
            setTaxSettings(defaultTaxSettings);
            setTransactionCount(0);
            setAccountCount(0);
            setAssetCount(0);
            setLoading(true); // Reset loading state for next login
        }
    }, [user, fetchData]);
    
    // --- WRAPPER FUNCTIONS ---
    const addAccount = async (account: Omit<Account, 'id'>) => { await api.createAccount(account); await fetchData(); };
    const updateAccount = async (code: string, updates: Partial<Account>) => { await api.updateAccount(code, updates); await fetchData(); };
    const deleteAccount = async (code: string) => { await api.deleteAccount(code); await fetchData(); };
    const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'entries'>>) => { await api.updateTransaction(id, updates); await fetchData(); };
    const addAsset = async (asset: Omit<Asset, 'id'>) => { await api.createAsset(asset); await fetchData(); };
    const updateAsset = async (id: string, updates: Partial<Asset>) => { await api.updateAsset(id, updates); await fetchData(); };
    const deleteAsset = async (id: string) => { await api.deleteAsset(id); await fetchData(); };
    const saveCompanySettings = async (settings: CompanySettings) => { await api.saveCompanySettings(settings); setCompanySettings(settings); };
    const saveTaxSettings = async (settings: TaxSettings) => { await api.saveTaxSettings(settings); setTaxSettings(settings); };

    const addTransaction = async (transaction: Omit<Transaction, 'id' | 'entries'>, entries: Omit<JournalEntry, 'id'|'transaction_id'>[]) => {
        const newTransaction = await api.createTransaction(transaction, entries);
        const currentAccounts = await api.getAccounts();
        const accountUpdates = newTransaction.entries.map(entry => {
            const account = currentAccounts.find(a => a.code === entry.account_code);
            if (!account) throw new Error(`Account ${entry.account_code} not found during balance update.`);
            let newBalance = account.balance;
            if (account.type === 'Aset' || account.type === 'Beban') {
                newBalance += entry.debit - entry.credit;
            } else {
                newBalance -= entry.debit - entry.credit;
            }
            return api.updateAccount(account.code, { balance: newBalance });
        });
        await Promise.all(accountUpdates);
        await fetchData();
    };
    
    const deleteTransaction = async (id: string) => {
        const transactionToDelete = transactions.find(t => t.id === id);
        if (!transactionToDelete) throw new Error("Transaction not found for deletion");
        const currentAccounts = await api.getAccounts();
        const accountUpdates = transactionToDelete.entries.map(entry => {
            const account = currentAccounts.find(a => a.code === entry.account_code);
            if (!account) throw new Error(`Account ${entry.account_code} not found during balance reversal.`);
            let newBalance = account.balance;
            if (account.type === 'Aset' || account.type === 'Beban') {
                newBalance -= (entry.debit - entry.credit);
            } else {
                newBalance += (entry.debit - entry.credit);
            }
            return api.updateAccount(account.code, { balance: newBalance });
        });
        await Promise.all(accountUpdates);
        await api.deleteTransaction(id);
        await fetchData();
    };

    const value: DataContextType = {
        // Auth
        session,
        user,
        profile,
        authLoading,
        signIn: api.signIn,
        signOut: api.signOut,
        // App Data
        accounts,
        transactions,
        assets,
        companySettings,
        taxSettings,
        loading,
        error,
        transactionCount,
        accountCount,
        assetCount,
        fetchData,
        addAccount,
        updateAccount,
        deleteAccount,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addAsset,
        updateAsset,
        deleteAsset,
        saveCompanySettings,
        saveTaxSettings
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

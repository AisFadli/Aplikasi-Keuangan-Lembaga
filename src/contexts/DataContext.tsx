import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Account, Transaction, Asset, CompanySettings, TaxSettings, JournalEntry, Profile } from '../types';
import * as api from '../services/supabase';
import { defaultAccounts, defaultCompanySettings, defaultTaxSettings, formatDate } from '../utils/helpers';
import type { BulkTransactionPayload } from '../services/supabase';

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
    addBulkTransactions: (payloads: BulkTransactionPayload[]) => Promise<void>;
    updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'entries'>>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>;
    updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;
    saveCompanySettings: (settings: CompanySettings) => Promise<void>;
    saveTaxSettings: (settings: TaxSettings) => Promise<void>;
    runDepreciation: (depreciationDate: string, assetsToDepreciate: { asset: Asset, amount: number }[]) => Promise<void>;
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
        // Step 1: Create the transaction and its journal entries
        const newTransaction = await api.createTransaction(transaction, entries);
        
        // Step 2: Update account balances based on the new transaction
        const currentAccounts = await api.getAccounts();
        const accountUpdatePromises = newTransaction.entries.map(entry => {
            const account = currentAccounts.find(a => a.code === entry.account_code);
            if (!account) throw new Error(`Akun ${entry.account_code} tidak ditemukan saat pembaruan saldo.`);
            let newBalance = account.balance;
            if (account.type === 'Aset' || account.type === 'Beban') {
                newBalance += entry.debit - entry.credit;
            } else {
                newBalance -= entry.debit - entry.credit;
            }
            return api.updateAccount(account.code, { balance: newBalance });
        });
        await Promise.all(accountUpdatePromises);

        // Step 3: Check for asset creation trigger
        const assetCreationPromises: Promise<any>[] = [];
        for (const entry of newTransaction.entries) {
            if (entry.debit > 0) {
                const account = currentAccounts.find(a => a.code === entry.account_code);
                // Heuristik: Anggap setiap debit ke akun Aset yang bukan Kas, Bank, atau Piutang adalah pembelian aset baru.
                const nonFixedAssetCodes = ['1100', '1200', '1300', '1400', '1600'];
                if (account && account.type === 'Aset' && !nonFixedAssetCodes.includes(account.code)) {
                    const newAsset: Omit<Asset, 'id'> = {
                        name: newTransaction.description,
                        category: account.name,
                        cost: entry.debit,
                        date: newTransaction.date,
                        life: null, // Perlu diisi oleh pengguna nanti
                        residual: 0,
                        method: null, // Perlu diisi oleh pengguna nanti
                        is_depreciable: true, // Default ke true, pengguna dapat mengubahnya
                        accumulated_depreciation: 0,
                        last_depreciation_date: null
                    };
                    assetCreationPromises.push(api.createAsset(newAsset));
                }
            }
        }
        if (assetCreationPromises.length > 0) {
            await Promise.all(assetCreationPromises);
        }

        // Step 4: Refresh all data to reflect changes
        await fetchData();
    };

    const addBulkTransactions = async (payloads: BulkTransactionPayload[]) => {
        await api.createBulkTransactions(payloads);
        // Simplest way to update balances is to refetch all data.
        // This is inefficient for a large number of accounts but guarantees consistency.
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

    const runDepreciation = async (depreciationDate: string, assetsToDepreciate: { asset: Asset, amount: number }[]) => {
        if (assetsToDepreciate.length === 0) return;
    
        const totalDepreciationAmount = assetsToDepreciate.reduce((sum, item) => sum + item.amount, 0);
    
        // Hardcoded account codes based on default chart of accounts
        const DEPRECIATION_EXPENSE_ACCOUNT = '5400';
        const ACCUMULATED_DEPRECIATION_ACCOUNT = '1600';
    
        // 1. Create the depreciation journal entry transaction
        const transactionData = {
            date: depreciationDate,
            ref: `DEP-${depreciationDate}`,
            description: `Penyusutan aset periode s/d ${formatDate(depreciationDate)}`,
        };
        const entries = [
            { account_code: DEPRECIATION_EXPENSE_ACCOUNT, debit: totalDepreciationAmount, credit: 0 },
            { account_code: ACCUMULATED_DEPRECIATION_ACCOUNT, debit: 0, credit: totalDepreciationAmount },
        ];
        
        // Use the existing addTransaction which handles balance updates and refetches data.
        await addTransaction(transactionData, entries);
    
        // 2. Update each asset's accumulated depreciation and last depreciation date.
        // This is done after the transaction to ensure the journal entry is posted first.
        const assetUpdatePromises = assetsToDepreciate.map(({ asset, amount }) => {
            const newAccumulatedDepreciation = asset.accumulated_depreciation + amount;
            return api.updateAsset(asset.id!, {
                accumulated_depreciation: newAccumulatedDepreciation,
                last_depreciation_date: depreciationDate,
            });
        });
    
        await Promise.all(assetUpdatePromises);
    
        // 3. Refetch data to get the updated asset information in the UI.
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
        addBulkTransactions,
        updateTransaction,
        deleteTransaction,
        addAsset,
        updateAsset,
        deleteAsset,
        saveCompanySettings,
        saveTaxSettings,
        runDepreciation
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
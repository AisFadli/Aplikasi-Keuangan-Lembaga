import { createClient } from '@supabase/supabase-js';
import type { Account, Transaction, Asset, CompanySettings, TaxSettings, JournalEntry } from '../types';

// IMPORTANT: Replace these with your actual Supabase project URL and anon key.
// It is recommended to use environment variables for this.
const supabaseUrl = process.env.SUPABASE_URL || 'https://dgqdtxiqfslvkxcntavb.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncWR0eGlxZnNsdmt4Y250YXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzMzMzcsImV4cCI6MjA3MjcwOTMzN30.XVbnJej9SlLqrg_jQKcsB7tHC-AYRurhzAWu4AE48HU';

if (supabaseUrl === 'https://dgqdtxiqfslvkxcntavb.supabase.co' || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncWR0eGlxZnNsdmt4Y250YXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzMzMzcsImV4cCI6MjA3MjcwOTMzN30.XVbnJej9SlLqrg_jQKcsB7tHC-AYRurhzAWu4AE48HU') {
    console.warn("Supabase URL and Anon Key are not configured. Please update services/supabase.ts");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Accounts API ---
export const getAccounts = async () => {
    const { data, error } = await supabase.from('accounts').select('*').order('code');
    if (error) throw error;
    return data as Account[];
};

export const createAccount = async (account: Omit<Account, 'id'>) => {
    const { data, error } = await supabase.from('accounts').insert([account]).select();
    if (error) throw error;
    return data[0] as Account;
};

export const updateAccount = async (code: string, updates: Partial<Account>) => {
    const { data, error } = await supabase.from('accounts').update(updates).eq('code', code).select();
    if (error) throw error;
    return data[0] as Account;
};

export const deleteAccount = async (code: string) => {
    const { error } = await supabase.from('accounts').delete().eq('code', code);
    if (error) throw error;
};

// --- Transactions API ---
export const getTransactions = async () => {
    const { data, error } = await supabase.from('transactions').select('*, entries:journal_entries(*)').order('date', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'entries'>, entries: Omit<JournalEntry, 'id' | 'transaction_id'>[]) => {
    const { data: transactionData, error: transactionError } = await supabase.from('transactions').insert(transaction).select().single();
    if (transactionError) throw transactionError;

    const newTransaction = transactionData;
    const entriesToInsert = entries.map(entry => ({ ...entry, transaction_id: newTransaction.id }));
    
    const { data: entriesData, error: entriesError } = await supabase.from('journal_entries').insert(entriesToInsert).select();
    if (entriesError) {
        // Rollback transaction creation if entries fail
        await supabase.from('transactions').delete().eq('id', newTransaction.id);
        throw entriesError;
    }

    return { ...newTransaction, entries: entriesData } as Transaction;
};

export const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'entries'>>) => {
    const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select('*, entries:journal_entries(*)')
        .single();
    if (error) throw error;
    return data as Transaction;
};

export const deleteTransaction = async (id: string) => {
    // Entries are deleted via cascade constraint in the database
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
};


// --- Assets API ---
export const getAssets = async () => {
    const { data, error } = await supabase.from('assets').select('*').order('name');
    if (error) throw error;
    return data as Asset[];
};

export const createAsset = async (asset: Omit<Asset, 'id'>) => {
    const { data, error } = await supabase.from('assets').insert([asset]).select();
    if (error) throw error;
    return data[0] as Asset;
};

export const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const { data, error } = await supabase.from('assets').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0] as Asset;
};

export const deleteAsset = async (id: string) => {
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) throw error;
};

// --- Settings API ---
export const getCompanySettings = async (): Promise<CompanySettings | null> => {
    const { data, error } = await supabase.from('company_settings').select('settings').limit(1).single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows found
    return data ? data.settings : null;
};

export const saveCompanySettings = async (settings: CompanySettings) => {
    const { error } = await supabase.from('company_settings').upsert({ id: 1, settings });
    if (error) throw error;
};

/*
export const getTaxSettings = async (): Promise<TaxSettings | null> => {
    const { data, error } = await supabase.from('tax_settings').select('settings').limit(1).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? data.settings : null;
};

export const saveTaxSettings = async (settings: TaxSettings) => {
    const { error } = await supabase.from('tax_settings').upsert({ id: 1, settings });
    if (error) throw error;
};
*/
// Temporarily disable tax settings functions to prevent app crash
export const getTaxSettings = async (): Promise<TaxSettings | null> => {
    console.warn("getTaxSettings is disabled because the 'tax_settings' table is missing.");
    return null;
}
export const saveTaxSettings = async (settings: TaxSettings) => {
    console.warn("saveTaxSettings is disabled because the 'tax_settings' table is missing.");
}


// --- Count APIs ---
export const getTransactionsCount = async (): Promise<number> => {
    const { count, error } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
};

export const getAccountsCount = async (): Promise<number> => {
    const { count, error } = await supabase.from('accounts').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
};

export const getAssetsCount = async (): Promise<number> => {
    const { count, error } = await supabase.from('assets').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
};
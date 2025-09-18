import { createClient } from '@supabase/supabase-js'
import type { Account, Transaction, Asset, CompanySettings, TaxSettings, JournalEntry, AccountType } from '../types';

// IMPORTANT: Replace these with your actual Supabase project URL and anon key.
// Ambil URL & Key dari environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string

// Validasi agar error lebih mudah dilacak
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL dan Key tidak ditemukan. Pastikan sudah menambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_KEY di environment variables."
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
// --- Type Mapping Helpers ---
// These functions translate between the string representation used in the app
// and a potential numeric representation in the database, fixing schema mismatches.
const accountTypeToString = (type: any): AccountType => {
    const typeNumber = Number(type);
    switch (typeNumber) {
        case 1: return 'Aset';
        case 2: return 'Liabilitas';
        case 3: return 'Modal';
        case 4: return 'Pendapatan';
        case 5: return 'Beban';
        // If it's already a string, return it as is (for flexible schemas)
        case NaN: if (['Aset', 'Liabilitas', 'Modal', 'Pendapatan', 'Beban'].includes(type)) return type;
        // Fallback for unknown types
        default: console.warn(`Unknown account type identifier: ${type}`); return 'Aset';
    }
};

const accountTypeToNumber = (type: AccountType): number => {
    switch (type) {
        case 'Aset': return 1;
        case 'Liabilitas': return 2;
        case 'Modal': return 3;
        case 'Pendapatan': return 4;
        case 'Beban': return 5;
        default: throw new Error(`Unknown account type string: ${type}`);
    }
};


// --- Accounts API ---
export const getAccounts = async () => {
    const { data, error } = await supabase.from('accounts').select('*').order('code');
    if (error) throw error;
    // Map numeric type from DB back to string for the app
    const mappedData = data.map(account => ({
        ...account,
        type: accountTypeToString(account.type),
    }));
    return mappedData as Account[];
};

export const createAccount = async (account: Omit<Account, 'id'>) => {
    const accountForDb = {
        ...account,
        type: accountTypeToNumber(account.type),
    };
    const { data, error } = await supabase.from('accounts').insert([accountForDb]).select().single();
    if (error) throw error;

    const newAccount = { ...data, type: accountTypeToString(data.type) };
    return newAccount as Account;
};

export const updateAccount = async (code: string, updates: Partial<Account>) => {
    let updatesForDb: Partial<any> = { ...updates };
    if (updates.type) {
        updatesForDb.type = accountTypeToNumber(updates.type);
    }

    const { data, error } = await supabase.from('accounts').update(updatesForDb).eq('code', code).select().single();
    if (error) throw error;

    const updatedAccount = { ...data, type: accountTypeToString(data.type) };
    return updatedAccount as Account;
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
    // BUG FIX: Generate a UUID on the client-side to satisfy the not-null constraint for the 'id' column.
    const transactionWithId = { ...transaction, id: crypto.randomUUID() };

    const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionWithId)
        .select()
        .single();
        
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
    const { data, error } = await supabase.from('company_settings').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows found
    return data;
};

export const saveCompanySettings = async (settings: CompanySettings) => {
    const { error } = await supabase.from('company_settings').upsert({ id: 1, ...settings });
    if (error) throw error;
};

export const getTaxSettings = async (): Promise<TaxSettings | null> => {
    const { data, error } = await supabase.from('tax_settings').select('*').limit(1).single();
    // Gracefully handle case where no settings row exists yet, but do throw other errors.
    if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows found
    return data;
};

export const saveTaxSettings = async (settings: TaxSettings) => {
    // Upsert ensures that a new row is created if one doesn't exist (assuming id=1 is used as a singleton key).
    const { error } = await supabase.from('tax_settings').upsert({ id: 1, ...settings });
    if (error) throw error;
};


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

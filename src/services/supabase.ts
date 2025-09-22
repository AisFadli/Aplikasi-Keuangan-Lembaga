
import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import type { Account, Transaction, Asset, CompanySettings, TaxSettings, JournalEntry, AccountType, Profile } from '../types';

// IMPORTANT: Replace these with your actual Supabase project URL and anon key.
// It is recommended to use environment variables for this.
const supabaseUrl = process.env.SUPABASE_URL || 'Supabase_URL';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'SUPABASE_ANON_KEY';

if (supabaseUrl === 'Supabase_URL' || supabaseAnonKey === 'SUPABASE_ANON_KEY') {
    console.warn("Supabase URL and Anon Key are not configured. Please update services/supabase.ts");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Auth API ---
export const signIn = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
    return supabase.auth.signOut();
};

export const onAuthStateChange = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
};

export const getUserProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .single();
    if (error) {
        console.error('Error fetching user profile:', error.message);
        return null;
    }
    return data as Profile;
};


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

// Helper function to generate a unique numeric ID.
// This is used because some ID columns are 'bigint' and do not auto-increment.
const generateNumericId = (): number => {
    const timestamp = Date.now(); // 13 digits
    const randomSuffix = Math.floor(Math.random() * 1000); // 3 digits
    // Combine to form a 16-digit number, which is safely within JavaScript's MAX_SAFE_INTEGER limit.
    return timestamp * 1000 + randomSuffix;
};

// --- Transactions API ---
export const getTransactions = async () => {
    const { data, error } = await supabase.from('transactions').select('*, entries:journal_entries(*)').order('date', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'entries'>, entries: Omit<JournalEntry, 'id' | 'transaction_id'>[]) => {
    // BUG FIX: Generate a unique numeric ID on the client-side to satisfy the not-null constraint 
    // for the 'id' column which is of type bigint. Using a UUID string caused a type error.
    const transactionWithId = { ...transaction, id: generateNumericId() };

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

// --- Bulk Transactions API ---
export type BulkTransactionPayload = {
    transaction: Omit<Transaction, 'id' | 'entries'>;
    entries: Omit<JournalEntry, 'id' | 'transaction_id'>[];
};

export const createBulkTransactions = async (payloads: BulkTransactionPayload[]) => {
    // 1. Prepare transactions and entries with client-side generated IDs
    const transactionsToInsert = payloads.map(p => ({
        ...p.transaction,
        id: generateNumericId(),
    }));

    const entriesToInsert: Omit<JournalEntry, 'id'>[] = [];
    payloads.forEach((p, index) => {
        const transactionId = transactionsToInsert[index].id;
        p.entries.forEach(entry => {
            // FIX: The 'transaction_id' in the JournalEntry type is a string, but transactionId is a number. Convert to string.
            entriesToInsert.push({ ...entry, transaction_id: String(transactionId) });
        });
    });

    // 2. Insert all transactions
    const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);
        
    if (transactionError) {
        throw new Error(`Gagal menyisipkan transaksi: ${transactionError.message}`);
    }

    // 3. Insert all journal entries
    const { error: entriesError } = await supabase
        .from('journal_entries')
        .insert(entriesToInsert);
        
    if (entriesError) {
        // NOTE: Transactions are now orphaned. A cleanup job or RPC would be needed for a production-robust system.
        throw new Error(`Transaksi dibuat, tetapi gagal menyisipkan entri jurnal: ${entriesError.message}`);
    }

    // FIX: The original return value was missing the 'entries' property and had a numeric 'id',
    // which does not match the 'Transaction[]' type. This constructs the correct return object.
    return transactionsToInsert.map((tx, index) => {
        const payload = payloads[index];
        const transactionIdStr = String(tx.id);

        return {
            ...payload.transaction,
            id: transactionIdStr,
            entries: payload.entries.map(e => ({
                ...e,
                transaction_id: transactionIdStr,
            }))
        };
    }) as Transaction[];
};


// --- Assets API ---
export const getAssets = async () => {
    const { data, error } = await supabase.from('assets').select('*').order('name');
    if (error) throw error;
    // The screenshot confirms the column is 'accumulated_depreciation', so no mapping is needed.
    return data as Asset[];
};

export const createAsset = async (asset: Omit<Asset, 'id'>) => {
    // BUG FIX: Generate a unique numeric ID client-side for the 'bigint' primary key column.
    const assetWithId = { ...asset, id: generateNumericId() };

    const { data, error } = await supabase.from('assets').insert([assetWithId]).select();
    if (error) throw error;
    return data[0] as Asset;
};

export const updateAsset = async (id: string, updates: Partial<Asset>) => {
    // No mapping needed as column name matches the app's type definition.
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


import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency, getTodayDateString } from '../utils/helpers';
import type { Transaction, JournalEntry, Account } from '../types';

// Type for the form state
type TransactionFormData = {
    id?: string;
    date: string;
    ref: string;
    description: string;
    entries: Omit<JournalEntry, 'id' | 'transaction_id'>[];
};

// Data for pre-filling the form from another feature like Reconciliation
export type TransactionPrefillData = {
    date: string;
    description: string;
    ref?: string;
    // Debits the specified account
    debitAccount?: { code: string, amount: number };
     // Credits the specified account
    creditAccount?: { code: string, amount: number };
}

// FIX: Export TransactionForm to make it available for other components.
export const TransactionForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    transactionToEdit?: Transaction | null;
    prefillData?: TransactionPrefillData | null;
}> = ({ isOpen, onClose, transactionToEdit, prefillData }) => {
    const { accounts, addTransaction, updateTransaction } = useData();
    const [formData, setFormData] = useState<TransactionFormData>({
        date: getTodayDateString(),
        ref: '',
        description: '',
        entries: [
            { account_code: '', debit: 0, credit: 0 },
            { account_code: '', debit: 0, credit: 0 },
        ],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (transactionToEdit) {
            setFormData({
                id: transactionToEdit.id,
                date: transactionToEdit.date,
                ref: transactionToEdit.ref,
                description: transactionToEdit.description,
                entries: transactionToEdit.entries.map(({ account_code, debit, credit }) => ({ account_code, debit, credit })),
            });
        } else if (prefillData) {
            const newEntries = [
                { account_code: '', debit: 0, credit: 0 },
                { account_code: '', debit: 0, credit: 0 },
            ];
            if (prefillData.debitAccount) {
                newEntries[0] = { account_code: prefillData.debitAccount.code, debit: prefillData.debitAccount.amount, credit: 0 };
            }
             if (prefillData.creditAccount) {
                // If debit is already filled, put credit in the second slot
                const index = prefillData.debitAccount ? 1 : 0;
                newEntries[index] = { account_code: prefillData.creditAccount.code, debit: 0, credit: prefillData.creditAccount.amount };
            }
            
            setFormData({
                date: prefillData.date,
                ref: prefillData.ref || '',
                description: prefillData.description,
                entries: newEntries
            });
        } else {
            // Reset form for new transaction
            setFormData({
                date: getTodayDateString(),
                ref: '',
                description: '',
                entries: [
                    { account_code: '', debit: 0, credit: 0 },
                    { account_code: '', debit: 0, credit: 0 },
                ],
            });
        }
    }, [transactionToEdit, prefillData, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEntryChange = (index: number, field: keyof JournalEntry, value: string | number) => {
        const newEntries = [...formData.entries];
        const entry = { ...newEntries[index] };
    
        if (field === 'account_code') {
            entry.account_code = value as string;
        } else {
            const numValue = Number(value) || 0;
            if (field === 'debit' && numValue > 0) {
                entry.debit = numValue;
                entry.credit = 0; // Ensure only one has a value
            } else if (field === 'credit' && numValue > 0) {
                entry.credit = numValue;
                entry.debit = 0; // Ensure only one has a value
            } else {
                // Allows clearing the input
                entry[field as 'debit' | 'credit'] = 0;
            }
        }
        newEntries[index] = entry;
        setFormData(prev => ({ ...prev, entries: newEntries }));
    };

    const addEntryRow = () => {
        setFormData(prev => ({
            ...prev,
            entries: [...prev.entries, { account_code: '', debit: 0, credit: 0 }],
        }));
    };

    const removeEntryRow = (index: number) => {
        if (formData.entries.length <= 2) return; // Must have at least two entries
        setFormData(prev => ({
            ...prev,
            entries: prev.entries.filter((_, i) => i !== index),
        }));
    };

    const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
        const totals = formData.entries.reduce(
            (acc, entry) => {
                acc.debit += Number(entry.debit) || 0;
                acc.credit += Number(entry.credit) || 0;
                return acc;
            },
            { debit: 0, credit: 0 }
        );
        return {
            totalDebit: totals.debit,
            totalCredit: totals.credit,
            isBalanced: totals.debit > 0 && totals.debit === totals.credit,
        };
    }, [formData.entries]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) {
            alert('Total Debit must equal Total Credit and cannot be zero.');
            return;
        }
        
        setIsSubmitting(true);
        const { id, entries, ...transactionData } = formData;
        
        try {
            if (id) {
                // Editing existing transaction
                await updateTransaction(id, transactionData);
                // Note: Editing entries is disabled to preserve data integrity of balances.
                // A more complex implementation (e.g., via a database transaction) would be needed to support this safely.
            } else {
                // Creating new transaction
                const validEntries = entries.filter(e => e.account_code && (e.debit > 0 || e.credit > 0));
                await addTransaction(transactionData, validEntries);
            }
            onClose();
        } catch (error: any) {
            console.error('Failed to save transaction:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Sort accounts by code for the dropdown
    const sortedAccounts = useMemo(() => [...accounts].sort((a, b) => a.code.localeCompare(b.code)), [accounts]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transactionToEdit ? 'Edit Transaksi' : 'Buat Transaksi Baru'} size="xl">
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-1">
                        <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">Tanggal</label>
                        <input type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" required />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="ref" className="block text-sm font-medium text-gray-300 mb-1">No. Referensi (Opsional)</label>
                        <input type="text" name="ref" id="ref" value={formData.ref} onChange={handleInputChange} placeholder="e.g., INV-00123" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" />
                    </div>
                </div>
                <div className="mb-6">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Deskripsi</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" required placeholder="e.g., Pembayaran tagihan listrik bulan Juni"></textarea>
                </div>

                <h4 className="text-lg font-semibold mb-2">Jurnal Entri</h4>
                <div className="space-y-2">
                    {formData.entries.map((entry, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                                <select value={entry.account_code} onChange={(e) => handleEntryChange(index, 'account_code', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm" disabled={!!transactionToEdit}>
                                    <option value="">Pilih Akun...</option>
                                    {sortedAccounts.map(acc => <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-3">
                                <input type="number" placeholder="Debit" value={entry.debit || ''} onChange={(e) => handleEntryChange(index, 'debit', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm" disabled={!!transactionToEdit} />
                            </div>
                            <div className="col-span-3">
                                <input type="number" placeholder="Kredit" value={entry.credit || ''} onChange={(e) => handleEntryChange(index, 'credit', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm" disabled={!!transactionToEdit}/>
                            </div>
                            <div className="col-span-1 text-center">
                                {!transactionToEdit && formData.entries.length > 2 && (
                                    <button type="button" onClick={() => removeEntryRow(index)} className="text-red-400 hover:text-red-300">&times;</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {!transactionToEdit && (
                    <button type="button" onClick={addEntryRow} className="mt-3 text-sm text-primary hover:underline">+ Tambah Baris</button>
                )}
                 {transactionToEdit && <p className="text-xs text-yellow-400 mt-2">Perubahan entri jurnal dinonaktifkan untuk menjaga integritas saldo akun.</p>}

                <div className="flex justify-between mt-6 p-3 bg-slate-900 rounded-lg">
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Total Debit</p>
                        <p className="font-semibold text-lg">{formatCurrency(totalDebit)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Total Kredit</p>
                        <p className="font-semibold text-lg">{formatCurrency(totalCredit)}</p>
                    </div>
                </div>
                 {!isBalanced && totalDebit + totalCredit > 0 && <p className="text-center text-red-400 mt-2 text-sm">Total Debit dan Kredit tidak seimbang.</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500">Batal</button>
                    <button type="submit" disabled={!isBalanced || isSubmitting} className="py-2 px-4 rounded-md bg-primary hover:bg-primary/80 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Menyimpan...' : (transactionToEdit ? 'Simpan Perubahan' : 'Buat Transaksi')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const Transactions: React.FC = () => {
    const { transactions, loading, error, deleteTransaction } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = tx.description.toLowerCase().includes(searchLower) || (tx.ref && tx.ref.toLowerCase().includes(searchLower));

            // String comparison is safe and timezone-agnostic for YYYY-MM-DD format
            const matchesStartDate = startDate ? tx.date >= startDate : true;
            const matchesEndDate = endDate ? tx.date <= endDate : true;

            return matchesSearch && matchesStartDate && matchesEndDate;
        });
    }, [transactions, searchTerm, startDate, endDate]);

    const handleOpenModal = (transaction?: Transaction) => {
        setEditingTransaction(transaction || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini akan memperbarui saldo akun terkait dan tidak dapat diurungkan.')) {
            try {
                await deleteTransaction(id);
            } catch (err: any) {
                alert(`Gagal menghapus transaksi: ${err.message}`);
            }
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Pencatatan Transaksi</h2>
                <button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg">
                    + Transaksi Baru
                </button>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                     <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-1">Cari Transaksi</label>
                    <input
                        id="search"
                        type="text"
                        placeholder="Deskripsi atau referensi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
                    />
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">Tanggal Mulai</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
                        />
                    </div>
                     <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">Tanggal Akhir</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
                        />
                    </div>
                </div>
            </div>

            {loading && <div className="text-center py-8">Memuat transaksi...</div>}
            {error && <div className="text-center py-8 text-red-400">Error: {error}</div>}

            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="text-left py-3 px-4">Tanggal</th>
                                <th className="text-left py-3 px-4">Deskripsi</th>
                                <th className="text-left py-3 px-4">Ref</th>
                                <th className="text-right py-3 px-4">Jumlah</th>
                                <th className="text-center py-3 px-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map(tx => (
                                    <tr key={tx.id} className="border-b border-gray-700 hover:bg-slate-800/50">
                                        <td className="py-3 px-4">{formatDate(tx.date)}</td>
                                        <td className="py-3 px-4">{tx.description}</td>
                                        <td className="py-3 px-4 text-gray-400">{tx.ref || '-'}</td>
                                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(tx.entries.reduce((sum, entry) => sum + entry.debit, 0))}</td>
                                        <td className="py-3 px-4 text-center">
                                            <button onClick={() => handleOpenModal(tx)} className="text-blue-400 hover:underline text-sm mr-3">Edit</button>
                                            <button onClick={() => handleDelete(tx.id!)} className="text-red-400 hover:underline text-sm">Hapus</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center text-gray-400 py-8">
                                        {transactions.length > 0 ? 'Tidak ada transaksi yang cocok dengan kriteria.' : "Belum ada transaksi. Klik 'Transaksi Baru' untuk memulai."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
             <TransactionForm isOpen={isModalOpen} onClose={handleCloseModal} transactionToEdit={editingTransaction} />
        </Card>
    );
};

export default Transactions;


import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { JournalEntry } from '../types';

interface LedgerEntry extends JournalEntry {
    date: string;
    desc: string;
    ref: string;
    running_balance: number;
}

const Ledger: React.FC = () => {
    const { accounts, transactions, loading, error } = useData();
    const [selectedAccountCode, setSelectedAccountCode] = useState<string>('');

    const sortedAccounts = useMemo(() => {
        return [...accounts].sort((a, b) => a.code.localeCompare(b.code));
    }, [accounts]);

    const { ledgerEntries, selectedAccount } = useMemo(() => {
        if (!selectedAccountCode) {
            return { ledgerEntries: [], selectedAccount: null };
        }

        const account = accounts.find(acc => acc.code === selectedAccountCode);
        if (!account) {
            return { ledgerEntries: [], selectedAccount: null };
        }
        
        const relevantTransactions = transactions
            .filter(tx => tx.entries.some(e => e.account_code === selectedAccountCode))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = account.balance;

        const entries: LedgerEntry[] = [];

        // Calculate entries backward from the most recent to determine running balance correctly
        const reversedTransactions = [...relevantTransactions].reverse();

        for (const tx of reversedTransactions) {
            const entry = tx.entries.find(e => e.account_code === selectedAccountCode);
            if (entry) {
                const change = entry.debit - entry.credit;
                const balanceBeforeThisTx = account.type === 'Aset' || account.type === 'Beban'
                    ? runningBalance - change
                    : runningBalance + change;
                
                entries.unshift({
                    ...entry,
                    date: tx.date,
                    desc: tx.desc,
                    ref: tx.ref,
                    running_balance: runningBalance,
                });

                runningBalance = balanceBeforeThisTx;
            }
        }

        return { ledgerEntries: entries, selectedAccount: account };
    }, [selectedAccountCode, accounts, transactions]);

    return (
        <Card>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Buku Besar</h2>
            
            <div className="mb-6 max-w-md">
                <label htmlFor="account-select" className="block text-sm font-medium text-gray-300 mb-1">Pilih Akun</label>
                <select 
                    id="account-select"
                    value={selectedAccountCode} 
                    onChange={e => setSelectedAccountCode(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
                >
                    <option value="">-- Tampilkan Buku Besar untuk --</option>
                    {sortedAccounts.map(acc => (
                        <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                </select>
            </div>

            {loading && <p>Memuat data...</p>}
            {error && <p className="text-red-400">Error: {error}</p>}

            {!loading && !error && selectedAccount && (
                <div>
                    <Card className="mb-6 !bg-slate-900/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-semibold">{selectedAccount.name} ({selectedAccount.code})</h3>
                                <p className="text-gray-400">{selectedAccount.type}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400">Saldo Akhir</p>
                                <p className="text-2xl font-bold">{formatCurrency(selectedAccount.balance)}</p>
                            </div>
                        </div>
                    </Card>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="border-b border-gray-600">
                                    <th className="text-left py-3 px-4">Tanggal</th>
                                    <th className="text-left py-3 px-4">Deskripsi</th>
                                    <th className="text-left py-3 px-4">Ref</th>
                                    <th className="text-right py-3 px-4">Debit</th>
                                    <th className="text-right py-3 px-4">Kredit</th>
                                    <th className="text-right py-3 px-4">Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledgerEntries.length > 0 ? (
                                    ledgerEntries.map((entry, index) => (
                                        <tr key={`${entry.transaction_id}-${index}`} className="border-b border-gray-700 hover:bg-slate-800/50">
                                            <td className="py-3 px-4">{formatDate(entry.date)}</td>
                                            <td className="py-3 px-4">{entry.desc}</td>
                                            <td className="py-3 px-4 text-gray-400">{entry.ref || '-'}</td>
                                            <td className="py-3 px-4 text-right font-mono text-green-400">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                                            <td className="py-3 px-4 text-right font-mono text-red-400">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                                            <td className="py-3 px-4 text-right font-mono">{formatCurrency(entry.running_balance)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-gray-400 py-8">
                                            Tidak ada transaksi untuk akun ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {!loading && !selectedAccountCode && (
                 <div className="text-center text-gray-400 py-16">
                    <p className="text-lg">Silakan pilih akun untuk melihat buku besarnya.</p>
                </div>
            )}
        </Card>
    );
};

export default Ledger;

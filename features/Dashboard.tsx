
import React from 'react';
import Card from '../components/Card';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { Transaction } from '../types';

const SummaryCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        green: 'text-green-400 bg-green-500/20',
        red: 'text-red-400 bg-red-500/20',
        blue: 'text-blue-400 bg-blue-500/20',
        purple: 'text-purple-400 bg-purple-500/20',
    };

    return (
        <Card>
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-xs md:text-sm">{title}</p>
                    <p className={`text-lg md:text-2xl font-bold ${colorClasses[color]?.split(' ')[0]} truncate`}>{formatCurrency(value)}</p>
                </div>
                <div className={`w-10 h-10 md:w-12 md:h-12 ${colorClasses[color]?.split(' ')[1]} rounded-lg flex items-center justify-center ml-3`}>
                    <span className={`text-lg md:text-xl ${colorClasses[color]?.split(' ')[0]}`}>{icon}</span>
                </div>
            </div>
        </Card>
    );
};

const RecentTransactions: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => (
    <Card>
        <h3 className="text-lg md:text-xl font-semibold mb-4">Transaksi Terbaru</h3>
        <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[600px]">
                <thead>
                    <tr className="border-b border-gray-600">
                        <th className="text-left py-2 md:py-3 px-2 md:px-4 text-sm md:text-base">Tanggal</th>
                        <th className="text-left py-2 md:py-3 px-2 md:px-4 text-sm md:text-base">Deskripsi</th>
                        <th className="text-right py-2 md:py-3 px-2 md:px-4 text-sm md:text-base">Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.length > 0 ? (
                        transactions.slice(0, 5).map(tx => (
                            <tr key={tx.id} className="border-b border-gray-700 last:border-b-0">
                                <td className="py-2 md:py-3 px-2 md:px-4 text-gray-300 text-sm md:text-base">{formatDate(tx.date)}</td>
                                <td className="py-2 md:py-3 px-2 md:px-4 text-gray-300 text-sm md:text-base">{tx.desc}</td>
                                <td className="py-2 md:py-3 px-2 md:px-4 text-right text-sm md:text-base font-mono">
                                    {formatCurrency(tx.entries.reduce((sum, entry) => sum + entry.debit, 0))}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr className="border-b border-gray-700">
                            <td className="py-3 px-4 text-gray-300 text-center" colSpan={3}>Belum ada transaksi</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </Card>
);

const Dashboard: React.FC = () => {
    const { accounts, transactions, loading, error } = useData();

    if (loading) return <div className="text-center p-8">Loading dashboard data...</div>;
    if (error) return <div className="text-center p-8 text-red-400">Error: {error}</div>;

    // Recalculate balances on the client side for real-time view
    const balances = accounts.reduce((acc, account) => {
        acc[account.type] = (acc[account.type] || 0) + account.balance;
        return acc;
    }, {} as Record<string, number>);

    const totalAssets = balances['Aset'] || 0;
    const totalLiabilities = balances['Liabilitas'] || 0;
    const totalEquity = balances['Modal'] || 0;
    
    // For profit calculation, it's better to sum up revenue and expense accounts directly
    // This assumes balances are correctly maintained. A more robust way would be to sum transactions in a period.
    const totalRevenue = accounts.filter(a => a.type === 'Pendapatan').reduce((sum, a) => sum + a.balance, 0);
    const totalExpenses = accounts.filter(a => a.type === 'Beban').reduce((sum, a) => sum + a.balance, 0);
    const monthlyProfit = totalRevenue - totalExpenses;


    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                <SummaryCard title="Total Aset" value={totalAssets} icon="💰" color="green" />
                <SummaryCard title="Total Liabilitas" value={totalLiabilities} icon="📊" color="red" />
                <SummaryCard title="Modal" value={totalEquity} icon="🏦" color="blue" />
                <SummaryCard title="Laba (Rugi)" value={monthlyProfit} icon="📈" color="purple" />
            </div>
            <RecentTransactions transactions={transactions} />
        </div>
    );
};

export default Dashboard;

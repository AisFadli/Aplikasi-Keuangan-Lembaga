
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/helpers';
import type { Account, AccountType } from '../types';

const AccountForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    accountToEdit?: Account | null;
}> = ({ isOpen, onClose, accountToEdit }) => {
    const { addAccount, updateAccount, accounts } = useData();
    const [formData, setFormData] = useState<Omit<Account, 'id'>>({
        code: '',
        name: '',
        type: 'Aset',
        balance: 0,
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (accountToEdit) {
            setFormData({
                code: accountToEdit.code,
                name: accountToEdit.name,
                type: accountToEdit.type,
                balance: accountToEdit.balance,
                description: accountToEdit.description,
            });
        } else {
            setFormData({
                code: '',
                name: '',
                type: 'Aset',
                balance: 0,
                description: '',
            });
        }
        setFormError(null);
    }, [accountToEdit, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'balance') {
            setFormData(prev => ({ ...prev, balance: Number(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        
        // Validation
        if (!accountToEdit && accounts.some(acc => acc.code === formData.code)) {
            setFormError(`Kode akun '${formData.code}' sudah digunakan.`);
            return;
        }

        setIsSubmitting(true);
        try {
            if (accountToEdit) {
                const { code, ...updates } = formData;
                await updateAccount(code, updates);
            } else {
                await addAccount(formData);
            }
            onClose();
        } catch (error: any) {
            console.error('Failed to save account:', error);
            setFormError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const accountTypes: AccountType[] = ['Aset', 'Liabilitas', 'Modal', 'Pendapatan', 'Beban'];
    const formInputClasses = "w-full bg-slate-900 border border-slate-700 rounded-md p-2 focus:ring-1 focus:ring-primary focus:border-primary transition-colors";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={accountToEdit ? 'Edit Akun' : 'Buat Akun Baru'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1">Kode Akun</label>
                    <input type="text" name="code" id="code" value={formData.code} onChange={handleInputChange} className={formInputClasses} required disabled={!!accountToEdit} />
                </div>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nama Akun</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className={formInputClasses} required />
                </div>
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">Tipe Akun</label>
                    <select name="type" id="type" value={formData.type} onChange={handleInputChange} className={formInputClasses}>
                        {accountTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Deskripsi</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className={formInputClasses}></textarea>
                </div>
                 {/* Balance field is disabled as it should be managed by transactions */}
                <div>
                    <label htmlFor="balance" className="block text-sm font-medium text-gray-300 mb-1">Saldo Awal</label>
                    <input type="number" name="balance" id="balance" value={formData.balance} onChange={handleInputChange} className={formInputClasses} disabled={!!accountToEdit} />
                     <p className="text-xs text-gray-400 mt-1">Saldo awal hanya bisa diatur saat membuat akun baru.</p>
                </div>

                {formError && <p className="text-red-400 text-sm">{formError}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="py-2 px-4 rounded-md bg-secondary hover:bg-secondary/80 disabled:bg-gray-500 transition-colors">
                        {isSubmitting ? 'Menyimpan...' : (accountToEdit ? 'Simpan Perubahan' : 'Buat Akun')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const Accounts: React.FC = () => {
    const { accounts, loading, error, deleteAccount } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<AccountType | 'All'>('All');

    const handleOpenModal = (account?: Account) => {
        setEditingAccount(account || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    const handleDelete = async (account: Account) => {
        if (account.balance !== 0) {
            alert("Tidak dapat menghapus akun dengan saldo yang tidak nol. Harap transfer saldo ke akun lain terlebih dahulu.");
            return;
        }

        if (window.confirm(`Apakah Anda yakin ingin menghapus akun '${account.code} - ${account.name}'?`)) {
            try {
                await deleteAccount(account.code);
            } catch (err: any) {
                alert(`Gagal menghapus akun: ${err.message}`);
            }
        }
    };
    
    const filteredAccounts = useMemo(() => {
        return accounts
            .filter(acc => {
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch = acc.name.toLowerCase().includes(searchLower) || acc.code.toLowerCase().includes(searchLower);
                const matchesType = filterType === 'All' ? true : acc.type === filterType;
                return matchesSearch && matchesType;
            })
            .sort((a, b) => a.code.localeCompare(b.code));
    }, [accounts, searchTerm, filterType]);

    const accountTypes: AccountType[] = ['Aset', 'Liabilitas', 'Modal', 'Pendapatan', 'Beban'];

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Bagan Akun (Chart of Accounts)</h2>
                <button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg">
                    + Akun Baru
                </button>
            </div>
            
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="Cari nama atau kode akun..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as AccountType | 'All')}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
                >
                    <option value="All">Semua Tipe Akun</option>
                    {accountTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>

            {loading && <div className="text-center py-8">Memuat daftar akun...</div>}
            {error && <div className="text-center py-8 text-red-400">Error: {error}</div>}

            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="text-left py-3 px-4">Kode</th>
                                <th className="text-left py-3 px-4">Nama Akun</th>
                                <th className="text-left py-3 px-4">Tipe</th>
                                <th className="text-right py-3 px-4">Saldo</th>
                                <th className="text-center py-3 px-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAccounts.length > 0 ? (
                                filteredAccounts.map(acc => (
                                    <tr key={acc.code} className="border-b border-gray-700 hover:bg-slate-800/50">
                                        <td className="py-3 px-4 font-mono">{acc.code}</td>
                                        <td className="py-3 px-4">{acc.name}</td>
                                        <td className="py-3 px-4 text-gray-300">{acc.type}</td>
                                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(acc.balance)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <button onClick={() => handleOpenModal(acc)} className="text-blue-400 hover:underline text-sm mr-3">Edit</button>
                                            <button
                                                onClick={() => handleDelete(acc)}
                                                className={`text-sm ${acc.balance !== 0 ? 'text-gray-500 cursor-not-allowed' : 'text-red-400 hover:underline'}`}
                                                title={acc.balance !== 0 ? "Tidak bisa dihapus karena saldo tidak nol" : "Hapus akun"}
                                                disabled={acc.balance !== 0}
                                            >
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center text-gray-400 py-8">
                                        {accounts.length > 0 ? 'Tidak ada akun yang cocok dengan kriteria.' : "Belum ada akun. Klik 'Akun Baru' untuk memulai."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <AccountForm isOpen={isModalOpen} onClose={handleCloseModal} accountToEdit={editingAccount} />
        </Card>
    );
};

export default Accounts;

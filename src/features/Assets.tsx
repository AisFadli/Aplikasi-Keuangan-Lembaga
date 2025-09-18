
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency, getTodayDateString } from '../utils/helpers';
import type { Asset } from '../types';

type AssetFormData = Omit<Asset, 'id'>;

const AssetForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    assetToEdit?: Asset | null;
}> = ({ isOpen, onClose, assetToEdit }) => {
    const { addAsset, updateAsset } = useData();
    const [formData, setFormData] = useState<AssetFormData>({
        name: '',
        category: '',
        cost: 0,
        date: getTodayDateString(),
        life: null,
        residual: 0,
        method: null,
        is_depreciable: false,
        accumulated_depreciation: 0,
        last_depreciation_date: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (assetToEdit) {
            setFormData({
                name: assetToEdit.name,
                category: assetToEdit.category,
                cost: assetToEdit.cost,
                date: assetToEdit.date,
                life: assetToEdit.life,
                residual: assetToEdit.residual,
                method: assetToEdit.method,
                is_depreciable: assetToEdit.is_depreciable,
                accumulated_depreciation: assetToEdit.accumulated_depreciation,
                last_depreciation_date: assetToEdit.last_depreciation_date,
            });
        } else {
            setFormData({
                name: '',
                category: '',
                cost: 0,
                date: getTodayDateString(),
                life: null,
                residual: 0,
                method: null,
                is_depreciable: false,
                accumulated_depreciation: 0,
                last_depreciation_date: null,
            });
        }
        setFormError(null);
    }, [assetToEdit, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, is_depreciable: checked, method: checked ? 'straight-line' : null, life: checked ? (prev.life || 5) : null }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: Number(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsSubmitting(true);
        try {
            if (assetToEdit?.id) {
                await updateAsset(assetToEdit.id, formData);
            } else {
                await addAsset(formData);
            }
            onClose();
        } catch (error: any) {
            setFormError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formInputClasses = "w-full bg-slate-900 border border-slate-700 rounded-md p-2 focus:ring-1 focus:ring-primary focus:border-primary transition-colors";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={assetToEdit ? 'Edit Aset' : 'Tambah Aset Baru'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nama Aset</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className={formInputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
                        <input type="text" name="category" id="category" value={formData.category} onChange={handleInputChange} className={formInputClasses} placeholder="e.g., Peralatan Kantor" />
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">Tanggal Perolehan</label>
                        <input type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} className={formInputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="cost" className="block text-sm font-medium text-gray-300 mb-1">Harga Perolehan</label>
                        <input type="number" name="cost" id="cost" value={formData.cost || ''} onChange={handleInputChange} className={formInputClasses} required />
                    </div>
                    <div>
                         <label htmlFor="accumulated_depreciation" className="block text-sm font-medium text-gray-300 mb-1">Akumulasi Penyusutan Awal</label>
                        <input type="number" name="accumulated_depreciation" id="accumulated_depreciation" value={formData.accumulated_depreciation || ''} onChange={handleInputChange} className={formInputClasses} disabled={!!assetToEdit} />
                        {!assetToEdit && <p className="text-xs text-gray-400 mt-1">Default 0 untuk aset baru.</p>}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                    <label className="flex items-center space-x-2">
                        <input type="checkbox" name="is_depreciable" checked={formData.is_depreciable} onChange={handleInputChange} className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-primary focus:ring-primary" />
                        <span>Aset ini dapat disusutkan</span>
                    </label>
                </div>

                {formData.is_depreciable && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900 rounded-lg">
                        <div>
                             <label htmlFor="life" className="block text-sm font-medium text-gray-300 mb-1">Masa Manfaat (Tahun)</label>
                            <input type="number" name="life" id="life" value={formData.life || ''} onChange={handleInputChange} className={formInputClasses} />
                        </div>
                        <div>
                            <label htmlFor="residual" className="block text-sm font-medium text-gray-300 mb-1">Nilai Residu</label>
                            <input type="number" name="residual" id="residual" value={formData.residual || ''} onChange={handleInputChange} className={formInputClasses} />
                        </div>
                        <div>
                             <label htmlFor="method" className="block text-sm font-medium text-gray-300 mb-1">Metode Penyusutan</label>
                            <select name="method" id="method" value={formData.method || ''} onChange={handleInputChange} className={formInputClasses}>
                                <option value="straight-line">Garis Lurus</option>
                                <option value="declining-balance" disabled>Saldo Menurun (Segera Hadir)</option>
                            </select>
                        </div>
                    </div>
                )}

                {formError && <p className="text-red-400 text-sm">{formError}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="py-2 px-4 rounded-md bg-primary hover:bg-primary/80 disabled:bg-gray-500">
                        {isSubmitting ? 'Menyimpan...' : (assetToEdit ? 'Simpan Perubahan' : 'Tambah Aset')}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

const DepreciationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const { assets, runDepreciation } = useData();
    const [depreciationDate, setDepreciationDate] = useState(getTodayDateString());
    const [preview, setPreview] = useState<{ asset: Asset; amount: number }[] | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculateDepreciationForAsset = (asset: Asset, upToDate: string) => {
        if (!asset.is_depreciable || !asset.life || asset.life <= 0) {
            return 0;
        }

        const depreciableBase = asset.cost - asset.residual;
        if (asset.accumulated_depreciation >= depreciableBase) {
            return 0; // Already fully depreciated
        }

        const startDate = new Date(asset.last_depreciation_date || asset.date);
        const endDate = new Date(upToDate);

        if (endDate <= startDate) {
            return 0;
        }
        
        // Calculate difference in months
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
        if (months <= 0) return 0;

        const monthlyDepreciation = depreciableBase / (asset.life * 12);
        let calculatedAmount = monthlyDepreciation * months;

        // Cap depreciation at the remaining depreciable value
        const remainingValue = depreciableBase - asset.accumulated_depreciation;
        if (calculatedAmount > remainingValue) {
            calculatedAmount = remainingValue;
        }
        
        return calculatedAmount > 0 ? calculatedAmount : 0;
    };
    
    const handlePreview = () => {
        setError(null);
        setPreview(null);
        const assetsToDepreciate = assets
            .map(asset => {
                const amount = calculateDepreciationForAsset(asset, depreciationDate);
                return { asset, amount };
            })
            .filter(item => item.amount > 0);
        
        if(assetsToDepreciate.length === 0) {
            setError("Tidak ada aset yang perlu disusutkan hingga tanggal yang dipilih.");
        }
        setPreview(assetsToDepreciate);
    };

    const handleConfirm = async () => {
        if (!preview || preview.length === 0) return;
        
        setIsProcessing(true);
        setError(null);
        try {
            await runDepreciation(depreciationDate, preview);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setPreview(null);
            setError(null);
            setIsProcessing(false);
            setDepreciationDate(getTodayDateString());
        }
    }, [isOpen]);

    const totalDepreciation = useMemo(() => {
        return preview?.reduce((sum, item) => sum + item.amount, 0) || 0;
    }, [preview]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Jalankan Penyusutan Aset" size="xl">
            <div className="space-y-4">
                <p className="text-sm text-gray-300">
                    Fitur ini akan menghitung penyusutan untuk semua aset yang dapat disusutkan dari tanggal penyusutan terakhir (atau tanggal perolehan) hingga tanggal yang Anda pilih. Sebuah entri jurnal akan dibuat secara otomatis.
                </p>
                <div className="flex items-end gap-4 p-4 bg-slate-900 rounded-lg">
                    <div>
                        <label htmlFor="depreciationDate" className="block text-sm font-medium text-gray-300 mb-1">Hitung Penyusutan s/d Tanggal</label>
                        <input type="date" id="depreciationDate" value={depreciationDate} onChange={e => setDepreciationDate(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" />
                    </div>
                    <button onClick={handlePreview} className="bg-secondary hover:bg-secondary/80 text-white font-bold py-2 px-4 rounded-lg">
                        Pratinjau
                    </button>
                </div>

                {error && <p className="text-red-400 text-center">{error}</p>}

                {preview && (
                    <div>
                        <h4 className="font-semibold mb-2">Pratinjau Jurnal Penyusutan:</h4>
                        <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-lg">
                             <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-800">
                                    <tr>
                                        <th className="text-left p-2">Nama Aset</th>
                                        <th className="text-right p-2">Jumlah Penyusutan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map(({ asset, amount }) => (
                                        <tr key={asset.id} className="border-t border-slate-700">
                                            <td className="p-2">{asset.name}</td>
                                            <td className="p-2 text-right font-mono">{formatCurrency(amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-2 p-2 bg-slate-900 rounded-lg">
                           <p className="font-bold">Total Penyusutan: {formatCurrency(totalDepreciation)}</p>
                        </div>
                        <div className="mt-4 text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
                            <p>Jurnal Entri yang akan dibuat:</p>
                            <p><strong>Debit:</strong> 5400 - Beban Penyusutan</p>
                            <p><strong>Kredit:</strong> 1600 - Akumulasi Penyusutan Peralatan</p>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500">Batal</button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isProcessing || !preview || preview.length === 0}
                    className="py-2 px-4 rounded-md bg-primary hover:bg-primary/80 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Memproses...' : 'Konfirmasi & Buat Jurnal'}
                </button>
            </div>
        </Modal>
    );
};

const Assets: React.FC = () => {
    const { assets, loading, error, deleteAsset } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDepreciationModalOpen, setIsDepreciationModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const assetCategories = useMemo(() => ['All', ...[...new Set(assets.map(a => a.category).filter(Boolean))]], [assets]);
    
    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = asset.name.toLowerCase().includes(searchLower) || asset.category.toLowerCase().includes(searchLower);
            const matchesCategory = selectedCategory === 'All' ? true : asset.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [assets, searchTerm, selectedCategory]);

    const handleOpenModal = (asset?: Asset) => {
        setEditingAsset(asset || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAsset(null);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus aset ini?')) {
            try {
                await deleteAsset(id);
            } catch (err: any) {
                alert(`Gagal menghapus aset: ${err.message}`);
            }
        }
    };

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-2">
                <h2 className="text-2xl md:text-3xl font-bold">Manajemen Aset</h2>
                <div className="flex gap-2">
                    <button onClick={() => setIsDepreciationModalOpen(true)} className="bg-accent hover:bg-accent/80 text-white font-bold py-2 px-4 rounded-lg">
                        Jalankan Penyusutan
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg">
                        + Aset Baru
                    </button>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="Cari nama atau kategori aset..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
                />
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
                >
                    {assetCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            {loading && <div className="text-center py-8">Memuat daftar aset...</div>}
            {error && <div className="text-center py-8 text-red-400">Error: {error}</div>}

            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="text-left py-3 px-4">Nama Aset</th>
                                <th className="text-left py-3 px-4">Kategori</th>
                                <th className="text-left py-3 px-4">Tgl. Perolehan</th>
                                <th className="text-right py-3 px-4">Harga Perolehan</th>
                                <th className="text-right py-3 px-4">Akum. Penyusutan</th>
                                <th className="text-right py-3 px-4">Nilai Buku</th>
                                <th className="text-center py-3 px-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssets.length > 0 ? (
                                filteredAssets.map(asset => {
                                    const bookValue = asset.cost - asset.accumulated_depreciation;
                                    return (
                                        <tr key={asset.id} className="border-b border-gray-700 hover:bg-slate-800/50">
                                            <td className="py-3 px-4">{asset.name}</td>
                                            <td className="py-3 px-4 text-gray-300">{asset.category}</td>
                                            <td className="py-3 px-4">{formatDate(asset.date)}</td>
                                            <td className="py-3 px-4 text-right font-mono">{formatCurrency(asset.cost)}</td>
                                            <td className="py-3 px-4 text-right font-mono">{formatCurrency(asset.accumulated_depreciation)}</td>
                                            <td className="py-3 px-4 text-right font-mono font-bold">{formatCurrency(bookValue)}</td>
                                            <td className="py-3 px-4 text-center">
                                                <button onClick={() => handleOpenModal(asset)} className="text-blue-400 hover:underline text-sm mr-3">Edit</button>
                                                <button onClick={() => handleDelete(asset.id!)} className="text-red-400 hover:underline text-sm">Hapus</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center text-gray-400 py-8">
                                        Belum ada aset. Klik 'Aset Baru' untuk memulai.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <AssetForm isOpen={isModalOpen} onClose={handleCloseModal} assetToEdit={editingAsset} />
            <DepreciationModal isOpen={isDepreciationModalOpen} onClose={() => setIsDepreciationModalOpen(false)} />
        </Card>
    );
};

export default Assets;

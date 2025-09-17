
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
                        <input type="number" name="accumulated_depreciation" id="accumulated_depreciation" value={formData.accumulated_depreciation || ''} onChange={handleInputChange} className={formInputClasses} disabled={!assetToEdit} />
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

const Assets: React.FC = () => {
    const { assets, loading, error, deleteAsset } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Manajemen Aset</h2>
                <button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg">
                    + Aset Baru
                </button>
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
                            {assets.length > 0 ? (
                                assets.map(asset => {
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
        </Card>
    );
};

export default Assets;

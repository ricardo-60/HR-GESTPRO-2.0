import React, { useState } from 'react';
import { useSuppliers } from '../hooks/useSuppliers';
import { Supplier } from '../types';
import {
    Plus,
    Search,
    Building2,
    Phone,
    Mail,
    MapPin,
    Hash,
    Pencil,
    Trash2,
    X,
    Check,
    AlertCircle
} from 'lucide-react';

export default function Suppliers() {
    const { suppliers, loading, error, addSupplier, updateSupplier } = useSuppliers();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        nif: '',
        address: '',
        phone: '',
        email: ''
    });
    const [formError, setFormError] = useState<string | null>(null);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nif?.includes(searchTerm)
    );

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name,
                nif: supplier.nif || '',
                address: supplier.address || '',
                phone: supplier.phone || '',
                email: supplier.email || ''
            });
        } else {
            setEditingSupplier(null);
            setFormData({
                name: '',
                nif: '',
                address: '',
                phone: '',
                email: ''
            });
        }
        setFormError(null);
        setIsModalOpen(true);
    };

    const validateNIF = (nif: string) => {
        // Validação básica de NIF Angolano (9 dígitos)
        return /^\d{9}$/.test(nif);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.name) {
            setFormError('O nome é obrigatório.');
            return;
        }

        if (formData.nif && !validateNIF(formData.nif)) {
            setFormError('NIF Angolano inválido (deve conter 9 dígitos).');
            return;
        }

        try {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, formData);
            } else {
                await addSupplier(formData);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            setFormError(err.message);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        Gestão de Fornecedores
                    </h1>
                    <p className="text-slate-500 mt-1">Gira os teus parceiros e cadeias de aprovisionamento.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-200"
                >
                    <Plus className="w-5 h-5" />
                    Novo Fornecedor
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Procurar por nome ou NIF..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse space-y-4">
                            <div className="h-6 bg-slate-100 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                            <div className="h-4 bg-slate-100 rounded w-full"></div>
                        </div>
                    ))
                ) : filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map(supplier => (
                        <div
                            key={supplier.id}
                            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenModal(supplier)}
                                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{supplier.name}</h3>
                                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                                            <Hash className="w-4 h-4" />
                                            {supplier.nif || 'Sem NIF'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-50">
                                    {supplier.phone && (
                                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            {supplier.phone}
                                        </div>
                                    )}
                                    {supplier.email && (
                                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            {supplier.email}
                                        </div>
                                    )}
                                    {supplier.address && (
                                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="line-clamp-1">{supplier.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Nenhum fornecedor encontrado</h3>
                        <p className="text-slate-500">Tenta ajustar a tua pesquisa ou adiciona um novo parceiro.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>

                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-900 leading-none">
                                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Nome / Razão Social *</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Armazéns Aliança Lda"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">NIF Angolano</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.nif}
                                        onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                                        placeholder="9 dígitos"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">Telefone</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+244..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 ml-1">E-mail de Contacto</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="fornecedor@email.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Morada Completa</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Rua, Bairro, Província..."
                                />
                            </div>

                            <div className="pt-4 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-5 h-5" />
                                    {editingSupplier ? 'Guardar Alterações' : 'Criar Fornecedor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

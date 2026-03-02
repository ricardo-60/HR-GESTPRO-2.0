import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { generateInvoiceA4, generateThermalReceipt, InvoiceData, InvoiceItem } from '../lib/InvoiceGenerator';
import { Tenant } from '../types';

interface PosSession {
    id: string;
    opening_balance: number;
    total_sales: number;
    invoices_count: number;
    status: string;
}

const SalesManagement: React.FC = () => {
    const { tenantStatus, tenantId, user, profile } = useAuth();
    const [isPosOpen, setIsPosOpen] = useState(false);

    // POS Tracking
    const [session, setSession] = useState<PosSession | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [showOpenBox, setShowOpenBox] = useState(false);
    const [showCloseBox, setShowCloseBox] = useState(false);
    const [openingBalance, setOpeningBalance] = useState<number>(0);
    const [actualBalance, setActualBalance] = useState<number>(0);

    // POS Cart State
    const [docType, setDocType] = useState<'FT' | 'PF'>('FT');
    const [clientName, setClientName] = useState('Consumidor Final');
    const [clientNif, setClientNif] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([]);

    const [newItemName, setNewItemName] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemPrice, setNewItemPrice] = useState(1000);

    const subtotal = items.reduce((acc, curr) => acc + curr.total, 0);
    const tax = subtotal * 0.14; // 14% IVA
    const total = subtotal + tax;

    const fetchSession = async () => {
        if (!supabase || !user) return;
        setLoadingSession(true);
        const { data, error } = await supabase
            .from('pos_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'open')
            .maybeSingle();

        if (data && !error) {
            setSession(data);
        } else {
            setSession(null);
        }
        setLoadingSession(false);
    };

    useEffect(() => {
        fetchSession();
    }, [user]);

    const handleOpenBox = async () => {
        if (!supabase || !tenantId || !user) return;

        // Block if user cannot close sales (which implicitly means "manage a till")
        if (!profile?.can_close_sales && profile?.role !== 'master_admin') {
            alert('Acesso negado: Não tem permissões para operar o Caixa.');
            return;
        }

        const { data, error } = await supabase.from('pos_sessions').insert([{
            tenant_id: tenantId,
            user_id: user.id,
            opening_balance: openingBalance,
            total_sales: 0,
            invoices_count: 0,
            status: 'open'
        }]).select().single();

        if (error) {
            alert('Erro ao abrir caixa: ' + error.message);
        } else {
            setSession(data);
            setShowOpenBox(false);
        }
    };

    const handleCloseBox = async () => {
        if (!supabase || !session) return;
        const expected = session.opening_balance + session.total_sales;
        const diff = actualBalance - expected;

        const { error } = await supabase.from('pos_sessions').update({
            closed_at: new Date().toISOString(),
            expected_closing_balance: expected,
            actual_closing_balance: actualBalance,
            difference: diff,
            status: 'closed',
            closed_by: user?.id
        }).eq('id', session.id);

        if (error) {
            alert('Erro ao fechar caixa: ' + error.message);
        } else {
            alert(`Caixa Fechado com Sucesso. Diferença: ${diff.toFixed(2)} KZ`);
            setSession(null);
            setShowCloseBox(false);
        }
    };

    const addItem = () => {
        if (!newItemName) return;
        const newItem: InvoiceItem = {
            id: Math.random().toString(),
            name: newItemName,
            quantity: newItemQty,
            unit_price: newItemPrice,
            total: newItemQty * newItemPrice
        };
        setItems([...items, newItem]);
        setNewItemName('');
        setNewItemQty(1);
        setNewItemPrice(1000);
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const checkout = async (format: 'A4' | 'THERMAL') => {
        if (items.length === 0) return alert('Adicione artigos à venda antes de faturar.');
        if (!session || !supabase || !tenantId) return alert('Não existe um caixa aberto/Tenant ID.');

        try {
            // 1. Get next invoice number safely
            const { data: invoiceNo, error: rpcError } = await supabase.rpc('generate_next_invoice_number', {
                p_tenant_id: tenantId,
                p_doc_type: docType
            });
            if (rpcError) throw rpcError;

            // 2. Serialize Invoice
            const { data: invoiceRecord, error: invError } = await supabase.from('invoices').insert([{
                tenant_id: tenantId,
                pos_session_id: session.id,
                invoice_no: invoiceNo,
                doc_type: docType,
                client_name: clientName,
                client_tax_id: clientNif || null,
                subtotal, tax_amount: tax, total_amount: total,
                status: docType === 'PF' ? 'issued' : 'converted',
                created_by: user?.id
            }]).select().single();
            if (invError) throw invError;

            // 3. Serialize Items
            const itemsToInsert = items.map(i => ({
                invoice_id: invoiceRecord.id,
                product_name: i.name,
                quantity: i.quantity,
                unit_price: i.unit_price,
                total: i.total
            }));
            const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // 4. Update session running totals (only for actual Sales, not Proformas)
            if (docType !== 'PF') {
                await supabase.from('pos_sessions').update({
                    total_sales: session.total_sales + total,
                    invoices_count: session.invoices_count + 1
                }).eq('id', session.id);

                setSession({
                    ...session,
                    total_sales: session.total_sales + total,
                    invoices_count: session.invoices_count + 1
                });
            }

            // 5. Build PDF Logic
            const invoice: InvoiceData = {
                id: invoiceNo,
                client_name: clientName,
                client_tax_id: clientNif,
                date: new Date().toLocaleDateString('pt-PT') + ' ' + new Date().toLocaleTimeString('pt-PT'),
                items,
                subtotal,
                tax,
                total
            };

            const currentTenant: Tenant = {
                id: tenantStatus?.tenant_id || '',
                company_name: tenantStatus?.company_name || 'Empresa Local',
                tax_id: '123456789',
                status: tenantStatus?.status || 'active' as any,
                plan_tier: 'Pro',
                address: 'Luanda, Angola',
                phone: '+244 923 000 000',
            };

            if (format === 'A4') {
                const doc = await generateInvoiceA4(invoice, currentTenant);
                doc.save(`${invoice.id}.pdf`);
            } else {
                const doc = await generateThermalReceipt(invoice, currentTenant);
                doc.save(`${invoice.id}_Talao.pdf`);
            }

            // Reset POS
            setItems([]);
            setIsPosOpen(false);
            setClientName('Consumidor Final');
            setClientNif('');
        } catch (error: any) {
            console.error(error);
            alert('Erro ao emitir documento oficial: ' + (error.message || 'Desconhecido'));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Painel de Vendas</h2>
                    <p className="text-slate-500 font-medium">
                        Gestão Comercial da entidade: <span className="text-indigo-600 font-bold">{tenantStatus?.company_name || 'Organização'}</span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {loadingSession ? (
                        <div className="text-xs text-slate-400 font-bold py-3 pr-4 animate-pulse">A verificar Caixa...</div>
                    ) : session ? (
                        <>
                            <button
                                onClick={() => setShowCloseBox(true)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all focus:ring-4 focus:ring-rose-100 flex items-center space-x-2"
                            >
                                <i className="fas fa-lock"></i>
                                <span>Fechar Caixa</span>
                            </button>
                            <button
                                onClick={() => setIsPosOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all focus:ring-4 focus:ring-indigo-100 flex items-center space-x-2"
                            >
                                <i className="fas fa-plus"></i>
                                <span>Nova Venda / PDV</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setShowOpenBox(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all focus:ring-4 focus:ring-emerald-100 flex items-center space-x-2"
                        >
                            <i className="fas fa-cash-register"></i>
                            <span>Abrir Caixa para Iniciar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Stats Modificados pelo Session */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group ${session ? 'bg-white border-emerald-200' : 'bg-slate-50 border-gray-200 opacity-50'}`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 ${session ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            <i className="fas fa-money-bill-wave"></i>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Vendas no Turno</p>
                        <p className={`text-3xl font-black tracking-tighter ${session ? 'text-slate-800' : 'text-slate-400'}`}>
                            {session ? `KZ ${session.total_sales.toFixed(2)}` : 'KZ 0,00'}
                        </p>
                    </div>
                </div>

                <div className={`p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group ${session ? 'bg-white border-blue-200' : 'bg-slate-50 border-gray-200 opacity-50'}`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 ${session ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                            <i className="fas fa-file-invoice"></i>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Faturas Emitidas</p>
                        <p className={`text-3xl font-black tracking-tighter ${session ? 'text-slate-800' : 'text-slate-400'}`}>
                            {session ? session.invoices_count : '0'}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Estado Operacional</p>
                        <p className="text-xl font-black text-slate-800 tracking-tighter mt-3">
                            {session ? (
                                <span className="text-emerald-500 flex items-center"><span className="w-3 h-3 bg-emerald-500 rounded-full mr-2 animate-pulse"></span> Em Operação</span>
                            ) : (
                                <span className="text-rose-500 flex items-center"><i className="fas fa-lock mr-2 text-sm"></i> Caixa Fechado</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal Abrir Caixa */}
            {showOpenBox && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-8 text-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                            <i className="fas fa-cash-register"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Abrir Caixa</h3>
                        <p className="text-slate-500 text-sm mb-8">Insira o saldo inicial na gaveta para iniciar o turno de vendas.</p>

                        <div className="text-left mb-8">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Fundo de Maneio (KZ)</label>
                            <input
                                type="number"
                                className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-slate-900 text-2xl"
                                value={openingBalance}
                                onChange={e => setOpeningBalance(Number(e.target.value))}
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button onClick={() => setShowOpenBox(false)} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors w-full">
                                Cancelar
                            </button>
                            <button onClick={handleOpenBox} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-xl font-black transition-colors shadow-lg shadow-emerald-600/30 w-full">
                                Iniciar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Fechar Caixa */}
            {showCloseBox && session && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col p-8 text-center">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                            <i className="fas fa-lock"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Encerrar Turno</h3>
                        <p className="text-slate-500 text-sm mb-8">Conte o dinheiro na gaveta e confirme os TPA/Multicaixa para efetuar o fecho cego.</p>

                        <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 font-bold text-sm">Fundo Inicial</span>
                                <span className="text-slate-900 font-black">KZ {session.opening_balance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-4">
                                <span className="text-slate-500 font-bold text-sm">Vendas Registadas</span>
                                <span className="text-emerald-600 font-black">+ KZ {session.total_sales.toFixed(2)}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Esperado</span>
                                <span className="text-xl font-black text-slate-900 tracking-tight">KZ {(session.opening_balance + session.total_sales).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="text-left mb-8">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Contado (Real)</label>
                            <input
                                type="number"
                                className="w-full px-5 py-4 bg-indigo-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none font-black text-indigo-900 text-2xl"
                                value={actualBalance}
                                onChange={e => setActualBalance(Number(e.target.value))}
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button onClick={() => setShowCloseBox(false)} className="px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors w-full">
                                Cancelar
                            </button>
                            <button onClick={handleCloseBox} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-4 rounded-2xl font-black transition-colors shadow-lg shadow-rose-600/30 w-full">
                                Confirmar Fecho
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* POS Modal */}
            {isPosOpen && session && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Ponto de Venda (PDV)</h3>
                                <p className="text-slate-500 text-sm">Turno Operacional Aberto.</p>
                            </div>
                            <button onClick={() => setIsPosOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <i className="fas fa-times text-2xl"></i>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Left Col: Setup & Items */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cliente</label>
                                        <input
                                            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900"
                                            value={clientName}
                                            onChange={e => setClientName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">NIF do Cliente</label>
                                        <input
                                            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900"
                                            value={clientNif}
                                            placeholder="Opcional"
                                            onChange={e => setClientNif(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Adicionar Artigo</h4>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm font-medium"
                                            placeholder="Nome do produto"
                                            value={newItemName}
                                            onChange={e => setNewItemName(e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            className="w-20 px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm font-medium"
                                            placeholder="Qtd"
                                            min="1"
                                            value={newItemQty}
                                            onChange={e => setNewItemQty(Number(e.target.value))}
                                        />
                                        <input
                                            type="number"
                                            className="w-32 px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm font-medium border-l-4 border-l-indigo-400"
                                            placeholder="Preço (KZ)"
                                            value={newItemPrice}
                                            onChange={e => setNewItemPrice(Number(e.target.value))}
                                        />
                                        <button
                                            onClick={addItem}
                                            className="bg-slate-900 text-white px-5 py-2 rounded-xl font-black hover:bg-black transition-all shadow-md"
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-5 py-4">Artigo</th>
                                                <th className="px-5 py-4 text-center">Qtd</th>
                                                <th className="px-5 py-4 text-right">Preço</th>
                                                <th className="px-5 py-4 text-right">Total</th>
                                                <th className="px-5 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50/50">
                                                        Nenhum artigo registado
                                                    </td>
                                                </tr>
                                            )}
                                            {items.map(item => (
                                                <tr key={item.id} className="hover:bg-indigo-50/50 transition-colors group">
                                                    <td className="px-5 py-4 font-bold text-slate-900">{item.name}</td>
                                                    <td className="px-5 py-4 text-center font-medium text-slate-500">{item.quantity}</td>
                                                    <td className="px-5 py-4 text-right font-medium text-slate-500">{item.unit_price.toFixed(2)}</td>
                                                    <td className="px-5 py-4 text-right font-black text-indigo-900">{item.total.toFixed(2)}</td>
                                                    <td className="px-5 py-4 text-right">
                                                        <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                                                            <i className="fas fa-times-circle"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right Col: Totals & Checkout */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-10 -mt-10"></div>
                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo Comercial</h3>
                                    <select
                                        className="bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1 outline-none text-indigo-300"
                                        value={docType}
                                        onChange={e => setDocType(e.target.value as any)}
                                    >
                                        <option value="FT">Fatura-Recibo (FT)</option>
                                        <option value="PF">Fatura Proforma (PF)</option>
                                    </select>
                                </div>

                                <div className="space-y-6 mb-8 flex-1 relative z-10">
                                    <div className="flex justify-between text-sm font-bold text-slate-400">
                                        <span>Mercadoria</span>
                                        <span className="text-white">KZ {subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-slate-400">
                                        <span>IVA (14%)</span>
                                        <span className="text-white">KZ {tax.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-6 border-t border-slate-800 flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Global</span>
                                        <span className="text-4xl font-black text-white tracking-tighter">KZ {total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 relative z-10 mt-auto">
                                    <button
                                        onClick={() => checkout('A4')}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-3 group"
                                    >
                                        <i className="fas fa-file-pdf group-hover:scale-110 transition-transform"></i>
                                        <span className="text-xs uppercase tracking-widest">Fatura A4</span>
                                    </button>
                                    <button
                                        onClick={() => checkout('THERMAL')}
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-xl transition-colors flex items-center justify-center space-x-3 text-xs uppercase tracking-widest"
                                    >
                                        <i className="fas fa-receipt"></i>
                                        <span>Talão 80mm</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesManagement;

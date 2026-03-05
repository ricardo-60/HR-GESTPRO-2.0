import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateInvoiceA4, generateThermalReceipt, InvoiceData, InvoiceItem as LibInvoiceItem } from '../../lib/InvoiceGenerator';
import { Tenant } from '../../types';
import { usePosTerminal } from '../../hooks/usePosTerminal';
import { offlineSync } from '../../lib/offlineSync';

interface PosSession {
    id: string;
    opening_balance: number;
    total_sales: number;
    invoices_count: number;
    status: string;
}

export const PosTerminal = ({ session, tenantId, user, onUpdateSession, tenantStatus, onClose }:
    { session: PosSession, tenantId: string, user: any, onUpdateSession: () => void, tenantStatus: any, onClose: () => void }) => {

    const {
        docType, setDocType,
        paymentMethod, setPaymentMethod,
        dueDate, setDueDate,
        customers,
        searchProd, setSearchProd,
        selectedCustomer,
        clientName, setClientName,
        clientNif, setClientNif,
        items,
        newItemName, setNewItemName,
        newItemQty, setNewItemQty,
        newItemPrice, setNewItemPrice,
        unTaxedSubtotal,
        globalDiscount,
        subtotal,
        tax,
        total,
        filteredProducts,
        handleSelectCustomer,
        addDbProduct,
        addManualItem,
        removeItem,
        applyDiscount,
        resetCheckout
    } = usePosTerminal(
        tenantId,
        session,
        !!tenantStatus?.is_iva_enabled,
        tenantStatus?.tax_regime || 'Exclusion',
        tenantStatus?.allow_negative_stock || false
    );

    const checkout = async (format: 'A4' | 'THERMAL') => {
        if (items.length === 0) return alert('Adicione artigos à venda antes de faturar.');
        if (!session || !supabase || !tenantId) return alert('Não existe um caixa aberto/Tenant ID.');
        if (paymentMethod === 'credit' && !dueDate) return alert('Selecione a data de vencimento para venda a crédito.');

        const currentTenant: Tenant = {
            id: tenantStatus?.tenant_id || '',
            company_name: tenantStatus?.company_name || 'Empresa Local',
            tax_id: tenantStatus?.tax_id || '123456789',
            status: tenantStatus?.status || ('active' as any),
            plan_tier: 'Pro',
            address: tenantStatus?.address || 'Luanda, Angola',
            phone: tenantStatus?.phone || '+244 923 000 000',
            bank_name: tenantStatus?.bank_name || 'BAI',
            bank_account: tenantStatus?.bank_account || '',
            bank_iban: tenantStatus?.bank_iban || '',
            tax_regime: tenantStatus?.tax_regime || 'Exclusion'
        };

        try {
            // 1. Get next invoice number safely
            const { data: invoiceNo, error: rpcError } = await supabase.rpc('generate_next_invoice_number', {
                p_tenant_id: tenantId,
                p_doc_type: docType
            });
            if (rpcError) throw rpcError;

            const finalStatus = docType === 'PF' ? 'issued' : 'converted';
            const finalPayStatus = (docType === 'PF' || paymentMethod === 'credit') ? 'pending' : 'paid';

            // 2. Serialize Invoice
            const { data: invoiceRecord, error: invError } = await supabase.from('invoices').insert([{
                tenant_id: tenantId,
                pos_session_id: session.id,
                invoice_no: invoiceNo || `${docType} MANUAL/${Date.now()}`,
                doc_type: docType,
                customer_id: selectedCustomer?.id || null,
                client_name: clientName,
                client_tax_id: clientNif || null,
                payment_method: paymentMethod,
                payment_status: finalPayStatus,
                due_date: dueDate || null,
                subtotal, tax_amount: tax, discount_amount: globalDiscount, total_amount: total,
                status: finalStatus,
                created_by: user?.id
            }]).select().single();
            if (invError) throw invError;

            // 3. Serialize Items
            const itemsToInsert = items.map(i => ({
                invoice_id: invoiceRecord.id,
                product_id: i.product_id || null,
                product_name: i.name,
                quantity: i.quantity,
                unit_price: i.unit_price,
                discount: i.discount,
                total: i.total
            }));
            const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // 4. Update session running totals
            if (docType !== 'PF') {
                await supabase.from('pos_sessions').update({
                    total_sales: session.total_sales + total,
                    invoices_count: session.invoices_count + 1
                }).eq('id', session.id);
                onUpdateSession();
            }

            // 5. Build PDF Logic
            const invoiceData: InvoiceData = {
                id: invoiceRecord?.invoice_no || `DOC-${Date.now()}`,
                type: docType === 'FT' ? 'FATURA / RECIBO' : 'FATURA PROFORMA',
                client_name: clientName,
                client_tax_id: clientNif,
                client_address: selectedCustomer?.address || 'N/A',
                client_city: selectedCustomer?.city || 'Luanda',
                client_country: 'Angola',
                date: new Date().toLocaleDateString('pt-PT') + ' ' + new Date().toLocaleTimeString('pt-PT'),
                due_date: dueDate ? new Date(dueDate).toLocaleDateString('pt-PT') : undefined,
                reference: paymentMethod.toUpperCase(),
                items: items as LibInvoiceItem[],
                subtotal: unTaxedSubtotal,
                discount_total: globalDiscount,
                tax_total: tax,
                retention: 0,
                total
            };

            if (format === 'A4') {
                const doc = await generateInvoiceA4(invoiceData, currentTenant);
                doc.save(`${invoiceData.id.replace('/', '_')}.pdf`);
            } else {
                const doc = await generateThermalReceipt(invoiceData, currentTenant);
                doc.save(`${invoiceData.id.replace('/', '_')}_Talao.pdf`);
            }

            resetCheckout();
            alert('Operação Comercial concluída. Documento Gerado.');

        } catch (error: any) {
            console.error('Erro de Supabase Online, a entrar em Cache Offline...', error);

            offlineSync.queueInvoice({
                tenant_id: tenantId,
                session_id: session.id,
                doc_type: docType,
                client_name: clientName,
                items: items,
                total: total
            });

            const offlineInvoiceData: InvoiceData = {
                id: `OFFLINE-${Date.now()}`,
                type: docType === 'FT' ? 'FATURA / RECIBO' : 'FATURA PROFORMA',
                client_name: clientName,
                client_tax_id: clientNif,
                client_address: selectedCustomer?.address || 'N/A',
                client_city: selectedCustomer?.city || 'Luanda',
                client_country: 'Angola',
                date: new Date().toLocaleDateString('pt-PT') + ' ' + new Date().toLocaleTimeString('pt-PT'),
                due_date: dueDate ? new Date(dueDate).toLocaleDateString('pt-PT') : undefined,
                reference: paymentMethod.toUpperCase(),
                items: items as LibInvoiceItem[],
                subtotal: unTaxedSubtotal,
                discount_total: globalDiscount,
                tax_total: tax,
                retention: 0,
                total
            };

            if (format === 'A4') {
                const doc = await generateInvoiceA4(offlineInvoiceData, currentTenant);
                doc.save(`${offlineInvoiceData.id}_Offline.pdf`);
            } else {
                const doc = await generateThermalReceipt(offlineInvoiceData, currentTenant);
                doc.save(`${offlineInvoiceData.id}_Offline_Talao.pdf`);
            }

            alert('Aviso Local: Operação guardada na FILA OFFLINE. O documento PDV foi gerado.');
            resetCheckout();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[1400px] h-[95vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                {/* Header PDV */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                            <i className="fas fa-desktop text-indigo-600 mr-3"></i> Terminarl POS
                        </h3>
                        <p className="text-slate-500 text-sm font-medium ml-9">Operação em curso. Fature rápido e sem erros.</p>
                    </div>

                    {/* Status do Turno & Fechar */}
                    <div className="flex items-center space-x-6">
                        <div className="text-right hidden sm:block pr-6 border-r border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Turno de Vendas</p>
                            <p className="text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1 rounded-full">Sessão: {session.id.substring(0, 8)}</p>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 bg-white rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm border border-slate-100">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 bg-slate-50">
                    {/* LEFTSIDE: Product Query & Customers */}
                    <div className="p-6 border-r border-slate-100 overflow-y-auto space-y-6">

                        {/* Selector de Clientes */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4"></div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">
                                Identificação Cliente
                            </label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 mb-4 transition-all"
                                onChange={e => handleSelectCustomer(e.target.value)}
                            >
                                <option value="">Consumidor Final</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <div className="space-y-3 relative z-10">
                                <input
                                    className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:border-blue-200 rounded-lg outline-none text-xs font-bold text-slate-700 placeholder-slate-400 transition-all"
                                    value={clientName}
                                    placeholder="Nome Opcional"
                                    onChange={e => setClientName(e.target.value)}
                                    readOnly={!!selectedCustomer}
                                />
                                <input
                                    className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:border-blue-200 rounded-lg outline-none text-xs font-bold text-slate-700 placeholder-slate-400 transition-all"
                                    value={clientNif}
                                    placeholder="NIF / BI Opcional"
                                    onChange={e => setClientNif(e.target.value)}
                                    readOnly={!!selectedCustomer}
                                />
                            </div>
                        </div>

                        {/* Fast Scan / Search */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                <i className="fas fa-barcode mr-2"></i>Scanner ou Pesquisa
                            </label>
                            <div className="relative">
                                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                                    placeholder="Nome, Código Barras..."
                                    value={searchProd}
                                    onChange={e => setSearchProd(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Fast Results List */}
                            {searchProd && (
                                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-xl absolute z-20 w-80">
                                    {filteredProducts.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => addDbProduct(p)}
                                            className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{p.name}</div>
                                                <div className="text-[10px] text-slate-400">Stock: {p.stock_current | 0}</div>
                                            </div>
                                            <div className="font-black text-slate-800">
                                                {Number(p.unit_price).toFixed(2)}
                                            </div>
                                        </button>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <div className="p-6 text-center text-xs font-bold text-slate-400 uppercase">Artigo Não Encontrado</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Manual entry fallback */}
                        <div className="bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-slate-800 rounded-bl-full -mr-4 -mt-4"></div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 relative z-10 text-white">Adição Livre Fixa</h4>
                            <div className="space-y-3 relative z-10">
                                <input
                                    className="w-full px-4 py-3 bg-slate-800 border-0 rounded-xl outline-none text-xs font-bold text-white placeholder-slate-500"
                                    placeholder="Descrição da Mercadoria"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        className="w-24 px-4 py-3 bg-slate-800 border-0 rounded-xl outline-none text-xs font-bold text-center text-white placeholder-slate-500"
                                        placeholder="Qtd"
                                        min="1"
                                        value={newItemQty}
                                        onChange={e => setNewItemQty(Number(e.target.value))}
                                    />
                                    <input
                                        type="number"
                                        className="flex-1 px-4 py-3 bg-slate-800 border-0 rounded-xl outline-none text-xs font-bold text-slate-300 placeholder-slate-500 border-l-2 border-l-slate-700"
                                        placeholder="P/Unit KZ"
                                        value={newItemPrice}
                                        onChange={e => setNewItemPrice(Number(e.target.value))}
                                    />
                                </div>
                                <button
                                    onClick={addManualItem}
                                    className="w-full bg-white text-slate-900 px-5 py-3 rounded-xl font-black hover:bg-slate-200 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                >
                                    <i className="fas fa-plus mr-2"></i> Inserir Artigo
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* MIDDLE: Carrinho de Compras */}
                    <div className="lg:col-span-2 bg-white flex flex-col pt-6 relative border-r border-slate-100">
                        <div className="px-8 pb-4 border-b border-slate-100 flex justify-between items-end">
                            <h3 className="text-xl font-black text-slate-900">Itens em Registo</h3>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-md">
                                {items.length} Linhas
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                            {items.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <i className="fas fa-shopping-basket text-7xl mb-6 text-slate-300"></i>
                                    <p className="text-xl font-black text-slate-400">Carrinho Vazio</p>
                                    <p className="text-sm font-bold text-slate-400 mt-2">Use o scanner ou a pesquisa para adicionar itens.</p>
                                </div>
                            )}

                            {items.map(item => (
                                <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center group hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/50 transition-all">
                                    <div className="flex-1 w-full">
                                        <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                                        <div className="flex items-center mt-2 text-xs font-bold text-slate-400 space-x-4">
                                            <span className="bg-slate-50 px-2 py-1 rounded">{Number(item.unit_price).toFixed(2)} KZ /un</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className="text-center w-16">
                                            <span className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1">Qtd</span>
                                            <span className="font-black text-slate-700 bg-slate-50 py-1 px-3 rounded-lg border border-slate-200">
                                                {item.quantity}
                                            </span>
                                        </div>

                                        <div className="text-right w-24">
                                            <span className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1">Aplicar Desc.</span>
                                            <input
                                                type="number"
                                                className="w-full text-xs font-bold bg-white border border-slate-200 rounded p-1 text-right focus:border-indigo-400 outline-none"
                                                min="0"
                                                value={item.discount}
                                                onChange={e => applyDiscount(item.id, Number(e.target.value))}
                                            />
                                        </div>

                                        <div className="text-right w-28">
                                            <span className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1">Subtotal (KZ)</span>
                                            <span className="font-black text-slate-900 group-hover:text-indigo-700 block mt-1">
                                                {item.total.toFixed(2)}
                                            </span>
                                        </div>

                                        <button onClick={() => removeItem(item.id)} className="w-10 h-10 rounded-xl bg-white text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100 flex items-center justify-center">
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Resumo e Pagamento */}
                    <div className="bg-white p-6 md:p-8 flex flex-col z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.02)]">
                        <div className="mb-8">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                Tipo de Documento Oficial
                            </label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setDocType('FT')}
                                    className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${docType === 'FT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    Fatura-Recibo
                                </button>
                                <button
                                    onClick={() => setDocType('PF')}
                                    className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${docType === 'PF' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    Proforma
                                </button>
                            </div>
                        </div>

                        <div className="mb-8 space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Condições Especiais</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                            >
                                <option value="cash">Pronto Pagamento - Dinheiro</option>
                                <option value="card">Multicaixa - TPA</option>
                                <option value="transfer">Transferência Bancária</option>
                                <option value="credit">Venda a Prazo (Crédito)</option>
                            </select>

                            {paymentMethod === 'credit' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-2 mt-4">Vencimento Exigido</label>
                                    <input
                                        type="date"
                                        className="w-full bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            )}
                        </div>

                        {/* SUMÁRIO FINANCEIRO */}
                        <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden flex-1 flex flex-col">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-[40px] -mr-10 -mt-10"></div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 relative z-10">Resumo da Operação</h4>

                            <div className="space-y-4 relative z-10 flex-1">
                                <div className="flex justify-between text-sm font-bold items-center border-b border-slate-800 pb-3">
                                    <span className="text-slate-400">Mercadoria Ilíquida</span>
                                    <span>{unTaxedSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold items-center border-b border-slate-800 pb-3">
                                    <span className="text-slate-400">Total Descontos</span>
                                    <span className="text-rose-400">-{globalDiscount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold items-center border-b border-slate-800 pb-3">
                                    <span className="text-slate-400"><i className="fas fa-university mr-2"></i>IVA ({tenantStatus?.tax_regime === 'General' ? '14%' : 'Isento'})</span>
                                    <span>{tax.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="pt-6 relative z-10">
                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex justify-between">
                                    <span>Total Global</span>
                                    <span>AKZ</span>
                                </div>
                                <p className="text-4xl font-black text-white tracking-tighter w-full truncate mb-6">
                                    {total.toFixed(2)}
                                </p>

                                <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                                    <button
                                        onClick={() => checkout('THERMAL')}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-xl transition-colors flex flex-col items-center justify-center gap-2 group"
                                    >
                                        <i className="fas fa-receipt text-xl group-hover:scale-110 transition-transform"></i>
                                        <span className="text-[10px] uppercase tracking-widest">Talão</span>
                                    </button>
                                    <button
                                        onClick={() => checkout('A4')}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex flex-col items-center justify-center gap-2 group"
                                    >
                                        <i className="fas fa-file-pdf text-xl group-hover:scale-110 transition-transform"></i>
                                        <span className="text-[10px] uppercase tracking-widest">A4 Normal</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

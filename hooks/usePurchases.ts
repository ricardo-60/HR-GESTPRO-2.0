import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PurchaseOrder, PurchaseItem, Product } from '../types';

export function usePurchases() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*, suppliers(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function createPurchase(
        supplierId: string,
        orderNo: string,
        items: { productId: string, quantity: number, costPrice: number }[]
    ) {
        try {
            const { data: profile } = await supabase.from('user_profiles').select('tenant_id').single();
            if (!profile) throw new Error('Tenant não encontrado');

            // 1. Criar a Ordem em 'draft'
            const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);

            const { data: order, error: orderError } = await supabase
                .from('purchase_orders')
                .insert([{
                    tenant_id: profile.tenant_id,
                    supplier_id: supplierId,
                    order_no: orderNo,
                    total_amount: totalAmount,
                    status: 'draft'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Inserir itens
            const purchaseItems = items.map(item => ({
                purchase_order_id: order.id,
                product_id: item.productId,
                quantity: item.quantity,
                cost_price: item.costPrice,
                total: item.quantity * item.costPrice
            }));

            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItems);

            if (itemsError) throw itemsError;

            await fetchOrders();
            return order;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }

    async function finalizePurchase(orderId: string) {
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .update({ status: 'finalized' })
                .eq('id', orderId)
                .select()
                .single();

            if (error) throw error;

            // A trigger no SQL cuidará do stock, PMP e accounts_payable automaticamente.

            await fetchOrders();
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }

    return { orders, loading, error, createPurchase, finalizePurchase, refetch: fetchOrders };
}

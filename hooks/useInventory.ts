import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, InventoryLog } from '../types';

export const useInventory = (tenantId: string | null) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInventory = async () => {
        if (!tenantId || !supabase) return;
        setLoading(true);
        try {
            const { data, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('name', { ascending: true });

            if (prodError) throw prodError;
            setProducts(data || []);

            const { data: logsData, error: logsError } = await supabase
                .from('inventory_logs')
                .select('*, operator:operator_id(full_name)')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (logsError) throw logsError;
            setLogs(logsData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addStockEntry = async (productId: string, quantity: number, reason: string, cost?: number) => {
        if (!tenantId || !supabase) return;
        try {
            // 1. Update Product Stock
            const { error: updateError } = await supabase.rpc('increment_product_stock', {
                p_product_id: productId,
                p_quantity: quantity
            });

            if (updateError) {
                const product = products.find(p => p.id === productId);
                if (!product) throw new Error('Product not found');

                const { error: directError } = await supabase
                    .from('products')
                    .update({ stock_current: (product.stock_current || 0) + quantity })
                    .eq('id', productId);
                if (directError) throw directError;
            }

            // 2. Log Movement
            const { error: logError } = await supabase.from('inventory_logs').insert([{
                tenant_id: tenantId,
                product_id: productId,
                quantity: Math.abs(quantity),
                type: quantity > 0 ? 'IN' : 'OUT',
                reason,
                cost_at_time: cost
            }]);

            if (logError) throw logError;

            await fetchInventory();
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const createProduct = async (productData: Partial<Product>) => {
        if (!tenantId || !supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([{ ...productData, tenant_id: tenantId }])
                .select()
                .single();

            if (error) throw error;
            await fetchInventory();
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateProduct = async (productId: string, productData: Partial<Product>) => {
        if (!tenantId || !supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId)
                .select()
                .single();

            if (error) throw error;
            await fetchInventory();
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, [tenantId]);

    return {
        products,
        logs,
        loading,
        error,
        fetchInventory,
        addStockEntry,
        createProduct,
        updateProduct
    };
};

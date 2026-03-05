import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

export function useSuppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    async function fetchSuppliers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setSuppliers(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function addSupplier(supplier: Omit<Supplier, 'id' | 'tenant_id' | 'created_at'>) {
        try {
            // O tenant_id é injetado automaticamente pelo RLS se configurado via trigger ou podemos pegar do Auth
            // Mas para garantir, vamos buscar o tenant_id do perfil logado
            const { data: profile } = await supabase.from('user_profiles').select('tenant_id').single();
            if (!profile) throw new Error('Tenant não encontrado');

            const { data, error } = await supabase
                .from('suppliers')
                .insert([{ ...supplier, tenant_id: profile.tenant_id }])
                .select()
                .single();

            if (error) throw error;
            setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }

    async function updateSupplier(id: string, updates: Partial<Supplier>) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setSuppliers(prev => prev.map(s => s.id === id ? data : s));
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }

    return { suppliers, loading, error, addSupplier, updateSupplier, refetch: fetchSuppliers };
}

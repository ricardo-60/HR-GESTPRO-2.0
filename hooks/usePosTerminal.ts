import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { InvoiceItem as LibInvoiceItem } from '../lib/InvoiceGenerator';

interface PosSession {
    id: string;
    opening_balance: number;
    total_sales: number;
    invoices_count: number;
    status: string;
}

export interface PosItem extends LibInvoiceItem {
    product_id?: string;
    discount: number;
}

export const usePosTerminal = (
    tenantId: string,
    session: PosSession | null,
    isIvaEnabled: boolean,
    taxRegime: 'Exclusion' | 'General' = 'Exclusion',
    allowNegativeStock: boolean = false
) => {
    // Core POS State
    const [docType, setDocType] = useState<'FT' | 'PF'>('FT');
    const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, transfer, card, mixed, credit
    const [dueDate, setDueDate] = useState<string>(''); // Para vendas a crédito

    // Search & Filter State
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [searchProd, setSearchProd] = useState('');
    const [loadingData, setLoadingData] = useState(false);

    // Selected Data
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [clientName, setClientName] = useState('Consumidor Final');
    const [clientNif, setClientNif] = useState('');

    const [items, setItems] = useState<PosItem[]>(() => {
        const saved = localStorage.getItem(`pos_items_${tenantId}`);
        return saved ? JSON.parse(saved) : [];
    });

    // Ad hoc Item State
    const [newItemName, setNewItemName] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemPrice, setNewItemPrice] = useState(1000);

    // Save items to local storage on change
    useEffect(() => {
        if (tenantId) {
            localStorage.setItem(`pos_items_${tenantId}`, JSON.stringify(items));
        }
    }, [items, tenantId]);

    // Load Basic Data for the POS
    useEffect(() => {
        if (!tenantId) return;
        const loadInitialData = async () => {
            setLoadingData(true);
            const { data: custs } = await supabase.from('customers').select('*').eq('tenant_id', tenantId).limit(20);
            if (custs) setCustomers(custs);

            const { data: prods } = await supabase.from('products').select('*').eq('tenant_id', tenantId).eq('is_active', true).limit(50);
            if (prods) setProducts(prods);
            setLoadingData(false);
        };
        loadInitialData();
    }, [tenantId]);

    const handleSelectCustomer = (id: string) => {
        if (!id) {
            setSelectedCustomer(null);
            setClientName('Consumidor Final');
            setClientNif('');
            return;
        }
        const cust = customers.find(c => c.id === id);
        if (cust) {
            setSelectedCustomer(cust);
            setClientName(cust.name);
            setClientNif(cust.tax_id || '');
        }
    };

    const addDbProduct = (prod: any) => {
        // Validation: Stock Check
        if (!allowNegativeStock && prod.stock_current <= 0) {
            alert(`Stock insuficiente para "${prod.name}". Stock atual: ${prod.stock_current}`);
            return;
        }

        const effectiveTaxRate = taxRegime === 'General' ? 14 : 0;
        const exemptionCode = taxRegime === 'Exclusion' ? 'M00' : '';

        const existing = items.find(i => i.product_id === prod.id);
        if (existing) {
            // Check if incrementing would exceed stock
            if (!allowNegativeStock && (existing.quantity + 1) > prod.stock_current) {
                alert(`Não pode vender mais do que o stock disponível (${prod.stock_current}).`);
                return;
            }

            setItems(items.map(i => i.product_id === prod.id ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.unit_price - i.discount
            } : i));
        } else {
            setItems([...items, {
                id: Math.random().toString(),
                product_id: prod.id,
                code: prod.barcode || `P-${prod.id.substring(0, 4)}`,
                name: prod.name,
                lote: prod.lote || '-',
                quantity: 1,
                unit_price: Number(prod.unit_price),
                discount: 0,
                tax_rate: effectiveTaxRate,
                exemption_code: exemptionCode,
                total: Number(prod.unit_price)
            }]);
        }
        setSearchProd('');
    };

    const addManualItem = () => {
        if (!newItemName) return;
        const effectiveTaxRate = taxRegime === 'General' ? 14 : 0;
        const exemptionCode = taxRegime === 'Exclusion' ? 'M00' : '';

        setItems([...items, {
            id: Math.random().toString(),
            code: 'M-000',
            name: newItemName,
            lote: '-',
            quantity: newItemQty,
            unit_price: newItemPrice,
            discount: 0,
            tax_rate: effectiveTaxRate,
            exemption_code: exemptionCode,
            total: (newItemQty * newItemPrice)
        }]);
        setNewItemName('');
        setNewItemQty(1);
        setNewItemPrice(1000);
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const applyDiscount = (id: string, discountVal: number) => {
        setItems(items.map(i => {
            if (i.id === id) {
                const newTotal = (i.quantity * i.unit_price) - discountVal;
                return { ...i, discount: discountVal, total: newTotal > 0 ? newTotal : 0 };
            }
            return i;
        }));
    };

    const resetCheckout = () => {
        setItems([]);
        setClientName('Consumidor Final');
        setClientNif('');
        setSelectedCustomer(null);
        setSearchProd('');
    };

    const unTaxedSubtotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
    const globalDiscount = items.reduce((acc, curr) => acc + curr.discount, 0);
    const subtotal = unTaxedSubtotal - globalDiscount;
    const effectiveTaxRate = taxRegime === 'General' ? 0.14 : 0;
    const tax = subtotal * effectiveTaxRate;
    const total = subtotal + tax;

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchProd.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchProd))
    );

    return {
        // State
        docType, setDocType,
        paymentMethod, setPaymentMethod,
        dueDate, setDueDate,
        customers, products,
        searchProd, setSearchProd,
        loadingData,
        selectedCustomer,
        clientName, setClientName,
        clientNif, setClientNif,
        items, setItems,
        newItemName, setNewItemName,
        newItemQty, setNewItemQty,
        newItemPrice, setNewItemPrice,

        // Computed
        unTaxedSubtotal,
        globalDiscount,
        subtotal,
        tax,
        total,
        filteredProducts,

        // Actions
        handleSelectCustomer,
        addDbProduct,
        addManualItem,
        removeItem,
        applyDiscount,
        resetCheckout
    };
};

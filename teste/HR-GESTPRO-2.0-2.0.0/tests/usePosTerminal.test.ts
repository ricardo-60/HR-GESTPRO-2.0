import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePosTerminal } from '../hooks/usePosTerminal';

const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] })
};

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => mockQuery)
    }
}));

vi.mock('../lib/InvoiceGenerator', () => ({
    generateInvoiceA4: vi.fn(),
    generateThermalReceipt: vi.fn(),
}));

const mockSession = {
    id: 'sess-123',
    opening_balance: 0,
    total_sales: 0,
    invoices_count: 0,
    status: 'open'
};

const mockProduct = {
    id: 'prod-123',
    barcode: '123456',
    name: 'Computador HP',
    unit_price: 100000,
    stock_quantity: 10,
    is_active: true
};

describe('usePosTerminal Hook', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('deve inicializar com o carrinho vazio', () => {
        const { result } = renderHook(() => usePosTerminal('tenant-1', mockSession, true, 'General'));

        expect(result.current.items.length).toBe(0);
        expect(result.current.total).toBe(0);
    });

    it('deve calcular impostos (IVA 14%) corretamente quando regime é General', () => {
        const { result } = renderHook(() => usePosTerminal('tenant-1', mockSession, true, 'General'));

        act(() => {
            result.current.setNewItemName('Artigo Teste');
            result.current.setNewItemPrice(1000);
            result.current.setNewItemQty(1);
        });

        act(() => {
            result.current.addManualItem();
        });

        expect(result.current.items.length).toBe(1);
        expect(result.current.subtotal).toBe(1000);

        // IVA = 14% de 1000 = 140
        expect(result.current.tax).toBe(140);
        // Total = 1000 + 140 = 1140
        expect(result.current.total).toBe(1140);
    });

    it('deve isentar impostos quando regime é Exclusion', () => {
        const { result } = renderHook(() => usePosTerminal('tenant-1', mockSession, false, 'Exclusion'));

        act(() => {
            result.current.setNewItemName('Artigo Isento');
            result.current.setNewItemPrice(5000);
            result.current.setNewItemQty(1);
        });

        act(() => {
            result.current.addManualItem();
        });

        expect(result.current.items.length).toBe(1);
        expect(result.current.subtotal).toBe(5000);

        // IVA = 0%
        expect(result.current.tax).toBe(0);
        // Total = 5000 + 0 = 5000
        expect(result.current.total).toBe(5000);
    });

    it('deve refletir o desconto global no cálculo do imposto (IVA)', () => {
        const { result } = renderHook(() => usePosTerminal('tenant-1', mockSession, true, 'General'));

        act(() => {
            result.current.setNewItemName('Artigo Caro');
            result.current.setNewItemPrice(10000);
            result.current.setNewItemQty(1);
        });

        act(() => {
            result.current.addManualItem();
        });

        const itemId = result.current.items[0].id;

        act(() => {
            // Aplicar 2000kz desconto ao item inserido
            result.current.applyDiscount(itemId, 2000);
        });

        // Subtotal: 10000 - 2000 = 8000
        // IVA: 8000 * 14% = 1120
        // Total = 9120

        expect(result.current.subtotal).toBe(8000);
        expect(result.current.tax).toBe(1120);
        expect(result.current.total).toBe(9120);
    });

    it('deve remover um item do carrinho corretamente', () => {
        const { result } = renderHook(() => usePosTerminal('tenant-1', mockSession, true, 'General'));

        act(() => {
            result.current.setNewItemName('Item para Remover');
        });

        act(() => {
            result.current.addManualItem();
        });

        expect(result.current.items.length).toBe(1);
        const itemId = result.current.items[0].id;

        act(() => {
            result.current.removeItem(itemId);
        });

        expect(result.current.items.length).toBe(0);
    });

    it('deve limpar o estado ao chamar resetCheckout', () => {
        const { result } = renderHook(() => usePosTerminal('tenant-1', mockSession, true, 'General'));

        act(() => {
            result.current.setNewItemName('Item 1');
            result.current.setClientName('Cliente XPTO');
        });

        act(() => {
            result.current.addManualItem();
        });

        expect(result.current.items.length).toBe(1);

        act(() => {
            result.current.resetCheckout();
        });

        expect(result.current.items.length).toBe(0);
        expect(result.current.clientName).toBe('Consumidor Final');
    });

    it('deve impedir venda se stock for insuficiente e allowNegativeStock for false', () => {
        const { result } = renderHook(() => usePosTerminal('tenant-1', mockSession, true, 'General', false));

        const zeroStockProd = { ...mockProduct, stock_current: 0 };

        act(() => {
            result.current.addDbProduct(zeroStockProd as any);
        });

        // Não deve adicionar ao carrinho
        expect(result.current.items.length).toBe(0);
    });

    it('deve permitir venda se stock for insuficiente mas allowNegativeStock for true', () => {
        const { result } = renderHook(() => usePosTerminal('tenant-1', mockSession, true, 'General', true));

        const zeroStockProd = { ...mockProduct, stock_current: 0 };

        act(() => {
            result.current.addDbProduct(zeroStockProd as any);
        });

        // Deve adicionar ao carrinho
        expect(result.current.items.length).toBe(1);
    });
});

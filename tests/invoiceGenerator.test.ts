import { describe, it, expect, vi } from 'vitest';
import { generateInvoiceA4, generateThermalReceipt } from '../lib/InvoiceGenerator';

vi.mock('jspdf', () => {
    return {
        default: class {
            addImage() { }
            setFontSize() { }
            setFont() { }
            text() { }
            setTextColor() { }
            setFillColor() { }
            rect() { }
            roundedRect() { }
            setDrawColor() { }
            saveGraphicsState() { }
            setGState() { }
            restoreGraphicsState() { }
            addPage() { }
            setLineDashPattern() { }
            save() { }
            lastAutoTable = { finalY: 100 };
            get GState() { return function () { }; }
        },
        jsPDF: class {
            addImage() { }
            setFontSize() { }
            setFont() { }
            text() { }
            setTextColor() { }
            setFillColor() { }
            rect() { }
            roundedRect() { }
            setDrawColor() { }
            saveGraphicsState() { }
            setGState() { }
            restoreGraphicsState() { }
            addPage() { }
            setLineDashPattern() { }
            save() { }
            lastAutoTable = { finalY: 100 };
            get GState() { return function () { }; }
        }
    };
});

vi.mock('jspdf-autotable', () => ({
    default: vi.fn()
}));

vi.mock('./numberToWords', () => ({
    numeroParaExtenso: vi.fn().mockReturnValue('cem kwanzas')
}));

const mockTenant: any = {
    company_name: 'Empresa Teste',
    tax_id: '123456789',
    logo_url: null,
    tax_regime: 'Regime Geral'
};

const mockInvoice: any = {
    id: '2025/001',
    type: 'FATURA / RECIBO',
    client_name: 'Cliente Teste',
    date: '05/03/2026',
    items: [
        { name: 'Prod 1', unit_price: 100, quantity: 1, total: 100 }
    ],
    subtotal: 100,
    discount_total: 0,
    tax_total: 14,
    total: 114
};

describe('InvoiceGenerator', () => {
    it('deve gerar PDF A4 sem erros', async () => {
        const doc = await generateInvoiceA4(mockInvoice, mockTenant);
        expect(doc).toBeDefined();
    });

    it('deve gerar Talão Térmico sem erros', async () => {
        const doc = await generateThermalReceipt(mockInvoice, mockTenant);
        expect(doc).toBeDefined();
    });
});

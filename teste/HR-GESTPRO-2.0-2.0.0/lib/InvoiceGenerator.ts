import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tenant } from '../types';

import { numeroParaExtenso } from './numberToWords';

export interface InvoiceItem {
    id: string;
    code: string; // Ex: P001
    name: string;
    lote?: string; // Ex: L-100
    quantity: number;
    unit_price: number;
    discount?: number;
    tax_rate?: number; // Ex: 14%
    exemption_code?: string; // Ex: M00
    total: number;
}

export interface InvoiceData {
    id: string; // Ex: 2025/008902
    type: string; // 'Fatura-Recibo' ou 'Fatura Proforma'
    client_name: string;
    client_tax_id?: string;
    client_address?: string;
    client_city?: string;
    client_country?: string;
    date: string;
    due_date?: string; // Data vencimento
    reference?: string; // Ref Cliente
    items: InvoiceItem[];
    subtotal: number; // Ilíquido
    discount_total: number;
    tax_total: number;
    retention?: number; // Retenção na Fonte
    total: number; // Total Final
    // Campos de Conformidade AGT Angola
    agt_hash_chars?: string;    // 4 chars do hash AGT (ex: '4rT9')
    agt_signature?: string;     // Assinatura RSA completa (Base64)
}

// Helper para converter URL em Base64 para inserir no PDF
const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } else {
                reject(new Error('Canvas ctx not available'));
            }
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};

export const generateInvoiceA4 = async (invoice: InvoiceData, tenant: Tenant) => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // MODO ESTILIZAÇÃO EMPRESARIAL - CORES E LINHAS CLARAS
    const accentColor: [number, number, number] = [63, 81, 181]; // Azul Empresarial

    // Header Config & Watermark
    if (tenant.logo_url) {
        try {
            const base64Logo = await getBase64ImageFromURL(tenant.logo_url);
            doc.addImage(base64Logo, 'PNG', 14, 15, 35, 35, '', 'FAST');

            // Watermark (Translucent in center)
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
            doc.addImage(base64Logo, 'PNG', 50, 100, 110, 110, '', 'FAST');
            doc.restoreGraphicsState();
        } catch (e) {
            console.error('Error loading logo for PDF', e);
        }
    }

    // CABEÇALHO DA EMPRESA (Lado Esquerdo)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(tenant.company_name.toUpperCase(), 55, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let hY = 25;
    if (tenant.tax_regime) {
        const regimeLabel = tenant.tax_regime === 'General' ? 'Regime Geral' : 'Regime de Exclusão';
        doc.text(regimeLabel, 55, hY); hY += 5;
    }
    doc.text(`NIF: ${tenant.tax_id || 'N/A'}`, 55, hY); hY += 5;
    if (tenant.contact_email) { doc.text(`Email: ${tenant.contact_email}`, 55, hY); hY += 5; }
    if (tenant.address) { doc.text(`Endereço: ${tenant.address}`, 55, hY); hY += 5; }
    if (tenant.phone) { doc.text(`Tel: ${tenant.phone}`, 55, hY); }

    // TIPO DE DOCUMENTO EM DESTAQUE E DATAS (Lado Direito)
    doc.setFillColor(...accentColor);
    doc.rect(130, 15, 66, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text((invoice.type || 'FATURA / RECIBO').toUpperCase(), 163, 23, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Doc. Nº: ${invoice.id}`, 130, 33);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Emissão: ${invoice.date}`, 130, 39);
    if (invoice.due_date) doc.text(`Data de Vencimento: ${invoice.due_date}`, 130, 45);
    if (invoice.reference) doc.text(`Ref Cliente: ${invoice.reference}`, 130, 51);

    // QUADRO DADOS DO CLIENTE
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 60, 182, 30, 2, 2, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Exmo(a) Senhor(a)', 18, 67);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${invoice.client_name}`, 18, 74);
    doc.text(`NIF: ${invoice.client_tax_id || 'Consumidor Final'}`, 18, 80);

    const clientAddress = invoice.client_address ? `${invoice.client_address}` : '';
    const clientLocation = `${invoice.client_city || 'Luanda'}, ${invoice.client_country || 'Angola'}`;
    doc.text(`Endereço: ${clientAddress} - ${clientLocation}`, 18, 86);

    // TABELA DE PRODUTOS OU SERVIÇOS
    const tableData = invoice.items.map((item) => [
        item.code || 'GERAL',
        item.name,
        item.lote || '-',
        `KZ ${item.unit_price.toFixed(2)}`,
        item.quantity.toString(),
        `KZ ${(item.discount || 0).toFixed(2)}`,
        `${item.tax_rate || 14}%`,
        `KZ ${item.total.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 95,
        head: [['Código', 'Descrição', 'Lote', 'Preço Unitário', 'Qtd', 'Desc.', 'Taxa', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: accentColor, textColor: 255 },
        styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 220] },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 12, halign: 'center' },
            5: { cellWidth: 20, halign: 'right' },
            6: { cellWidth: 15, halign: 'center' },
            7: { cellWidth: 30, halign: 'right' },
        }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // SE LOR MAIOR QUE A PÁGINA, QUEBRAR AQUI. (Mecanismo básico)
    if (currentY > 200) {
        doc.addPage();
        currentY = 20;
    }

    // QUADRO RESUMO DE IMPOSTOS (Lado Esquerdo)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo de Impostos:', 14, currentY);

    // Preparar dados do resumo fiscal baseando nos itens
    const taxSummary: Record<string, { rate: number, inc: number, val: number, exemption: string }> = {};
    invoice.items.forEach(it => {
        const rate = it.tax_rate || 14;
        const key = `IVA_${rate}`;
        if (!taxSummary[key]) {
            taxSummary[key] = { rate, inc: 0, val: 0, exemption: rate === 0 ? (it.exemption_code || 'M00') : '-' };
        }
        taxSummary[key].inc += (it.quantity * it.unit_price) - (it.discount || 0);
        taxSummary[key].val += ((it.quantity * it.unit_price) - (it.discount || 0)) * (rate / 100);
    });

    const taxRows = Object.values(taxSummary).map(t => [
        t.rate === 0 ? 'ISENTO' : 'NORMAL',
        `${t.rate}%`,
        `KZ ${t.inc.toFixed(2)}`,
        `KZ ${t.val.toFixed(2)}`,
        t.exemption
    ]);

    autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 110 }, // Ocupar metade esquerda
        head: [['Cód. Imposto', 'Taxa', 'Incidência', 'Valor Imposto', 'Motivo Isenção']],
        body: taxRows,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, lineWidth: 0.1, lineColor: 200 },
        bodyStyles: { lineWidth: 0.1, lineColor: 200 },
        styles: { fontSize: 7, cellPadding: 2 }
    });

    // TOTAIS DA FATURA (Lado Direito)
    const rightBoxX = 120;
    const rightBoxW = 76;
    doc.setDrawColor(200, 200, 200);
    doc.rect(rightBoxX, currentY, rightBoxW, 35);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Ilíquido:', rightBoxX + 5, currentY + 7);
    doc.text(`KZ ${invoice.subtotal.toFixed(2)}`, rightBoxX + rightBoxW - 5, currentY + 7, { align: 'right' });

    doc.text('Total Descontos:', rightBoxX + 5, currentY + 14);
    doc.text(`KZ ${invoice.discount_total.toFixed(2)}`, rightBoxX + rightBoxW - 5, currentY + 14, { align: 'right' });

    doc.text('Impostos (IVA):', rightBoxX + 5, currentY + 21);
    doc.text(`KZ ${invoice.tax_total.toFixed(2)}`, rightBoxX + rightBoxW - 5, currentY + 21, { align: 'right' });

    if (invoice.retention && invoice.retention > 0) {
        doc.text('Retenção na Fonte:', rightBoxX + 5, currentY + 28);
        doc.text(`- KZ ${invoice.retention.toFixed(2)}`, rightBoxX + rightBoxW - 5, currentY + 28, { align: 'right' });
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(rightBoxX, currentY + 35, rightBoxW, 10, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR:', rightBoxX + 5, currentY + 42);
    doc.text(`KZ ${invoice.total.toFixed(2)}`, rightBoxX + rightBoxW - 5, currentY + 42, { align: 'right' });


    // EXTENSO EM KWANZAS
    currentY = Math.max((doc as any).lastAutoTable.finalY + 5, currentY + 50);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Demos a V. Exas o débito de:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(numeroParaExtenso(invoice.total), 14, currentY + 6);

    currentY += 16;

    // DADOS BANCÁRIOS E PAGAMENTO
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(14, currentY, 182, 18, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados para Pagamento Bancário:', 18, currentY + 6);
    doc.setFont('helvetica', 'normal');

    const bankName = tenant.bank_name || 'Banco Comercial Base';
    const bankAcc = tenant.bank_account || '0000 0000 0000';
    const bankIban = tenant.bank_iban || 'AO06 0000 0000 0000 0000 0000 00';

    doc.text(`Banco: ${bankName}   |   Conta: ${bankAcc}   |   IBAN: ${bankIban}`, 18, currentY + 12);

    currentY += 25;

    // OBSERVAÇÕES E RODAPÉ AGT
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const regime = tenant.tax_regime === 'General' ? 'Regime Geral' : 'Regime de Exclusão';
    let observation = `Observações: Enquadrado no ${regime}.`;
    if (invoice.tax_total === 0) {
        observation += ' Isento ao abrigo do Art. 12.º do CIVA / Cod. M01 (Exclusão).';
    }
    doc.text(observation, 14, currentY);

    // Protótipo de QR Code AGT (Obrigatório em 2024+)
    const qrSize = 20;
    doc.setDrawColor(150, 150, 150);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(14, currentY + 4, qrSize, qrSize);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(5);
    doc.text('[AGT QR DATA]', 14 + (qrSize / 2), currentY + 4 + (qrSize / 2), { align: 'center', baseline: 'middle' });

    // HASH AGT (Obrigatório por Lei — 4 chars da assinatura digital)
    if (invoice.agt_hash_chars) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(63, 81, 181);
        doc.text(`Hash: ${invoice.agt_hash_chars}-`, 14, currentY + 4);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        currentY += 8;
    }

    // Homologação (Sempre visível se exigido por certificação)
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Processado por programa validado nº 000/AGT - HR-GESTPRO 2.0', 105, 290, { align: 'center' });

    return doc;
};

export const generateThermalReceipt = async (invoice: InvoiceData, tenant: Tenant) => {
    // 80mm = 80 units in jsPDF when unit is mm
    // Altura dinâmica baseada na quantidade de items
    const height = 150 + (invoice.items.length * 10);
    const doc = new jsPDF('p', 'mm', [80, height]);

    const centerX = 40;
    let cursorY = 10;

    // Header Config & Watermark
    if (tenant.logo_url) {
        try {
            const base64Logo = await getBase64ImageFromURL(tenant.logo_url);

            // Watermark
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
            doc.addImage(base64Logo, 'PNG', 15, 50, 50, 50, '', 'FAST');
            doc.restoreGraphicsState();

            // Header Logo
            doc.addImage(base64Logo, 'PNG', 30, cursorY, 20, 20, '', 'FAST');
            cursorY += 25;
        } catch (e) {
            console.error('Error loading logo for PDF', e);
        }
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(tenant.company_name, centerX, cursorY, { align: 'center' });

    cursorY += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIF: ${tenant.tax_id || 'N/A'}`, centerX, cursorY, { align: 'center' });
    if (tenant.address) { cursorY += 4; doc.text(tenant.address, centerX, cursorY, { align: 'center' }); }
    if (tenant.phone) { cursorY += 4; doc.text(`Tel: ${tenant.phone}`, centerX, cursorY, { align: 'center' }); }

    cursorY += 8;
    doc.text('----------------------------------------------------', centerX, cursorY, { align: 'center' });
    cursorY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text((invoice.type || 'FATURA / RECIBO').toUpperCase(), centerX, cursorY, { align: 'center' });
    cursorY += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Doc: ${invoice.id}`, centerX, cursorY, { align: 'center' });
    cursorY += 4;
    doc.text(`Data: ${invoice.date}`, centerX, cursorY, { align: 'center' });

    cursorY += 6;
    doc.text('----------------------------------------------------', centerX, cursorY, { align: 'center' });

    cursorY += 5;
    doc.text(`Cliente: ${invoice.client_name}`, 5, cursorY);
    if (invoice.client_tax_id) {
        cursorY += 4;
        doc.text(`NIF: ${invoice.client_tax_id}`, 5, cursorY);
    }

    cursorY += 6;
    doc.text('----------------------------------------------------', centerX, cursorY, { align: 'center' });

    // Items
    cursorY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Qtd   Descricao                    Total', 5, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 4;

    invoice.items.forEach(item => {
        const qtyStr = item.quantity.toString().padEnd(5, ' ');
        const nameStr = item.name.substring(0, 15).padEnd(15, ' ');
        const totalStr = item.total.toFixed(2);

        doc.text(`${qtyStr} ${nameStr}`, 5, cursorY);
        doc.text(totalStr, 75, cursorY, { align: 'right' });
        cursorY += 4;
    });

    cursorY += 2;
    doc.text('----------------------------------------------------', centerX, cursorY, { align: 'center' });

    // Totals
    cursorY += 5;
    doc.text('Subtotal:', 5, cursorY);
    doc.text(invoice.subtotal.toFixed(2), 75, cursorY, { align: 'right' });

    if (invoice.discount_total > 0) {
        cursorY += 4;
        doc.text('Desc:', 5, cursorY);
        doc.text(`-${invoice.discount_total.toFixed(2)}`, 75, cursorY, { align: 'right' });
    }

    cursorY += 4;
    doc.text('IVA:', 5, cursorY);
    doc.text(invoice.tax_total.toFixed(2), 75, cursorY, { align: 'right' });

    cursorY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 5, cursorY);
    doc.text(`KZ ${invoice.total.toFixed(2)}`, 75, cursorY, { align: 'right' });

    cursorY += 10;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Obrigado pela sua visita!', centerX, cursorY, { align: 'center' });
    cursorY += 4;
    doc.text('HR-GESTPRO 2.0', centerX, cursorY, { align: 'center' });

    return doc;
};

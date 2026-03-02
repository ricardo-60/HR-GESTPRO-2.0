import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tenant } from '../types';

export interface InvoiceItem {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export interface InvoiceData {
    id: string; // Ex: FT-2023/1042
    client_name: string;
    client_tax_id?: string;
    date: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
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

    // Header Config & Watermark
    if (tenant.logo_url) {
        try {
            const base64Logo = await getBase64ImageFromURL(tenant.logo_url);
            doc.addImage(base64Logo, 'PNG', 14, 15, 40, 40, '', 'FAST');

            // Watermark (Translucent in center)
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
            doc.addImage(base64Logo, 'PNG', 50, 100, 110, 110, '', 'FAST');
            doc.restoreGraphicsState();
        } catch (e) {
            console.error('Error loading logo for PDF', e);
        }
    }

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FATURA / RECIBO', 140, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Doc. Nº: ${invoice.id}`, 140, 32);
    doc.text(`Data: ${invoice.date}`, 140, 37);

    // Tenant Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(tenant.company_name, 14, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIF: ${tenant.tax_id || 'N/A'}`, 14, 65);
    if (tenant.address) doc.text(tenant.address, 14, 70);
    if (tenant.phone) doc.text(`Tel: ${tenant.phone}`, 14, 75);
    if (tenant.contact_email) doc.text(`Email: ${tenant.contact_email}`, 14, 80);

    // Client Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados do Cliente:', 140, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${invoice.client_name}`, 140, 67);
    if (invoice.client_tax_id) doc.text(`NIF: ${invoice.client_tax_id}`, 140, 72);

    // Table
    const tableData = invoice.items.map((item, index) => [
        index + 1,
        item.name,
        item.quantity.toString(),
        `KZ ${item.unit_price.toFixed(2)}`,
        `KZ ${item.total.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 95,
        head: [['#', 'Descrição', 'Qtd', 'Preço Unitário', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' },
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Totals
    doc.setFontSize(10);
    doc.text('Subtotal:', 140, finalY);
    doc.text(`KZ ${invoice.subtotal.toFixed(2)}`, 180, finalY, { align: 'right' });

    doc.text('IVA (14%):', 140, finalY + 6);
    doc.text(`KZ ${invoice.tax.toFixed(2)}`, 180, finalY + 6, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR:', 140, finalY + 15);
    doc.text(`KZ ${invoice.total.toFixed(2)}`, 180, finalY + 15, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Processado por programa validado n 000/AGT - HR-GESTPRO 2.0', 105, 280, { align: 'center' });

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
    doc.text('FATURA / RECIBO', centerX, cursorY, { align: 'center' });
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

    cursorY += 4;
    doc.text('IVA (14%):', 5, cursorY);
    doc.text(invoice.tax.toFixed(2), 75, cursorY, { align: 'right' });

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

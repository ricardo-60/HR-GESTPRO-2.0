/**
 * lib/ProformaGenerator.ts
 * Gerador de PDF de fatura proforma para renovação de licença.
 * Usa jsPDF para manter consistência com InvoiceGenerator.ts.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ProformaData {
    invoiceRef: string;               // PRF-2026-001
    dueDate: string;                  // YYYY-MM-DD
    clientName: string;
    clientNif?: string;
    clientAddress?: string;
    planType: string;                 // Business, Enterprise, etc.
    durationDays: number;             // 30, 90, 365
    amountAOA: number;               // Total em Kwanzas
    globalIban?: string;              // IBAN da HR Tecnologias
    newExpiresAt?: string;            // Nova data de validade
}

// Dados fixos da Software House
const SOFTWARE_HOUSE = {
    name: 'HR Tecnologias Lda',
    nif: '5001234567',
    address: 'Luanda, Angola',
    phone: '+244 900 000 000',
    email: 'billing@hrgestpro.ao',
    product: 'HR-GESTPRO 2.0 — Licença de Software ERP',
};

export const generateProformaPDF = (data: ProformaData): jsPDF => {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });

    const colors = {
        primary: [79, 70, 229] as [number, number, number],   // indigo-600
        dark: [15, 23, 42] as [number, number, number],    // slate-950
        light: [248, 250, 252] as [number, number, number], // slate-50
        accent: [217, 119, 6] as [number, number, number],   // amber-600
    };

    // ── Fundo do cabeçalho ───────────────────────────────────────────────────
    doc.setFillColor(...colors.dark);
    doc.rect(0, 0, 210, 40, 'F');

    // Logo / Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('HR-GESTPRO', 14, 18);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Software House · ERP Angola', 14, 25);
    doc.text(SOFTWARE_HOUSE.email, 14, 31);

    // Tipo de documento
    doc.setFillColor(...colors.accent);
    doc.roundedRect(145, 8, 52, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FATURA PROFORMA', 171, 18, { align: 'center' });

    // ── Referência e datas ────────────────────────────────────────────────────
    doc.setTextColor(...colors.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ref: ${data.invoiceRef}`, 14, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-PT')}`, 14, 59);
    doc.text(`Data de Vencimento: ${new Date(data.dueDate).toLocaleDateString('pt-PT')}`, 14, 65);

    // ── Dados cliente ─────────────────────────────────────────────────────────
    doc.setFillColor(...colors.light);
    doc.rect(100, 48, 96, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('CLIENTE / ENTIDADE', 105, 55);

    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(data.clientName, 105, 62);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    if (data.clientNif) doc.text(`NIF: ${data.clientNif}`, 105, 68);
    if (data.clientAddress) doc.text(data.clientAddress, 105, 74);

    // ── Tabela de itens ────────────────────────────────────────────────────────
    const durationLabel = data.durationDays >= 365
        ? `${Math.round(data.durationDays / 365)} Ano(s)`
        : `${data.durationDays} Dias`;

    autoTable(doc, {
        startY: 90,
        head: [['Descrição', 'Duração', 'Plano', 'Valor (AOA)']],
        body: [
            [
                SOFTWARE_HOUSE.product,
                durationLabel,
                data.planType,
                new Intl.NumberFormat('pt-PT').format(data.amountAOA) + ' Kz'
            ]
        ],
        foot: [
            ['', '', 'TOTAL A PAGAR', new Intl.NumberFormat('pt-PT').format(data.amountAOA) + ' Kz']
        ],
        headStyles: {
            fillColor: colors.primary,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
        },
        bodyStyles: { fontSize: 9 },
        footStyles: {
            fillColor: [235, 235, 255],
            textColor: colors.primary,
            fontStyle: 'bold',
            fontSize: 10,
        },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
        },
    });

    const afterTable = (doc as any).lastAutoTable.finalY + 10;

    // ── Instruções de Pagamento ──────────────────────────────────────────────
    doc.setFillColor(...colors.light);
    doc.rect(14, afterTable, 182, 35, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.primary);
    doc.text('INSTRUÇÕES DE PAGAMENTO', 18, afterTable + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.dark);
    doc.text(`Banco: Banco Nacional de Angola (BNA)`, 18, afterTable + 15);
    doc.text(`Beneficiário: ${SOFTWARE_HOUSE.name}`, 18, afterTable + 21);
    doc.text(`IBAN: ${data.globalIban || 'AO06 0040 0000 0000 0000 0000 0'}`, 18, afterTable + 27);
    doc.text(`Referência: ${data.invoiceRef} — ${data.clientName}`, 18, afterTable + 33);

    // ── Licença válida até ──────────────────────────────────────────────────
    if (data.newExpiresAt) {
        const y = afterTable + 48;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(5, 150, 105); // green-600
        doc.text(`✓ Após pagamento, a licença ficará válida até: ${new Date(data.newExpiresAt).toLocaleDateString('pt-PT')}`, 14, y);
    }

    // ── Rodapé ───────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Este documento não tem validade fiscal. Após confirmação do pagamento, será emitido o Recibo oficial.', 105, 287, { align: 'center' });
    doc.text('Processado por HR-GESTPRO 2.0 — Software validado nº 000/AGT', 105, 292, { align: 'center' });

    return doc;
};

export const downloadProformaPDF = (data: ProformaData): void => {
    const doc = generateProformaPDF(data);
    doc.save(`${data.invoiceRef}.pdf`);
};

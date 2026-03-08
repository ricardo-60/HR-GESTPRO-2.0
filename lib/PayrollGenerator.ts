import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tenant } from '../types';

export interface PayrollData {
    period: string; // Ex: Março 2025
    employee_name: string;
    employee_role: string;
    employee_id_card?: string;
    employee_nif?: string;
    employee_inss?: string;
    employee_iban?: string;
    base_salary: number;
    inss_employee: number; // 3%
    inss_employer: number; // 8%
    irt: number;
    net_salary: number;
}

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

export const generatePayrollPDF = async (data: PayrollData, tenant: Tenant) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const accentColor: [number, number, number] = [31, 41, 55]; // Slate-900

    // Header
    if (tenant.logo_url) {
        try {
            const base64Logo = await getBase64ImageFromURL(tenant.logo_url);
            doc.addImage(base64Logo, 'PNG', 14, 15, 30, 30, '', 'FAST');
        } catch (e) {
            console.error('Error loading logo for PDF', e);
        }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE VENCIMENTO', 200, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${data.period}`, 200, 26, { align: 'right' });

    // Tenant info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(tenant.company_name.toUpperCase(), 50, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIF: ${tenant.tax_id || 'N/A'}`, 50, 25);
    doc.text(tenant.address || '', 50, 30);

    // Employee Box
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 50, 182, 35, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('COLABORADOR:', 18, 58);
    doc.setFont('helvetica', 'normal');
    doc.text(data.employee_name, 18, 64);
    doc.text(`Cargo: ${data.employee_role}`, 18, 70);

    doc.text(`BI: ${data.employee_id_card || 'N/A'}`, 120, 64);
    doc.text(`NIF: ${data.employee_nif || 'N/A'}`, 120, 70);
    doc.text(`INSS: ${data.employee_inss || 'N/A'}`, 120, 76);
    doc.text(`IBAN: ${data.employee_iban || 'N/A'}`, 18, 76);

    // Salary Table
    const tableData = [
        ['Vencimento Base', `+ KZ ${data.base_salary.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, ''],
        ['Segurança Social (3%)', '', `- KZ ${data.inss_employee.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`],
        ['Imposto sobre Rendimento (IRT)', '', `- KZ ${data.irt.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
        startY: 95,
        head: [['Descrição', 'Vencimentos', 'Descontos']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: accentColor, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 50, halign: 'right' },
            2: { cellWidth: 50, halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Box
    doc.setDrawColor(229, 231, 235);
    doc.rect(120, finalY, 76, 25);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Ilíquido:', 124, finalY + 8);
    doc.text(`KZ ${data.base_salary.toLocaleString()}`, 192, finalY + 8, { align: 'right' });

    doc.text('Total Descontos:', 124, finalY + 14);
    doc.text(`KZ ${(data.inss_employee + data.irt).toLocaleString()}`, 192, finalY + 14, { align: 'right' });

    doc.setFillColor(243, 244, 246);
    doc.rect(120, finalY + 18, 76, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('LÍQUIDO A RECEBER:', 124, finalY + 25);
    doc.text(`KZ ${data.net_salary.toLocaleString()}`, 192, finalY + 25, { align: 'right' });

    // Footer info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Contribuição Empresa (INSS 8%):', 14, finalY + 8);
    doc.text(`KZ ${data.inss_employer.toLocaleString()}`, 70, finalY + 8);

    doc.text('Assinatura do Colaborador:', 14, 260);
    doc.line(14, 270, 80, 270);

    doc.text('Carimbo/Assinatura Empresa:', 120, 260);
    doc.line(120, 270, 192, 270);

    doc.setFontSize(7);
    doc.text('Processado por computador - HR-GESTPRO 2.0', 105, 290, { align: 'center' });

    return doc;
};

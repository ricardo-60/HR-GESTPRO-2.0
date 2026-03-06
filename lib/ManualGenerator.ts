import { jsPDF } from 'jspdf';
import { MANUAL_CONTENT } from './ManualBase';

export class ManualGenerator {
    private doc: jsPDF;
    private primaryColor = '#2563eb'; // Blue-600 (Azul Elétrico)
    private secondaryColor = '#0f172a'; // Slate-900
    private textColor = '#334155'; // Slate-700
    private margin = 20;
    private pageWidth = 210; // A4
    private pageHeight = 297;
    private currentY = 0;

    constructor() {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
    }

    private addHeader() {
        this.doc.setFontSize(8);
        this.doc.setTextColor(150);
        this.doc.text('MANUAL DO UTILIZADOR - HR-GESTPRO 2.0', this.margin, 10);
        this.doc.text('Página ' + (this.doc.internal as any).getNumberOfPages(), this.pageWidth - this.margin - 15, 10);
        this.doc.setDrawColor(240);
        this.doc.line(this.margin, 12, this.pageWidth - this.margin, 12);
    }

    private checkNewPage(neededHeight: number) {
        if (this.currentY + neededHeight > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.addHeader();
            this.currentY = this.margin + 10;
        }
    }

    public async generate() {
        // --- CAPA ---
        this.doc.setFillColor(this.secondaryColor);
        this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F');

        this.doc.setTextColor(255);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(40);
        this.doc.text('HR-GESTPRO 2.0', this.pageWidth / 2, 100, { align: 'center' });

        this.doc.setFontSize(18);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text('Manual do Utilizador', this.pageWidth / 2, 115, { align: 'center' });

        this.doc.setDrawColor(37, 99, 235); // rgb for #2563eb
        this.doc.setLineWidth(1);
        this.doc.line(this.pageWidth / 2 - 40, 125, this.pageWidth / 2 + 40, 125);

        this.doc.setFontSize(12);
        this.doc.text('Gestão Inteligente e Certificada (AGT)', this.pageWidth / 2, 135, { align: 'center' });

        this.doc.setFontSize(10);
        this.doc.setTextColor(150);
        this.doc.text('Versão ' + new Date().getFullYear() + '.1', this.pageWidth / 2, 270, { align: 'center' });

        // --- PÁGINA DE CONTEÚDO ---
        this.doc.addPage();
        this.addHeader();
        this.currentY = 30;

        const lines = MANUAL_CONTENT.split('\n');

        for (let line of lines) {
            line = line.trim();
            if (!line) {
                this.currentY += 5;
                continue;
            }

            if (line.startsWith('# ')) {
                this.checkNewPage(20);
                this.doc.setFont('helvetica', 'bold');
                this.doc.setFontSize(22);
                this.doc.setTextColor(this.secondaryColor);
                this.doc.text(line.replace('# ', ''), this.margin, this.currentY);
                this.currentY += 12;
                this.doc.setDrawColor(this.primaryColor);
                this.doc.line(this.margin, this.currentY - 10, this.margin + 20, this.currentY - 10);
                this.currentY += 5;
            } else if (line.startsWith('## ')) {
                this.checkNewPage(15);
                this.doc.setFont('helvetica', 'bold');
                this.doc.setFontSize(16);
                this.doc.setTextColor(this.primaryColor);
                this.doc.text(line.replace('## ', ''), this.margin, this.currentY);
                this.currentY += 10;
            } else if (line.startsWith('### ')) {
                this.checkNewPage(12);
                this.doc.setFont('helvetica', 'bold');
                this.doc.setFontSize(12);
                this.doc.setTextColor(this.secondaryColor);
                this.doc.text(line.replace('### ', ''), this.margin, this.currentY);
                this.currentY += 8;
            } else if (line.startsWith('- ')) {
                this.checkNewPage(8);
                this.doc.setFont('helvetica', 'normal');
                this.doc.setFontSize(10);
                this.doc.setTextColor(this.textColor);
                this.doc.text('• ' + line.replace('- ', ''), this.margin + 5, this.currentY);
                this.currentY += 6;
            } else if (line.match(/^\d\./)) {
                this.checkNewPage(8);
                this.doc.setFont('helvetica', 'normal');
                this.doc.setFontSize(10);
                this.doc.setTextColor(this.textColor);
                this.doc.text(line, this.margin + 5, this.currentY);
                this.currentY += 6;
            } else {
                this.checkNewPage(10);
                this.doc.setFont('helvetica', 'normal');
                this.doc.setFontSize(10);
                this.doc.setTextColor(this.textColor);
                const splitText = this.doc.splitTextToSize(line, this.pageWidth - (this.margin * 2));
                this.doc.text(splitText, this.margin, this.currentY);
                this.currentY += (splitText.length * 6) + 2;
            }
        }

        return this.doc;
    }

    public download() {
        this.generate().then(doc => {
            doc.save('Manual_Utilizador_HR-GESTPRO_2.0.pdf');
        });
    }
}

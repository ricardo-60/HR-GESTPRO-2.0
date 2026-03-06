
const { jsPDF } = require('jspdf');
const fs = require('fs');

// Mock do conteúdo para o script de node
const MANUAL_CONTENT = `
# Manual do Utilizador - HR-GESTPRO 2.1.1
## Gestão Inteligente e Certificada (AGT)

O HR-GESTPRO 2.1.1 é uma solução avançada de gestão comercial para o mercado angolano.

### Principais Funcionalidades:
- Faturação Certificada (AGT)
- Gestão de Stocks (PMP)
- Recursos Humanos e Salários
- Exportação SAFT-AO v1.04
- PDV com suporte Offline

### Ativação de Licença:
Utilize o código HGP-XXXX-XXXX-XXXX para estender a validade do seu software.
`;

async function generatePDF() {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Azul Elétrico
    doc.text("HR-GESTPRO 2.1.1", 20, 20);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("Manual do Utilizador", 20, 35);

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // Slate-700
    const lines = doc.splitTextToSize(MANUAL_CONTENT, 170);
    doc.text(lines, 20, 50);

    const buffer = doc.output('arraybuffer');
    fs.writeFileSync('Manual_Utilizador_HR-GESTPRO_2.1.1.pdf', Buffer.from(buffer));
    console.log('PDF gerado: Manual_Utilizador_HR-GESTPRO_2.1.1.pdf');
}

generatePDF();

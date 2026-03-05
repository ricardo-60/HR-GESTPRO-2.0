/**
 * lib/SaftGenerator.ts
 * Motor de geração do ficheiro SAFT-AO (XML) para submissão à AGT Angola.
 * Baseado no esquema oficial AGT v1.04.
 *
 * Estrutura do SAFT-AO:
 *   AuditFile
 *   ├── Header           (dados da empresa e do software)
 *   ├── MasterFiles
 *   │   ├── Customer[]   (clientes)
 *   │   ├── Supplier[]   (fornecedores)
 *   │   └── Product[]    (produtos/serviços)
 *   └── SourceDocuments
 *       └── SalesInvoices
 *           └── Invoice[] (faturas com Hash AGT)
 */

import { supabase } from './supabase';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface SaftPeriod {
    year: number;
    month: number; // 1-12
}

export interface SaftValidationIssue {
    type: 'warning' | 'error';
    entity: string;
    message: string;
}

// ─── Utilitários XML ─────────────────────────────────────────────────────────

const escapeXml = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

const tag = (name: string, value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';
    return `<${name}>${escapeXml(String(value))}</${name}>`;
};

const block = (name: string, content: string): string =>
    content ? `<${name}>${content}</${name}>` : '';

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    return dateStr.split('T')[0]; // YYYY-MM-DD
};

const formatDecimal = (n: number | null | undefined): string =>
    (n ?? 0).toFixed(2);

// ─── Validador Prévio ────────────────────────────────────────────────────────

export const validateSaftData = async (
    tenantId: string,
    period: SaftPeriod
): Promise<SaftValidationIssue[]> => {
    const issues: SaftValidationIssue[] = [];
    const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const endDate = new Date(period.year, period.month, 0).toISOString().split('T')[0];

    // Verificar clientes sem NIF
    const { data: invoicesWithoutNif } = await supabase
        .from('invoices')
        .select('invoice_number, client_name, client_tax_id')
        .eq('tenant_id', tenantId)
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .is('client_tax_id', null);

    invoicesWithoutNif?.forEach(inv => {
        issues.push({
            type: 'warning',
            entity: `Fatura ${inv.invoice_number}`,
            message: `Cliente "${inv.client_name}" sem NIF — usar "Consumidor Final" no XML.`
        });
    });

    // Verificar faturas sem hash AGT
    const { data: invoicesWithoutHash } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('tenant_id', tenantId)
        .eq('status', 'finalized')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .is('agt_hash', null);

    if ((invoicesWithoutHash?.length ?? 0) > 0) {
        issues.push({
            type: 'error',
            entity: 'Assinatura Digital',
            message: `${invoicesWithoutHash!.length} fatura(s) finalizada(s) sem hash AGT. Gerar assinaturas antes de exportar.`
        });
    }

    // Verificar produtos sem preço de custo
    const { data: productsWithoutCost } = await supabase
        .from('products')
        .select('name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('cost_price', null);

    productsWithoutCost?.forEach(p => {
        issues.push({
            type: 'warning',
            entity: `Produto: ${p.name}`,
            message: 'Sem preço de custo definido — margem de lucro não calculável no SAFT.'
        });
    });

    return issues;
};

// ─── Gerador Principal ────────────────────────────────────────────────────────

export const generateSaftAO = async (
    tenantId: string,
    period: SaftPeriod
): Promise<string> => {
    const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const endDate = new Date(period.year, period.month, 0).toISOString().split('T')[0];
    const generatedAt = new Date().toISOString().replace('T', 'T').split('.')[0];

    // ── Buscar dados ─────────────────────────────────────────────────────────
    const [tenantRes, invoicesRes, productsRes, suppliersRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', tenantId).single(),
        supabase.from('invoices')
            .select('*, invoice_items(*)')
            .eq('tenant_id', tenantId)
            .gte('invoice_date', startDate)
            .lte('invoice_date', endDate)
            .order('invoice_date', { ascending: true }),
        supabase.from('products').select('*').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('suppliers').select('*').eq('tenant_id', tenantId),
    ]);

    const tenant = tenantRes.data!;
    const invoices = invoicesRes.data || [];
    const products = productsRes.data || [];
    const suppliers = suppliersRes.data || [];

    // ── HEADER ───────────────────────────────────────────────────────────────
    const header = `
        <AuditFileVersion>1.04</AuditFileVersion>
        ${tag('CompanyID', tenant.tax_id || '000000000')}
        ${tag('TaxRegistrationNumber', tenant.tax_id || '000000000')}
        ${tag('TaxAccountingBasis', 'F')}
        ${tag('CompanyName', tenant.company_name)}
        ${tag('BusinessName', tenant.company_name)}
        <CompanyAddress>
            ${tag('AddressDetail', tenant.address || 'Luanda')}
            ${tag('City', 'Luanda')}
            ${tag('Country', 'AO')}
        </CompanyAddress>
        ${tag('FiscalYear', String(period.year))}
        ${tag('StartDate', startDate)}
        ${tag('EndDate', endDate)}
        <CurrencyCode>AOA</CurrencyCode>
        ${tag('DateCreated', generatedAt.split('T')[0])}
        <TaxEntity>Global</TaxEntity>
        <ProductCompanyTaxID>HR-TECNOLOGIAS</ProductCompanyTaxID>
        <SoftwareCertificateNumber>000/AGT/2026</SoftwareCertificateNumber>
        <ProductID>HR-GESTPRO/2.0</ProductID>
        <ProductVersion>2.0.0</ProductVersion>`;

    // ── MASTER FILES: Clientes ───────────────────────────────────────────────
    const uniqueClients = new Map<string, any>();
    invoices.forEach(inv => {
        const key = inv.client_tax_id || 'CF';
        if (!uniqueClients.has(key)) {
            uniqueClients.set(key, {
                id: key,
                name: inv.client_name,
                tax_id: inv.client_tax_id || '000000000',
            });
        }
    });

    const customersXml = Array.from(uniqueClients.values()).map(c => `
        <Customer>
            ${tag('CustomerID', c.id)}
            ${tag('AccountID', 'Clientes')}
            ${tag('CustomerTaxID', c.tax_id)}
            ${tag('CompanyName', c.name)}
            <BillingAddress>
                <Country>AO</Country>
            </BillingAddress>
            <SelfBillingIndicator>0</SelfBillingIndicator>
        </Customer>`).join('\n');

    // ── MASTER FILES: Fornecedores ────────────────────────────────────────────
    const suppliersXml = suppliers.map((s: any) => `
        <Supplier>
            ${tag('SupplierID', s.id)}
            ${tag('AccountID', 'Fornecedores')}
            ${tag('SupplierTaxID', s.nif || '000000000')}
            ${tag('CompanyName', s.name)}
            <BillingAddress>
                ${tag('AddressDetail', s.address || '')}
                <Country>AO</Country>
            </BillingAddress>
            <SelfBillingIndicator>0</SelfBillingIndicator>
        </Supplier>`).join('\n');

    // ── MASTER FILES: Produtos ────────────────────────────────────────────────
    const productsXml = products.map((p: any) => `
        <Product>
            <ProductType>${p.is_service ? 'S' : 'P'}</ProductType>
            ${tag('ProductCode', p.sku || p.id.substring(0, 8).toUpperCase())}
            ${tag('ProductGroup', p.category || 'GERAL')}
            ${tag('ProductDescription', p.name)}
            ${tag('ProductNumberCode', p.barcode || p.sku || p.id.substring(0, 8))}
        </Product>`).join('\n');

    // ── SOURCE DOCUMENTS: Faturas ─────────────────────────────────────────────
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;

    const invoicesXml = invoices.map((inv: any) => {
        const items = inv.invoice_items || [];
        const isCredit = (inv.doc_type || 'FT') === 'NC';
        const docType = inv.doc_type || 'FT';

        totalCreditAmount += Number(inv.total_amount);

        const linesXml = items.map((item: any, idx: number) => `
            <Line>
                ${tag('LineNumber', idx + 1)}
                ${tag('ProductCode', item.product_code || 'GERAL')}
                ${tag('ProductDescription', item.product_name || item.description || 'Serviço')}
                ${tag('Quantity', item.quantity)}
                <UnitOfMeasure>UN</UnitOfMeasure>
                ${tag('UnitPrice', formatDecimal(item.unit_price))}
                ${tag('TaxPointDate', formatDate(inv.invoice_date))}
                ${tag('Description', item.product_name || 'Venda')}
                ${isCredit
                ? tag('DebitAmount', formatDecimal(item.total))
                : tag('CreditAmount', formatDecimal(item.total))}
                <Tax>
                    <TaxType>IVA</TaxType>
                    <TaxCountryRegion>AO</TaxCountryRegion>
                    ${tag('TaxCode', item.tax_rate === 0 ? 'ISE' : 'NOR')}
                    ${tag('TaxPercentage', item.tax_rate ?? 14)}
                </Tax>
                ${tag('TaxExemptionCode', item.exemption_code || '')}
            </Line>`).join('\n');

        return `
        <Invoice>
            ${tag('InvoiceNo', inv.invoice_number)}
            <DocumentStatus>
                <InvoiceStatus>${inv.status === 'finalized' ? 'N' : 'A'}</InvoiceStatus>
                ${tag('InvoiceStatusDate', generatedAt)}
                <SourceID>HR-GESTPRO</SourceID>
                <SourceBilling>P</SourceBilling>
            </DocumentStatus>
            ${tag('Hash', inv.agt_hash_chars ? inv.agt_hash_chars + '-' : '0')}
            ${tag('HashControl', '1')}
            <Period>${String(period.month).padStart(2, '0')}</Period>
            ${tag('InvoiceDate', formatDate(inv.invoice_date))}
            ${tag('InvoiceType', docType)}
            <SpecialRegimes>
                <SelfBillingIndicator>0</SelfBillingIndicator>
                <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
                <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
            </SpecialRegimes>
            <SourceID>HR-GESTPRO</SourceID>
            ${tag('SystemEntryDate', generatedAt)}
            ${tag('CustomerID', inv.client_tax_id || 'CF')}
            ${linesXml}
            <DocumentTotals>
                ${tag('TaxPayable', formatDecimal(inv.tax_amount))}
                ${tag('NetTotal', formatDecimal(inv.subtotal_amount || (Number(inv.total_amount) - Number(inv.tax_amount))))}
                ${tag('GrossTotal', formatDecimal(inv.total_amount))}
            </DocumentTotals>
        </Invoice>`;
    }).join('\n');

    // ── MONTAGEM FINAL ────────────────────────────────────────────────────────
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO_1.04:ao"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="urn:OECD:StandardAuditFile-Tax:AO_1.04:ao SAFTAO104.xsd">
    <Header>
        ${header}
    </Header>
    <MasterFiles>
        ${customersXml}
        ${suppliersXml}
        ${productsXml}
    </MasterFiles>
    <SourceDocuments>
        <SalesInvoices>
            ${tag('NumberOfEntries', invoices.length)}
            ${tag('TotalDebit', formatDecimal(totalDebitAmount))}
            ${tag('TotalCredit', formatDecimal(totalCreditAmount))}
            ${invoicesXml}
        </SalesInvoices>
    </SourceDocuments>
</AuditFile>`;

    return xml;
};

/**
 * Faz download do ficheiro XML SAFT-AO gerado.
 */
export const downloadSaftXml = (xml: string, period: SaftPeriod): void => {
    const filename = `SAFT-AO_${period.year}_${String(period.month).padStart(2, '0')}.xml`;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

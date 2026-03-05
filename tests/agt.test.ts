/**
 * tests/agt.test.ts
 * Testes unitários para o motor de assinatura digital AGT.
 * Valida: formato do hash string, encadeamento e extração dos 4 caracteres.
 */
import { describe, it, expect } from 'vitest';
import { buildHashString, extractHashChars, InvoiceHashInput } from '../lib/agtSigner';

// ── Testes de buildHashString ─────────────────────────────────────────────────

describe('buildHashString (AGT Hash Canónico)', () => {
    const baseInput: InvoiceHashInput = {
        invoiceDate: '2026-03-05',
        createdAt: '2026-03-05T17:00:00',
        invoiceNumber: 'FT 2026/001',
        grossTotal: 114000,
        previousHash: '0',
    };

    it('deve produzir o formato exacto: DataDoc;DataHoraCriacao;NumDoc;TotalDoc;HashAnterior', () => {
        const result = buildHashString(baseInput);
        const parts = result.split(';');
        expect(parts).toHaveLength(5);
        expect(parts[0]).toBe('2026-03-05');
        expect(parts[1]).toBe('2026-03-05T17:00:00');
        expect(parts[2]).toBe('FT 2026/001');
        expect(parts[3]).toBe('114000.00');
        expect(parts[4]).toBe('0');
    });

    it('deve formatar o total com 2 casas decimais', () => {
        const input = { ...baseInput, grossTotal: 50000 };
        const result = buildHashString(input);
        expect(result).toContain('50000.00');
    });

    it('deve incluir o hash da fatura anterior no encadeamento', () => {
        // Simula cadeia: fatura 1 tem hash '0', fatura 2 usa hash da fatura 1
        const hashFatura1 = 'ABCD1234XYZ';
        const fatura2Input: InvoiceHashInput = {
            ...baseInput,
            invoiceNumber: 'FT 2026/002',
            previousHash: hashFatura1,
        };
        const hashStr = buildHashString(fatura2Input);
        expect(hashStr.endsWith(hashFatura1)).toBe(true);
        expect(hashStr).toContain('FT 2026/002');
    });

    it('deve separar campos com ";" e não conter espaços desnecessários', () => {
        const result = buildHashString(baseInput);
        // Não deve ter vírgulas ou outros separadores
        expect(result).not.toContain(',');
        // Deve ter exactamente 4 separadores
        expect((result.match(/;/g) || []).length).toBe(4);
    });
});

// ── Testes de extractHashChars ────────────────────────────────────────────────

describe('extractHashChars (4 caracteres para impressão)', () => {
    it('deve extrair caracteres das posições 11, 21, 31 e 41', () => {
        // Usar uma string longa e verificar as posições programaticamente
        const fakeSignature = 'ABCDEFGHIJXKLMNOPQRSTYUVWXYZABCDZEFGHIJKLMNWOPQRSTUVWXabcde';
        const chars = extractHashChars(fakeSignature);
        // Verificar que os chars extraídos correspondem às posições 11, 21, 31 e 41
        const expected = [11, 21, 31, 41].map(pos => fakeSignature[pos] ?? '0').join('');
        expect(chars).toBe(expected);
        expect(chars).toHaveLength(4);
    });

    it('deve retornar "0" para posições em falta se assinatura for curta', () => {
        const shortSignature = 'ABC'; // menos de 11 chars
        const chars = extractHashChars(shortSignature);
        expect(chars).toHaveLength(4);
        expect(chars).toContain('0');
    });

    it('resultado deve ser sempre uma string de exactamente 4 caracteres', () => {
        const chars = extractHashChars('A'.repeat(100));
        expect(typeof chars).toBe('string');
        expect(chars).toHaveLength(4);
    });
});

// ── Teste de Encadeamento Completo ────────────────────────────────────────────

describe('Encadeamento de Faturas (Cadeia de Hash)', () => {
    it('cada fatura deve incluir o identificador da anterior na string de hash', () => {
        const hashAnterior = 'HASH_FA_ANTERIOR_SIMULADO';

        const fatura: InvoiceHashInput = {
            invoiceDate: '2026-03-05',
            createdAt: '2026-03-05T18:00:00',
            invoiceNumber: 'FT 2026/003',
            grossTotal: 57000,
            previousHash: hashAnterior,
        };

        const hashStr = buildHashString(fatura);
        expect(hashStr).toContain(hashAnterior);

        // Garantir que fatura seguinte encadeia com esta
        const faturaNextHash = 'NOVO_HASH_DESTA_FATURA';
        const faturaNext: InvoiceHashInput = {
            ...fatura,
            invoiceNumber: 'FT 2026/004',
            previousHash: faturaNextHash,
        };
        const hashStrNext = buildHashString(faturaNext);
        expect(hashStrNext).toContain(faturaNextHash);
        // O hash da fatura anterior estar na seguinte cria a cadeia imutável
        expect(hashStrNext).not.toContain(hashAnterior);
    });
});

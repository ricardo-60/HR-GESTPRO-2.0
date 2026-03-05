/**
 * tests/licenseKeys.test.ts
 * Testes unitários para o sistema de licenciamento SaaS.
 * Valida: formato de chaves, lógica de cálculo de datas e estados.
 */
import { describe, it, expect } from 'vitest';

// ── Utilitários replicados do sistema (sem dependência de BD) ─────────────────

const LICENSE_KEY_REGEX = /^HGP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const calculateNewExpiry = (
    currentExpiry: string | null,
    durationDays: number
): Date => {
    const base = currentExpiry
        ? new Date(Math.max(new Date(currentExpiry).getTime(), Date.now()))
        : new Date();
    return new Date(base.getTime() + durationDays * 86400000);
};

const daysUntilExpiry = (expiryDate: string): number =>
    Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);

const simulateRedemption = (
    key: { status: string; duration_days: number; key_code: string },
    tenant: { license_expires_at: string | null }
): { success: boolean; error_code?: string; new_expires_at?: string } => {
    if (key.status !== 'unused') {
        return { success: false, error_code: 'KEY_ALREADY_USED' };
    }
    const newExpiry = calculateNewExpiry(tenant.license_expires_at, key.duration_days);
    return { success: true, new_expires_at: newExpiry.toISOString() };
};

// ── Testes de Formato de Chave ────────────────────────────────────────────────

describe('Formato de Chave de Licença (HGP-XXXX-XXXX-XXXX)', () => {
    it('deve aceitar chave no formato correto', () => {
        expect('HGP-A2B3-C4D5-E6F7').toMatch(LICENSE_KEY_REGEX);
        expect('HGP-AAAA-BBBB-CCCC').toMatch(LICENSE_KEY_REGEX);
        expect('HGP-2345-6789-ABCD').toMatch(LICENSE_KEY_REGEX);
    });

    it('deve rejeitar chave com formato errado', () => {
        expect('HGP-A2B3-C4D5').not.toMatch(LICENSE_KEY_REGEX);   // curta
        expect('INV-A2B3-C4D5-E6F7').not.toMatch(LICENSE_KEY_REGEX); // prefixo errado
        expect('HGP-A2B3C4D5E6F7').not.toMatch(LICENSE_KEY_REGEX);   // sem hífens
        expect('HGP-a2b3-c4d5-e6f7').not.toMatch(LICENSE_KEY_REGEX); // minúsculas
    });

    it('deve ter exactamente 3 segmentos após o prefixo HGP', () => {
        const key = 'HGP-ABCD-1234-EFGH';
        const parts = key.split('-');
        expect(parts).toHaveLength(4);
        expect(parts[0]).toBe('HGP');
        parts.slice(1).forEach(seg => expect(seg).toHaveLength(4));
    });
});

// ── Testes de Resgate de Chave ────────────────────────────────────────────────

describe('Resgate de Chave (simulateRedemption)', () => {
    const unusedKey = { status: 'unused', duration_days: 365, key_code: 'HGP-AAAA-BBBB-CCCC' };
    const usedKey = { status: 'used', duration_days: 365, key_code: 'HGP-DDDD-EEEE-FFFF' };

    it('deve ter sucesso ao resgatar chave unused', () => {
        const result = simulateRedemption(unusedKey, { license_expires_at: null });
        expect(result.success).toBe(true);
        expect(result.new_expires_at).toBeDefined();
    });

    it('deve falhar ao tentar resgatar chave já usada', () => {
        const result = simulateRedemption(usedKey, { license_expires_at: null });
        expect(result.success).toBe(false);
        expect(result.error_code).toBe('KEY_ALREADY_USED');
    });

    it('mesma chave usada não pode ser reutilizada (double-spend)', () => {
        const key = { status: 'unused', duration_days: 30, key_code: 'HGP-ZZZZ-YYYY-XXXX' };
        const tenant = { license_expires_at: null };

        // Primeiro resgate
        const first = simulateRedemption(key, tenant);
        expect(first.success).toBe(true);

        // Simular que a chave ficou 'used'
        key.status = 'used';

        // Segundo resgate — deve falhar
        const second = simulateRedemption(key, tenant);
        expect(second.success).toBe(false);
        expect(second.error_code).toBe('KEY_ALREADY_USED');
    });
});

// ── Testes de Cálculo de Data de Expiração ────────────────────────────────────

describe('Cálculo de Data de Expiração da Licença', () => {
    it('deve adicionar 365 dias a partir de hoje se licença nula', () => {
        const result = calculateNewExpiry(null, 365);
        const expected = new Date(Date.now() + 365 * 86400000);
        const diffDays = Math.abs((result.getTime() - expected.getTime()) / 86400000);
        expect(diffDays).toBeLessThan(0.01); // < 15 minutos de diferença
    });

    it('deve adicionar dias sobre a data de expiração existente (licença ativa)', () => {
        const futureDate = new Date(Date.now() + 30 * 86400000).toISOString(); // expira daqui a 30 dias
        const result = calculateNewExpiry(futureDate, 365);
        const diffFromFuture = Math.round((result.getTime() - new Date(futureDate).getTime()) / 86400000);
        expect(diffFromFuture).toBe(365);
    });

    it('deve adicionar dias a partir de agora se licença já expirou', () => {
        const pastDate = new Date(Date.now() - 10 * 86400000).toISOString(); // expirou há 10 dias
        const result = calculateNewExpiry(pastDate, 90);
        const daysFromNow = Math.round((result.getTime() - Date.now()) / 86400000);
        // Deve ser ~90 dias a partir de hoje, não de há 10 dias
        expect(daysFromNow).toBeGreaterThanOrEqual(89);
        expect(daysFromNow).toBeLessThanOrEqual(91);
    });

    it('deve calcular corretamente para chave de 30 dias', () => {
        const result = calculateNewExpiry(null, 30);
        const daysFromNow = Math.round((result.getTime() - Date.now()) / 86400000);
        expect(daysFromNow).toBe(30);
    });
});

// ── Testes de Estado da Licença ───────────────────────────────────────────────

describe('Estado de Licença (daysUntilExpiry)', () => {
    it('deve retornar negativo para licença expirada', () => {
        const pastDate = new Date(Date.now() - 5 * 86400000).toISOString();
        expect(daysUntilExpiry(pastDate)).toBeLessThan(0);
    });

    it('deve retornar positivo para licença ativa', () => {
        const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
        expect(daysUntilExpiry(futureDate)).toBeGreaterThan(0);
    });

    it('deve identificar licença a expirar em breve (< 7 dias)', () => {
        const soonDate = new Date(Date.now() + 3 * 86400000).toISOString();
        const days = daysUntilExpiry(soonDate);
        expect(days).toBeGreaterThan(0);
        expect(days).toBeLessThan(7);
    });
});

import { describe, it, expect } from 'vitest';
import { calculateAngolaPayroll } from '../lib/PayrollCalculations';

describe('Cálculos de RH (Angola) - Lib Centralizada', () => {
    // ----------------------------------------------------
    // TESTES RETROCOMPATÍVEIS (Legislação OGE 2024/2025)
    // ----------------------------------------------------
    it('deve isentar IRT para salários baixos em 2025 (ex: 70.000 KZ)', () => {
        const result = calculateAngolaPayroll(70000, 2025);
        expect(result.irt).toBe(0);
        expect(result.inss).toBe(70000 * 0.03);
    });

    it('deve calcular corretamente para o segundo escalão em 2025 (ex: 120.000 KZ)', () => {
        const result = calculateAngolaPayroll(120000, 2025);
        expect(result.irt).toBe(3640);
        expect(result.inss).toBe(3600);
    });

    it('deve calcular corretamente para o escalão do meio em 2025 (ex: 400.000 KZ)', () => {
        const result = calculateAngolaPayroll(400000, 2025);
        expect(result.irt).toBe(45340);
    });

    it('deve calcular corretamente para salários altos em 2025 (ex: 1.200.000 KZ)', () => {
        const result = calculateAngolaPayroll(1200000, 2025);
        expect(result.irt).toBe(201500);
    });

    it('deve calcular corretamente o INSS da entidade patronal (8%)', () => {
        const result = calculateAngolaPayroll(100000);
        expect(result.inss_employer).toBe(8000);
    });

    // ----------------------------------------------------
    // NOVOS TESTES DE CONFORMIDADE (Legislação OGE 2026)
    // ----------------------------------------------------
    it('deve isentar IRT para 120.000 KZ em 2026 (isenção até 150.000 KZ)', () => {
        // Matéria coletável: 120.000 - 3.600 (INSS) = 116.400 KZ (< 150.000, portanto isento)
        const result = calculateAngolaPayroll(120000, 2026);
        expect(result.irt).toBe(0);
        expect(result.inss).toBe(3600);
    });

    it('deve calcular corretamente o IRT para 400.000 KZ em 2026', () => {
        // Matéria coletável: 400.000 - 12.000 (INSS) = 388.000 KZ
        // 3.º escalão em 2026: (388.000 - 300.000) * 19% + 49.250 = 16.720 + 49.250 = 65.970 KZ
        const result = calculateAngolaPayroll(400000, 2026);
        expect(result.irt).toBe(65970);
    });

    it('deve calcular corretamente o IRT para salários altos em 2026 (ex: 1.200.000 KZ)', () => {
        // Matéria coletável: 1.200.000 - 36.000 (INSS) = 1.164.000 KZ
        // 6.º escalão em 2026: (1.164.000 - 1.000.000) * 21% + 187.250 = 34.440 + 187.250 = 221.690 KZ
        const result = calculateAngolaPayroll(1200000, 2026);
        expect(result.irt).toBe(221690);
    });
});

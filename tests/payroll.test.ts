import { describe, it, expect } from 'vitest';
import { calculateAngolaPayroll } from '../lib/PayrollCalculations';

describe('Cálculos de RH (Angola) - Lib Centralizada', () => {
    it('deve isentar IRT para salários baixos (ex: 70.000 KZ)', () => {
        const result = calculateAngolaPayroll(70000);
        expect(result.irt).toBe(0);
        expect(result.inss).toBe(70000 * 0.03);
    });

    it('deve calcular corretamente para o segundo escalão (ex: 120.000 KZ)', () => {
        const result = calculateAngolaPayroll(120000);
        expect(result.irt).toBe(3640);
        expect(result.inss).toBe(3600);
    });

    it('deve calcular corretamente para o escalão do meio (ex: 400.000 KZ)', () => {
        const result = calculateAngolaPayroll(400000);
        expect(result.irt).toBe(45340);
    });

    it('deve calcular corretamente para salários altos (ex: 1.200.000 KZ)', () => {
        const result = calculateAngolaPayroll(1200000);
        expect(result.irt).toBe(201500);
    });

    it('deve calcular corretamente o INSS da entidade patronal (8%)', () => {
        const result = calculateAngolaPayroll(100000);
        expect(result.inss_employer).toBe(8000);
    });
});

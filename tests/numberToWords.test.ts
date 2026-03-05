import { describe, it, expect } from 'vitest';
import { numeroParaExtenso } from '../lib/numberToWords';

describe('numberToWords', () => {
    it('deve converter unidades corretamente', () => {
        expect(numeroParaExtenso(1)).toBe('Um Kwanza');
        expect(numeroParaExtenso(5)).toBe('Cinco Kwanzas');
    });

    it('deve converter dezenas corretamente', () => {
        expect(numeroParaExtenso(20)).toBe('Vinte Kwanzas');
        expect(numeroParaExtenso(25)).toBe('Vinte e Cinco Kwanzas');
    });

    it('deve converter centenas corretamente', () => {
        expect(numeroParaExtenso(100)).toBe('Cem Kwanzas');
        expect(numeroParaExtenso(105)).toBe('Cento e Cinco Kwanzas');
        expect(numeroParaExtenso(500)).toBe('Quinhentos Kwanzas');
    });

    it('deve converter milhares e milhões corretamente', () => {
        expect(numeroParaExtenso(1000)).toBe('Um Mil Kwanzas');
        expect(numeroParaExtenso(2500)).toBe('Dois Mil e Quinhentos Kwanzas');
        expect(numeroParaExtenso(1000000)).toBe('Um Milhão Kwanzas');
        expect(numeroParaExtenso(2000000)).toBe('Dois Milhões Kwanzas');
    });

    it('deve tratar cêntimos corretamente', () => {
        expect(numeroParaExtenso(1.50)).toBe('Um Kwanza e Cinquenta Cêntimos');
        expect(numeroParaExtenso(0.01)).toBe('Zero Kwanzas e Um Cêntimo');
    });
});

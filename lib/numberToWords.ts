/**
 * Utilitário para converter números para extenso (Reais/Kwanzas/Euros).
 * Focado no Português (PT-AO/PT-PT).
 */

const unidades = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove'];
const dezenasEspeciais = ['Dez', 'Onze', 'Doze', 'Treze', 'Catorze', 'Quinze', 'Dezasseis', 'Dezassete', 'Dezoito', 'Dezanove'];
const dezenas = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
const centenas = ['', 'Cento', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos', 'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];

function converterGrupo(numero: number): string {
    if (numero === 0) return '';
    if (numero === 100) return 'Cem';

    let extenso = '';

    const c = Math.floor(numero / 100);
    const d = Math.floor((numero % 100) / 10);
    const u = numero % 10;

    if (c > 0) extenso += centenas[c];

    if (d === 1) {
        extenso += (extenso ? ' e ' : '') + dezenasEspeciais[u];
        return extenso; // Se for 10 a 19, não avaliamos as unidades individualmente
    } else if (d > 1) {
        extenso += (extenso ? ' e ' : '') + dezenas[d];
    }

    if (u > 0) {
        extenso += (extenso ? ' e ' : '') + unidades[u];
    }

    return extenso;
}

export function numeroParaExtenso(valor: number): string {
    if (valor === 0) return 'Zero Kwanzas';

    const valorInteiro = Math.floor(valor);
    const centimos = Math.round((valor - valorInteiro) * 100);

    let extenso = '';

    const milhoes = Math.floor(valorInteiro / 1000000);
    const milhares = Math.floor((valorInteiro % 1000000) / 1000);
    const restos = valorInteiro % 1000;

    if (milhoes > 0) {
        extenso += converterGrupo(milhoes) + (milhoes === 1 ? ' Milhão' : ' Milhões');
    }

    if (milhares > 0) {
        if (extenso) {
            // Se o grupo seguinte (restos) for zero ou < 100, ou se os milhares forem redondos
            if (restos === 0 || restos < 100 || restos % 100 === 0) {
                extenso += ' e ';
            } else {
                extenso += ' ';
            }
        }
        extenso += converterGrupo(milhares) + ' Mil';
    }

    if (restos > 0) {
        // Se houver milhões/milhares e os restos forem < 100 (ex: 2004 -> Dois Mil e Quatro) ou dezenas certas (Ex: 2100 -> Dois Mil e Cem)
        if (extenso && (restos < 100 || restos % 100 === 0)) extenso += ' e ';
        else if (extenso) extenso += ' ';
        extenso += converterGrupo(restos);
    }

    // Definir a Moeda
    if (valorInteiro > 0) {
        extenso += (valorInteiro === 1 && extenso.trim() === 'Um') ? ' Kwanza' : ' Kwanzas';
    }

    // Tratar os Cêntimos
    if (centimos > 0) {
        if (valorInteiro > 0) extenso += ' e ';
        extenso += converterGrupo(centimos) + (centimos === 1 ? ' Cêntimo' : ' Cêntimos');
    }

    return extenso;
}

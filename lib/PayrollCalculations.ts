/**
 * Centralized Payroll Calculations for Angola (IRT, INSS)
 * Version 2.1.9
 */

export interface PayrollResults {
    inss: number;
    irt: number;
    net: number;
    inss_employer: number;
}

/**
 * Calculates INSS and IRT based on Angolan Tax Law 2024/2025
 * @param baseSalary Gross base salary in AOA
 * @returns PayrollResults object
 */
export const calculateAngolaPayroll = (baseSalary: number, year: number = 2026): PayrollResults => {
    const inssRate = 0.03;
    const inssEmployerRate = 0.08;

    // 1. INSS Calculation (3% Employee)
    const inss = baseSalary * inssRate;
    const inss_employer = baseSalary * inssEmployerRate;

    // 2. Taxable Base for IRT (Salary - INSS)
    const taxableBase = baseSalary - inss;

    let irt = 0;

    // 3. IRT Calculation based on Scales
    if (year >= 2026) {
        // Tabela OGE 2026 (isenção até 150.000 AOA)
        if (taxableBase <= 150000) {
            irt = 0;
        } else if (taxableBase <= 200000) {
            irt = (taxableBase - 150000) * 0.16 + 12500;
        } else if (taxableBase <= 300000) {
            irt = (taxableBase - 200000) * 0.18 + 31250;
        } else if (taxableBase <= 500000) {
            irt = (taxableBase - 300000) * 0.19 + 49250;
        } else if (taxableBase <= 1000000) {
            irt = (taxableBase - 500000) * 0.20 + 87250;
        } else if (taxableBase <= 1500000) {
            irt = (taxableBase - 1000000) * 0.21 + 187250;
        } else if (taxableBase <= 2000000) {
            irt = (taxableBase - 1500000) * 0.22 + 292250;
        } else if (taxableBase <= 2500000) {
            irt = (taxableBase - 2000000) * 0.23 + 402250;
        } else if (taxableBase <= 5000000) {
            irt = (taxableBase - 2500000) * 0.24 + 517250;
        } else if (taxableBase <= 10000000) {
            irt = (taxableBase - 5000000) * 0.245 + 1117250;
        } else {
            irt = (taxableBase - 10000000) * 0.25 + 2342250;
        }
    } else {
        // Tabela OGE 2024/2025 (isenção até 100.000 AOA)
        if (taxableBase <= 100000) {
            irt = 0;
        } else if (taxableBase <= 150000) {
            irt = (taxableBase - 100000) * 0.10 + 2000;
        } else if (taxableBase <= 200000) {
            irt = (taxableBase - 150000) * 0.13 + 7000;
        } else if (taxableBase <= 300000) {
            irt = (taxableBase - 200000) * 0.16 + 13500;
        } else if (taxableBase <= 500000) {
            irt = (taxableBase - 300000) * 0.18 + 29500;
        } else if (taxableBase <= 1000000) {
            irt = (taxableBase - 500000) * 0.19 + 65500;
        } else {
            irt = (taxableBase - 1000000) * 0.25 + 160500;
        }
    }

    // 4. Net Salary
    const net = taxableBase - irt;

    return {
        inss: Number(inss.toFixed(2)),
        irt: Number(irt.toFixed(2)),
        net: Number(net.toFixed(2)),
        inss_employer: Number(inss_employer.toFixed(2))
    };
};

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
export const calculateAngolaPayroll = (baseSalary: number): PayrollResults => {
    const inssRate = 0.03;
    const inssEmployerRate = 0.08;

    // 1. INSS Calculation (3% Employee)
    const inss = baseSalary * inssRate;
    const inss_employer = baseSalary * inssEmployerRate;

    // 2. Taxable Base for IRT (Salary - INSS)
    const taxableBase = baseSalary - inss;

    let irt = 0;

    // 3. IRT Calculation based on Scales (Current as of 2024/2025)
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

    // 4. Net Salary
    const net = taxableBase - irt;

    return {
        inss: Number(inss.toFixed(2)),
        irt: Number(irt.toFixed(2)),
        net: Number(net.toFixed(2)),
        inss_employer: Number(inss_employer.toFixed(2))
    };
};

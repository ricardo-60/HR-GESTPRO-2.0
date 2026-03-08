import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { generatePayrollPDF, PayrollData } from '../lib/PayrollGenerator';

interface Employee {
    id: string;
    full_name: string;
    id_card: string;
    role: string;
    base_salary: number;
    currency: string;
    hire_date: string;
    status: 'active' | 'inactive' | 'on_leave';
    contact_phone: string;
    contact_email: string;
    nif?: string;
    inss?: string;
    iban?: string;
    birth_date?: string;
}

const HRManagement: React.FC = () => {
    const { tenantStatus, tenantId } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        id_card: '',
        role: '',
        base_salary: 0,
        contact_phone: '',
        contact_email: '',
        nif: '',
        inss: '',
        iban: '',
        birth_date: ''
    });

    const [showCalculatorModal, setShowCalculatorModal] = useState(false);
    const [calcSalary, setCalcSalary] = useState(0);
    const [calcResults, setCalcResults] = useState({ inss: 0, irt: 0, net: 0 });

    const fetchEmployees = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Error fetching employees:', error);
        } else {
            setEmployees(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEmployees();
    }, [tenantId]);

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !tenantId) return;

        // Auditoria e mapeamento de campos (v2.1.5)
        const payload = {
            tenant_id: tenantId,
            full_name: formData.full_name,
            email: formData.contact_email, // Mapeado para o campo 'email' da DB
            job_title: formData.role,      // Mapeado para 'job_title'
            base_salary: formData.base_salary,
            id_card: formData.id_card,
            nif: formData.nif,
            inss: formData.inss,
            iban: formData.iban,
            birth_date: formData.birth_date || null,
            phone: formData.contact_phone,
            hire_date: new Date().toISOString().split('T')[0], // Default para hoje se não especificado
            status: 'active'
        };

        const { error } = await supabase.from('employees').insert([payload]);

        if (error) {
            console.error('[RH Audit] Erro ao cadastrar:', error);
            alert('Erro ao criar colaborador: ' + error.message);
        } else {
            alert('Colaborador adicionado com sucesso!');
            setShowAddModal(false);
            setFormData({
                full_name: '', id_card: '', role: '', base_salary: 0, contact_phone: '', contact_email: '', nif: '', inss: '', iban: '', birth_date: ''
            });
            fetchEmployees();
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('employees').update({ status: newStatus }).eq('id', id);
        if (error) {
            alert('Erro ao atualizar estado: ' + error.message);
        } else {
            fetchEmployees();
        }
    };

    const handleAttendance = async (employeeId: string, status: 'present' | 'absent' | 'on_leave') => {
        if (!supabase || !tenantId) return;
        // In a real scenario we'd query today's logs and insert or update
        // Simplified mapping: just marking check-in placeholder
        const { error } = await supabase.from('attendance_logs').upsert({
            tenant_id: tenantId,
            employee_id: employeeId,
            date: new Date().toISOString().split('T')[0],
            status: status,
            check_in: status === 'present' ? new Date().toISOString() : null
        }, { onConflict: 'employee_id, date' });

        if (error) {
            alert('Erro ao registar assiduidade: ' + error.message);
        } else {
            alert(`Ponto registado como: ${status}`);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const calculateIRT = (salary: number) => {
        const base = salary;
        const inss = base * 0.03;
        const taxable = base - inss;
        let irt = 0;

        if (taxable <= 100000) irt = 0;
        else if (taxable <= 150000) irt = (taxable - 100000) * 0.10 + 2000;
        else if (taxable <= 200000) irt = (taxable - 150000) * 0.13 + 7000;
        else if (taxable <= 300000) irt = (taxable - 200000) * 0.16 + 13500;
        else if (taxable <= 500000) irt = (taxable - 300000) * 0.18 + 29500;
        else if (taxable <= 1000000) irt = (taxable - 500000) * 0.19 + 65500;
        else irt = (taxable - 1000000) * 0.25 + 160500;

        return { inss, irt, net: taxable - irt };
    };

    const handlePrintReceipt = async (emp: Employee) => {
        if (!tenantStatus) return;

        const results = calculateIRT(emp.base_salary);
        const data: PayrollData = {
            period: new Date().toLocaleString('pt-PT', { month: 'long', year: 'numeric' }),
            employee_name: emp.full_name,
            employee_role: emp.role,
            employee_id_card: emp.id_card,
            employee_nif: emp.nif,
            employee_inss: emp.inss,
            employee_iban: emp.iban,
            base_salary: emp.base_salary,
            inss_employee: results.inss,
            inss_employer: emp.base_salary * 0.08, // 8% da entidade empregadora
            irt: results.irt,
            net_salary: results.net
        };

        const doc = await generatePayrollPDF(data, {
            id: tenantId || '',
            company_name: tenantStatus.company_name,
            tax_id: tenantStatus.tax_id || '',
            address: tenantStatus.address || '',
            phone: tenantStatus.phone || '',
            logo_url: tenantStatus.logo_url,
            status: tenantStatus.status,
            plan_tier: tenantStatus.plan_type || 'Pro'
        } as any);

        doc.save(`Recibo_${emp.full_name.replace(/\s+/g, '_')}_${data.period}.pdf`);
    };

    const handleCalc = (val: number) => {
        setCalcSalary(val);
        const res = calculateIRT(val);
        setCalcResults(res);
    };

    const activeCount = employees.filter(e => e.status === 'active').length;
    const leaveCount = employees.filter(e => e.status === 'on_leave').length;
    const totalPayroll = employees.filter(e => e.status === 'active').reduce((acc, emp) => acc + emp.base_salary, 0);

    const currentMonth = new Date().getMonth() + 1;
    const birthdayCount = employees.filter(emp => {
        if (!emp.birth_date) return false;
        const birthMonth = new Date(emp.birth_date).getMonth() + 1;
        return birthMonth === currentMonth;
    }).length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Recursos Humanos</h2>
                    <p className="text-slate-500 font-medium">
                        Gestão de equipas: <span className="text-indigo-600 font-bold">{tenantStatus?.company_name || 'Organização'}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white hover:bg-gray-50 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-200 transition-all flex items-center space-x-2">
                        <i className="fas fa-file-export"></i>
                        <span>Exportar PDF</span>
                    </button>
                    <button
                        onClick={() => setShowCalculatorModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all flex items-center space-x-2"
                    >
                        <i className="fas fa-calculator"></i>
                        <span>Calculadora IRT</span>
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all flex items-center space-x-2"
                    >
                        <i className="fas fa-user-plus"></i>
                        <span>Adicionar Colaborador</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                            <i className="fas fa-money-check-alt"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Folha Salarial Base</p>
                        <p className="text-2xl font-black text-slate-800 tracking-tighter">KZ {totalPayroll.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                            <i className="fas fa-birthday-cake"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Aniversariantes ({new Date().toLocaleString('pt-PT', { month: 'long' })})</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{birthdayCount}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/20 overflow-hidden mt-8">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Diretório de Colaboradores</h3>
                    <div className="relative">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Procurar nome ou cargo..."
                            className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-72 transition-shadow shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                            <tr>
                                <th className="px-8 py-5">Colaborador</th>
                                <th className="px-8 py-5">Identificação</th>
                                <th className="px-8 py-5">Cargo</th>
                                <th className="px-8 py-5">Salário Base</th>
                                <th className="px-8 py-5">Estado</th>
                                <th className="px-8 py-5 text-right">Ponto Rápido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-10 text-center text-slate-400 font-bold animate-pulse">
                                        A carregar equipa...
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium">
                                        <div className="text-4xl mb-4"><i className="fas fa-folder-open text-slate-200"></i></div>
                                        Nenhum colaborador encontrado nesta empresa.
                                    </td>
                                </tr>
                            ) : filteredEmployees.map(emp => (
                                <tr key={emp.id} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs uppercase">
                                                {emp.full_name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{emp.full_name}</p>
                                                <p className="text-xs text-slate-400 font-medium">{emp.contact_email || emp.contact_phone || 'Sem contacto'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-slate-600 font-medium">{emp.id_card || 'N/A'}</td>
                                    <td className="px-8 py-5 text-slate-600 font-bold">{emp.role}</td>
                                    <td className="px-8 py-5 text-slate-600 font-medium">
                                        KZ {emp.base_salary.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-8 py-5">
                                        <select
                                            value={emp.status}
                                            onChange={e => updateStatus(emp.id, e.target.value)}
                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none border-0 ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                                emp.status === 'on_leave' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-rose-50 text-rose-600'
                                                }`}
                                        >
                                            <option value="active">Ativo</option>
                                            <option value="on_leave">Férias/Licença</option>
                                            <option value="inactive">Inativo</option>
                                        </select>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handlePrintReceipt(emp)}
                                                title="Gerar Recibo"
                                                className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white transition-colors flex items-center justify-center font-bold"
                                            >
                                                <i className="fas fa-file-invoice"></i>
                                            </button>
                                            <button
                                                onClick={() => handleAttendance(emp.id, 'present')}
                                                title="Marcar Presença"
                                                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center"
                                            >
                                                <i className="fas fa-check"></i>
                                            </button>
                                            <button
                                                onClick={() => handleAttendance(emp.id, 'absent')}
                                                title="Marcar Falta"
                                                className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Registo */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form onSubmit={handleAddSubmit} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Registar Novo Colaborador</h3>
                                <p className="text-slate-500 text-sm">Preencha a ficha do funcionário para controlo interno.</p>
                            </div>
                            <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nome Completo *</label>
                                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Cargo / Função *</label>
                                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Vendedor" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Salário Base (KZ)</label>
                                <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.base_salary} onChange={e => setFormData({ ...formData, base_salary: Number(e.target.value) })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nº Identificação (BI)</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.id_card} onChange={e => setFormData({ ...formData, id_card: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">NIF (Contribuinte)</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.nif} onChange={e => setFormData({ ...formData, nif: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nº INSS</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.inss} onChange={e => setFormData({ ...formData, inss: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">IBAN</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="AO06 0000..." value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Data de Nascimento</label>
                                <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Telefone</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.contact_phone} onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
                                <input type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" className="px-8 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                                Salvar Colaborador
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal de Calculadora IRT */}
            {showCalculatorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Simulador IRT & INSS</h3>
                                <p className="text-emerald-700 text-xs font-bold uppercase tracking-widest">Tabela Angola 2024/2025</p>
                            </div>
                            <button type="button" onClick={() => setShowCalculatorModal(false)} className="text-emerald-900/40 hover:text-emerald-900 transition-colors">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Salário Bruto Mensal (AOA)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">KZ</span>
                                    <input
                                        type="number"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                                        placeholder="0.00"
                                        value={calcSalary || ''}
                                        onChange={e => handleCalc(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                                <div className="flex justify-between items-center font-bold">
                                    <span className="text-slate-500">Desconto INSS (3%)</span>
                                    <span className="text-rose-600">- KZ {calcResults.inss.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center font-bold">
                                    <span className="text-slate-500">Imposto IRT</span>
                                    <span className="text-rose-600">- KZ {calcResults.irt.toLocaleString()}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Salário Líquido</p>
                                        <p className="text-3xl font-black text-emerald-600 tracking-tighter">KZ {calcResults.net.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Descontos</p>
                                        <p className="text-sm font-bold text-slate-600">KZ {(calcResults.inss + calcResults.irt).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 flex justify-center">
                            <button
                                onClick={() => setShowCalculatorModal(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                Fechar Simulador
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRManagement;

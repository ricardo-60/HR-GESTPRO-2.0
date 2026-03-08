import React, { useState } from 'react';

const HelpCenter: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const CATEGORIES = [
        {
            id: 'pwa',
            title: 'Instalação Mobile (PWA)',
            icon: 'fa-mobile-alt',
            color: 'bg-indigo-50 text-indigo-600',
            content: [
                { q: 'Como instalar no Android?', a: 'Abra o browser (Chrome), clique nos três pontos no canto superior direito e selecione "Instalar App".' },
                { q: 'Como instalar no iOS (iPhone)?', a: 'Abra o Safari, clique no botão "Partilhar" (quadrado com seta) e selecione "Adicionar ao Ecrã Principal".' }
            ]
        },
        {
            id: 'stock',
            title: 'Gestão de Stock',
            icon: 'fa-boxes',
            color: 'bg-emerald-50 text-emerald-600',
            content: [
                { q: 'Como usar o scanner?', a: 'Nos ecrãs de Venda ou Stock, clique no ícone de câmara. Aponte para o código de barras do produto para o identificar automaticamente.' },
                { q: 'E se a câmara não abrir?', a: 'Pode introduzir o SKU ou Código de Barras manualmente no campo de pesquisa a qualquer momento.' }
            ]
        },
        {
            id: 'fiscal',
            title: 'Fiscalidade e SAFT-AO',
            icon: 'fa-file-invoice',
            color: 'bg-amber-50 text-amber-600',
            content: [
                { q: 'O que é o SAFT-AO?', a: 'É o ficheiro normativo exigido pela AGT para exportar a faturação mensal. Deve ser gerado e enviado até ao dia 15 do mês seguinte.' },
                { q: 'Como gerar o SAFT?', a: 'Vá ao menu "Exportar SAFT-AO", selecione o mês e o ano, e clique em Gerar.' }
            ]
        },
        {
            id: 'rh_360',
            title: 'Recursos Humanos 360º',
            icon: 'fa-user-tie',
            color: 'bg-rose-50 text-rose-600',
            content: [
                { q: 'Como calcular impostos (IRT/INSS)?', a: 'No Dashboard de RH, clique em "Calculadora IRT". Insira o salário bruto e o sistema aplicará as taxas de Angola (2024/2025) automaticamente.' },
                { q: 'Onde encontro o IBAN e NIF dos funcionários?', a: 'Estes dados estão na ficha detalhada de cada colaborador, acessível ao clicar em "Adicionar" ou ao editar um registo existente.' },
                { q: 'Como gerir aniversários?', a: 'O Dashboard de RH mostra automaticamente o número de aniversariantes do mês atual para ajudar no planeamento de eventos internos.' }
            ]
        }
    ];

    const filteredCategories = CATEGORIES.map(cat => ({
        ...cat,
        content: cat.content.filter(item =>
            item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.a.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(cat => cat.content.length > 0);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight font-display">Central de Ajuda</h2>
                <p className="text-slate-500 font-medium max-w-2xl mx-auto">
                    Tudo o que precisa de saber para dominar o HR-GESTPRO 2.0 e tornar o seu negócio mais eficiente.
                </p>

                <div className="relative max-w-lg mx-auto mt-8">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                        type="text"
                        placeholder="Pesquisar ajuda (PWA, Stock, SAFT...)"
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map(cat => (
                    <div key={cat.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className={`w-14 h-14 rounded-3xl ${cat.color} flex items-center justify-center mb-6 text-xl shadow-inner group-hover:scale-110 transition-transform`}>
                            <i className={`fas ${cat.icon}`}></i>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-4">{cat.title}</h3>
                        <div className="space-y-4 text-sm">
                            {cat.content.map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                    <p className="font-bold text-slate-800 tracking-tight">{item.q}</p>
                                    <p className="text-slate-500 leading-relaxed font-medium">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {filteredCategories.length === 0 && (
                <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <i className="fas fa-question-circle text-3xl"></i>
                    </div>
                    <p className="text-slate-400 font-bold">Não encontramos resultados para "{searchTerm}"</p>
                </div>
            )}
        </div>
    );
};

export default HelpCenter;

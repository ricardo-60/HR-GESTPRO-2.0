import React, { useState } from 'react';

const HelpCenter: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'faq' | 'manual'>('manual');
    const [activeManualSection, setActiveManualSection] = useState<string>('intro');

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

    const MANUAL_SECTIONS = [
        {
            id: 'intro',
            title: '1. Introdução ao Sistema Híbrido',
            icon: 'fa-network-wired',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 leading-relaxed font-medium">
                        O <strong>HR-GESTPRO 2.0</strong> foi atualizado para uma arquitetura híbrida de rede local e nuvem. A aplicação funciona de forma <strong>offline-first</strong>: grava as operações localmente no banco de dados SQLite embarcado e sincroniza na nuvem quando existe ligação à internet.
                    </p>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-indigo-900 text-sm">
                        <h4 className="font-bold flex items-center space-x-2 mb-2">
                            <i className="fas fa-server"></i>
                            <span>Rede Interna Híbrida</span>
                        </h4>
                        <p className="font-medium text-indigo-700 leading-relaxed">
                            Uma máquina central funciona como <strong>Servidor Central</strong> e outras máquinas na mesma rede (computadores, tablets, smartphones) ligam-se ao servidor local via IP local. Todas as vendas e cadastros de RH serão salvos na base centralizada.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'sync',
            title: '2. Operação Offline e Sincronização',
            icon: 'fa-sync',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 leading-relaxed font-medium">
                        A barra inferior do aplicativo (SyncStatusBar) reporta ativamente o estado de conectividade:
                    </p>
                    <ul className="space-y-3 text-slate-600 font-medium">
                        <li className="flex items-start space-x-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5"></span>
                            <span><strong>Rede Online (Verde):</strong> A aplicação lê e escreve diretamente na cloud do Supabase e sincroniza dados locais pendentes.</span>
                        </li>
                        <li className="flex items-start space-x-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1.5"></span>
                            <span><strong>Rede Local / Offline (Vermelho):</strong> A aplicação utiliza a base SQLite local e enfileira as operações escritas de forma segura.</span>
                        </li>
                    </ul>
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-amber-900 text-sm">
                        <h4 className="font-bold flex items-center space-x-2 mb-2">
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>Resolução de Conflitos</span>
                        </h4>
                        <p className="font-medium text-amber-700 leading-relaxed">
                            Quando a máquina se reconecta, o motor de sincronização processa a fila de alterações local. Em caso de edições em simultâneo da mesma ficha, a alteração com o carimbo de data/hora mais recente (<strong>last-write-wins</strong>) prevalecerá de forma automática.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'rh',
            title: '3. Gestão de Recursos Humanos',
            icon: 'fa-user-tie',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 leading-relaxed font-medium">
                        O módulo de Recursos Humanos permite a gestão 360º de colaboradores, folhas de salário e ponto de assiduidade.
                    </p>
                    <div className="border border-slate-100 rounded-2xl p-5 space-y-3">
                        <h4 className="font-bold text-slate-800 text-sm">Campos Críticos do Colaborador:</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-500 font-bold uppercase tracking-wider">
                            <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-indigo-600">Nome Completo:</span> Usado nos recibos
                            </li>
                            <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-indigo-600">Cargo / Função:</span> Nível corporativo
                            </li>
                            <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-indigo-600">Salário Base (KZ):</span> Base tributável
                            </li>
                            <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-indigo-600">NIF / INSS / IBAN:</span> Dados bancários e fiscais
                            </li>
                        </ul>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        <strong>Processamento Salarial:</strong> Ao clicar no botão de "Recibo" de um colaborador, o sistema calcula os descontos obrigatórios do IRT e os 3% de segurança social (INSS) sob a tabela em vigor em Angola e gera um PDF completo para impressão.
                    </p>
                </div>
            )
        },
        {
            id: 'pos',
            title: '4. Vendas e Caixa (POS)',
            icon: 'fa-cash-register',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 leading-relaxed font-medium">
                        O Ponto de Venda (POS) é otimizado para operação de retalho veloz e funciona totalmente offline.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-slate-600 font-medium">
                        <li>Selecione ou pesquise o produto no catálogo.</li>
                        <li>Caso a câmara de leitura de código de barras esteja habilitada, aponte o código para leitura automática.</li>
                        <li>Finalize a venda no ecrã de pagamento selecionando a forma de liquidação (Dinheiro, Multicaixa, etc.).</li>
                        <li>A fatura-recibo é gerada localmente e o número sequencial é mantido na base de dados centralizada da rede local.</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'network',
            title: '5. Configuração da Rede e IP',
            icon: 'fa-network-wired',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 leading-relaxed font-medium">
                        Para conectar outros computadores ou telemóveis ao servidor local:
                    </p>
                    <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 font-mono text-xs space-y-3">
                        <p># 1. No Servidor Central, abra a consola (cmd) e digite:</p>
                        <p className="text-emerald-400">ipconfig</p>
                        <p># 2. Localize o "Endereço IPv4" (Ex: 192.168.1.150)</p>
                        <p># 3. Nos outros computadores da loja, abra o navegador e aceda a:</p>
                        <p className="text-emerald-400">http://192.168.1.150:3002</p>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        A porta **3002** do servidor Express local está configurada para aceitar todas as ligações de rede local de forma nativa e sem necessidade de configurações adicionais de portas.
                    </p>
                </div>
            )
        },
        {
            id: 'hospitality',
            title: '6. Módulos de Hospitalidade e Snack-Bar',
            icon: 'fa-hotel',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 leading-relaxed font-medium">
                        O sistema de hospitalidade (<strong>HR Hospitality</strong>) pode rodar de forma descentralizada na rede interna da empresa, comunicando-se diretamente com a base central na porta <strong>3002</strong>.
                    </p>
                    <ul className="space-y-3 text-slate-600 font-medium">
                        <li className="flex items-start space-x-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1.5"></span>
                            <span><strong>Lançamentos nos Quartos:</strong> Permite que os consumos realizados no Snack Bar/Restaurante sejam debitados de forma direta na ficha de estadia ativa do hóspede, registando despesas na tabela local de consumos.</span>
                        </li>
                        <li className="flex items-start space-x-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1.5"></span>
                            <span><strong>Perfil Snack Bar Restrito:</strong> Operadores com perfil restrito acedem exclusivamente ao terminal de vendas rápido do Snack Bar, bloqueando painéis de faturação e dados de Recursos Humanos.</span>
                        </li>
                    </ul>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-indigo-900 text-sm">
                        <h4 className="font-bold flex items-center space-x-2 mb-2">
                            <i className="fas fa-network-wired"></i>
                            <span>Conexão de Terminais de Venda</span>
                        </h4>
                        <p className="font-medium text-indigo-700 leading-relaxed">
                            No ecrã de login do terminal do Snack Bar (Cliente), aceda a "Configurações de Rede Local", mude o modo para "Cliente" e aponte para o IP da máquina do Servidor Central para que todas as consultas e lançamentos ocorram na base unificada.
                        </p>
                    </div>
                </div>
            )
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
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto">
            {/* Header da Central */}
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight font-display">Ajuda & Manual do Utilizador</h2>
                <p className="text-slate-500 font-medium max-w-2xl mx-auto">
                    Tudo o que precisa de saber para dominar o HR-GESTPRO 2.0 e gerir o seu negócio com ou sem ligação à internet.
                </p>

                {/* Seleção de Tabs */}
                <div className="flex justify-center space-x-2 mt-8">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest border transition-all ${
                            activeTab === 'manual'
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <i className="fas fa-book-open mr-2"></i>
                        Manual do Utilizador
                    </button>
                    <button
                        onClick={() => setActiveTab('faq')}
                        className={`px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest border transition-all ${
                            activeTab === 'faq'
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <i className="fas fa-question-circle mr-2"></i>
                        Perguntas Frequentes (FAQ)
                    </button>
                </div>
            </div>

            {/* TAB: MANUAL DO UTILIZADOR */}
            {activeTab === 'manual' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                    {/* Navegação Lateral do Manual */}
                    <div className="lg:col-span-4 space-y-2">
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-2">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] px-3 mb-4">Índice do Manual</p>
                            {MANUAL_SECTIONS.map(sec => (
                                <button
                                    key={sec.id}
                                    onClick={() => setActiveManualSection(sec.id)}
                                    className={`w-full text-left px-4 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center space-x-3 ${
                                        activeManualSection === sec.id
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <i className={`fas ${sec.icon} w-5`}></i>
                                    <span>{sec.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conteúdo da Secção Ativa do Manual */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm min-h-[400px] flex flex-col justify-between">
                            <div>
                                <div className="flex items-center space-x-3 border-b border-slate-50 pb-6 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                                        <i className={`fas ${MANUAL_SECTIONS.find(s => s.id === activeManualSection)?.icon}`}></i>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {MANUAL_SECTIONS.find(s => s.id === activeManualSection)?.title}
                                    </h3>
                                </div>
                                <div className="mt-4">
                                    {MANUAL_SECTIONS.find(s => s.id === activeManualSection)?.content}
                                </div>
                            </div>
                            
                            <div className="border-t border-slate-50 pt-8 mt-12 flex justify-between items-center text-xs text-slate-400 font-bold">
                                <span>HR-GESTPRO v2.2.0 • Software Certificado</span>
                                <span className="flex items-center space-x-1">
                                    <i className="fas fa-shield-alt text-emerald-500"></i>
                                    <span>Seguro e Local</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PERGUNTAS FREQUENTES */}
            {activeTab === 'faq' && (
                <div className="space-y-6">
                    <div className="relative max-w-lg mx-auto mb-8">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            type="text"
                            placeholder="Pesquisar ajuda (PWA, Stock, SAFT...)"
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
            )}
        </div>
    );
};

export default HelpCenter;

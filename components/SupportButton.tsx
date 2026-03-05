import React from 'react';
import { useAuth } from '../AuthContext';

const SupportButton: React.FC = () => {
    const { tenantStatus } = useAuth();

    // Configurações do suporte
    const WHATSAPP_NUMBER = '244900000000'; // Número de exemplo (Angola)
    const companyName = tenantStatus?.company_name || 'Nova Empresa';
    const nif = tenantStatus?.nif || 'N/D';

    const message = `Olá, preciso de suporte no HR-GESTPRO 2.0!\n\n🏢 Empresa: ${companyName}\n🆔 NIF: ${nif}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-emerald-600 transition-all group"
            title="Suporte via WhatsApp"
        >
            <i className="fab fa-whatsapp text-2xl"></i>
            <span className="absolute right-full mr-4 bg-slate-900 text-white text-[10px] font-black py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest pointer-events-none">
                Precisa de ajuda?
            </span>
        </a>
    );
};

export default SupportButton;

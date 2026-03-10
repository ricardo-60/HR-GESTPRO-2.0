export const MANUAL_CONTENT = `
# Manual do Utilizador - HR-GESTPRO 2.0
## Gestão Inteligente e Certificada (AGT)

---

# Índice
1. [Introdução](#capitulo-1)
2. [Configuração Inicial](#capitulo-2)
3. [Fluxo de Vendas (PDV)](#capitulo-3)
4. [Gestão de Stocks](#capitulo-4)
5. [Recursos Humanos & Salários](#capitulo-5)
6. [Exportação SAFT-AO](#capitulo-6)

---

<a name="capitulo-1"></a>
# Capítulo 1: Introdução
O **HR-GESTPRO 2.0** é uma solução avançada de gestão comercial desenhada para o mercado angolano, garantindo conformidade total com as normas da **AGT**.

### Instalação Desktop (Electron)
- Execute o instalador \`HR-GESTPRO - Setup.exe\`.
- O sistema instalará automaticamente os drivers de base de dados e criará um atalho no seu ecrã.

### Instalação PWA (Mobile)
- Aceda ao URL do sistema no seu smartphone (Chrome no Android ou Safari no iOS).
- Clique em "Adicionar ao Ecrã Principal" para utilizar o sistema como uma App nativa, com suporte a scanner de código de barras.

---

<a name="capitulo-2"></a>
# Capítulo 2: Configuração Inicial
Ao abrir o sistema pela primeira vez, deverá configurar a ligação à base de dados Cloud:
1. Insira o URL do Projeto e a API Key (Anon) fornecida pela HR-Tecnologia.
2. O sistema validará a conectividade.
3. Se o ecrã ficar branco, aguarde a sincronização (máximo 5 segundos).

---

<a name="capitulo-3"></a>
# Capítulo 3: Fluxo de Vendas (PDV)
O sistema permite realizar vendas rápidas com ou sem scanner:
1. Aceda ao módulo **Vendas**.
2. Scaneie o código de barras ou pesquise pelo nome do produto.
3. Escolha o método de pagamento (Numerário, TPA, Transferência).
4. O sistema gera a fatura assinada digitalmente com algoritmo RSA.

---

<a name="capitulo-4"></a>
# Capítulo 4: Gestão de Stocks
Controle o seu inventário com precisão:
- **PMP (Preço Médio Ponderado):** Calculado automaticamente em cada entrada de stock.
- **Alertas:** O sistema avisa quando um produto atinge o nível crítico.

---

<a name="capitulo-5"></a>
# Capítulo 5: Recursos Humanos & Salários
Faça a gestão completa dos seus colaboradores:
- Processamento de faturas-recibo de salários.
- Cálculo automático de IRT e Segurança Social.

---

<a name="capitulo-6"></a>
# Capítulo 6: Exportação SAFT-AO
O ficheiro SAFT é obrigatório para a comunicação com a AGT:
### Exportação de SAFT-AO:
1. Aceda a **Relatórios > Exportar SAFT**.
2. Selecione o mês pretendido.
3. O sistema gerará um ficheiro \`.xml\` validado, pronto para ser submetido no portal da AGT.

---

### Suporte Técnico
- **Telefone:** 923 658 211
- **Email:** suporte@hr-tecnologia.com
- **WhatsApp:** Clique no botão de apoio no sistema.
`;

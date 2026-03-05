export const MANUAL_CONTENT = `
# Manual do Utilizador - HR-GESTPRO 2.0
## Gestão Inteligente e Certificada (AGT)

---

# Índice
1. [Introdução](#capitulo-1)
2. [Configuração Inicial](#capitulo-2)
3. [Fluxo de Vendas (PDV)](#capitulo-3)
4. [Gestão de Stock e PMP](#capitulo-4)
5. [Obrigações Fiscais](#capitulo-5)
6. [Licenciamento](#capitulo-6)

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
Antes de começar a faturar, deve configurar os dados da sua empresa:

1. Aceda a **Configurações > Empresa**.
2. Introduza o **NIF** correto (crucial para validação AGT).
3. Carregue o seu **Logótipo** (será exibido em todas as faturas).
4. Defina a **Moeda** como Kwanza (AKZ) e configure o regime de IVA aplicável.

---

<a name="capitulo-3"></a>
# Capítulo 3: Fluxo de Vendas (PDV)
O terminal de vendas (POS) foi desenhado para ser rápido e intuitivo.

### Operação de Venda:
- **Abertura de Caixa**: Introduza o saldo inicial no início do turno.
- **Seleção de Artigos**: Utilize o **Scanner** (câmara) ou a pesquisa manual.
- **Finalização**: Selecione o método de pagamento (Dinheiro, TPA, Multicaixa) e emita o **Talão Térmico** ou **Fatura A4**.

---

<a name="capitulo-4"></a>
# Capítulo 4: Gestão de Stock e PMP
O sistema utiliza o método de **Preço Médio Ponderado (PMP)** para garantir que o seu lucro é calculado com precisão.

- **Entrada de Stock**: Registe sempre as compras com o preço de custo atualizado.
- **Alertas de Rutura**: Os artigos com stock abaixo do mínimo aparecerão destacados em vermelho no Dashboard.
- **Inventário**: Realize contagens periódicas e utilize o ajuste manual para corrigir divergências.

---

<a name="capitulo-5"></a>
# Capítulo 5: Obrigações Fiscais
O HR-GESTPRO 2.0 gera documentos certificados por algoritmos de assinatura digital.

### Exportação de SAFT-AO:
1. Aceda a **Relatórios > Exportar SAFT**.
2. Selecione o mês pretendido.
3. O sistema gerará um ficheiro `.xml` validado, pronto para ser submetido no portal da AGT.

---

<a name="capitulo-6"></a>
# Capítulo 6: Licenciamento
Para manter o sistema ativo, deve renovar a sua subscrição:

1. No Dashboard, clique em **Ativar Licença**.
2. Introduza o código **HGP-XXXX-XXXX-XXXX** fornecido pelo seu revendedor.
3. O sistema atualizará automaticamente a data de expiração para 30, 90 ou 365 dias.
`;

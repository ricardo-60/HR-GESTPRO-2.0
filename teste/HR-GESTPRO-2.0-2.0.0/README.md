# HR-GESTPRO 2.0

> **Software de Gestão Empresarial para PMEs Angolanas**  
> Faturação · Stock · RH · PDV · Conformidade AGT

[![Build Desktop](https://github.com/ricardo-60/HR-GESTPRO-2.0/actions/workflows/build-desktop.yml/badge.svg)](https://github.com/ricardo-60/HR-GESTPRO-2.0/actions/workflows/build-desktop.yml)
[![Versão](https://img.shields.io/github/v/release/ricardo-60/HR-GESTPRO-2.0?logo=github&label=Versão)](https://github.com/ricardo-60/HR-GESTPRO-2.0/releases/latest)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase)](https://supabase.com)

---

## 📥 Instalação para Utilizadores

### Windows (Recomendado)

1. **Descarrega o instalador mais recente:**  
   👉 **[HR-GESTPRO-Setup.exe](https://github.com/ricardo-60/HR-GESTPRO-2.0/releases/latest/download/HR-GESTPRO-Setup.exe)**

2. Executa o ficheiro `.exe` e segue o assistente de instalação.
3. A aplicação conecta automaticamente ao servidor em produção — não é necessária configuração adicional.

### Linux

```bash
# Descarrega o AppImage
wget https://github.com/ricardo-60/HR-GESTPRO-2.0/releases/latest/download/HR-GESTPRO.AppImage

# Dá permissão de execução
chmod +x HR-GESTPRO.AppImage

# Executa
./HR-GESTPRO.AppImage
```

### Via Browser (sem instalação)

Acede directamente em: **[https://hr-gestpro-2-0.vercel.app](https://hr-gestpro-2-0.vercel.app)**

---

## 🚀 Funcionalidades

| Módulo | Estado |
|---|---|
| Dashboard & Relatórios BI | ✅ Produção |
| Faturação (A4 + Talão 80mm) | ✅ Produção |
| Gestão de Stock & PMP | ✅ Produção |
| PDV com modo Offline | ✅ Produção |
| Recursos Humanos | ✅ Produção |
| Compras & Fornecedores | ✅ Produção |
| Assinatura Digital AGT (RSA) | ✅ Produção |
| Exportação SAFT-AO XML | ✅ Produção |

---

## 🛠️ Desenvolvimento Local

```bash
git clone https://github.com/ricardo-60/HR-GESTPRO-2.0.git
cd HR-GESTPRO-2.0
npm install

# Copia as variáveis de ambiente
cp .env.example .env
# Edita .env com as tuas credenciais Supabase

# Inicia o servidor de desenvolvimento React
npm run dev

# Compila o instalador Windows
npm run electron:build

# Compila para todas as plataformas (Windows + Linux)
npm run electron:build:all
```

---

## 🔑 Variáveis de Ambiente Necessárias

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

> ⚠️ Para o build automático via GitHub Actions, adiciona estas variáveis em:  
> **Settings → Secrets and variables → Actions** do teu repositório.

---

## 📋 Certificação AGT

O sistema implementa os requisitos da **Portaria 155/21 AGT - Angola**:

- ✅ Assinatura digital RSA-2048 / SHA-1
- ✅ Hash encadeado (cada fatura assina a anterior)
- ✅ 4 caracteres de hash impressos na fatura
- ✅ Exportação SAFT-AO XML v1.04
- ✅ Numeração sequencial sem lacunas (Trigger SQL)
- ✅ Imutabilidade de faturas finalizadas (Trigger SQL)

---

## 📄 Licença

Copyright © 2026 HR Tecnologias. Todos os direitos reservados.  
*Processado por programa validado nº 000/AGT — HR-GESTPRO 2.0*

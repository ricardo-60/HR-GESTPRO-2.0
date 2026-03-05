/**
 * lib/agtSigner.ts
 * Motor de assinatura digital para conformidade com a AGT Angola.
 * Utiliza Web Crypto API (browser-native) — sem dependências externas.
 *
 * Algoritmo: RSA-PKCS1-v1_5 com SHA-1 (padrão exigido pela AGT).
 * Cadeia de Hash: cada fatura inclui o hash da fatura anterior,
 * tornando impossível inserir, remover ou reordenar registos sem quebrar a cadeia.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AgtKeyPair {
    publicKeyBase64: string;   // Chave pública (para guardar no Supabase e submeter à AGT)
    privateKeyBase64: string;  // Chave privada (exportar em .pem — NUNCA guardar no servidor)
    publicKeyPem: string;
    privateKeyPem: string;
}

export interface InvoiceHashInput {
    invoiceDate: string;           // Ex: "2026-03-05"
    createdAt: string;             // ISO timestamp: "2026-03-05T17:00:00"
    invoiceNumber: string;         // Ex: "FT 2026/001"
    grossTotal: number;            // Total bruto (2 casas decimais)
    previousHash: string;          // Hash da fatura anterior ("0" para a primeira)
}

export interface AgtSignatureResult {
    hashString: string;       // String canónica antes de assinar
    signatureBase64: string;  // Assinatura RSA em Base64
    hashChars: string;        // 4 caracteres para impressão na fatura (ex: "4rT9")
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const HASH_CHAR_POSITIONS = [11, 21, 31, 41]; // Posições na assinatura Base64 (0-indexed)
const RSA_KEY_BITS = 2048;

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Converte um ArrayBuffer para Base64
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
};

/**
 * Converte Base64 para ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Formata uma chave Base64 em formato PEM
 */
const toPem = (base64: string, type: 'PUBLIC KEY' | 'PRIVATE KEY'): string => {
    const lines = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
};

// ─── API Pública ─────────────────────────────────────────────────────────────

/**
 * Gera um par de chaves RSA-2048 para assinar faturas.
 * A chave privada NUNCA deve ser enviada ao servidor.
 * Guardar o .pem da chave privada em local seguro (cofre, USB cifrado).
 */
export const generateRSAKeyPair = async (): Promise<AgtKeyPair> => {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: RSA_KEY_BITS,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
            hash: { name: 'SHA-1' }, // Padrão AGT
        },
        true, // extractable
        ['sign', 'verify']
    );

    const [publicKeyDer, privateKeyDer] = await Promise.all([
        window.crypto.subtle.exportKey('spki', keyPair.publicKey),
        window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
    ]);

    const publicKeyBase64 = arrayBufferToBase64(publicKeyDer);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyDer);

    return {
        publicKeyBase64,
        privateKeyBase64,
        publicKeyPem: toPem(publicKeyBase64, 'PUBLIC KEY'),
        privateKeyPem: toPem(privateKeyBase64, 'PRIVATE KEY'),
    };
};

/**
 * Constrói a string canónica AGT para assinar:
 * "DataDoc;DataHoraCriacao;NumDoc;TotalDoc;HashAnterior"
 * 
 * Conforme Portaria 155/21 AGT — Requisitos de Software de Faturação.
 */
export const buildHashString = (input: InvoiceHashInput): string => {
    const total = input.grossTotal.toFixed(2);
    return [
        input.invoiceDate,
        input.createdAt,
        input.invoiceNumber,
        total,
        input.previousHash,
    ].join(';');
};

/**
 * Assina a string de hash com a chave privada RSA.
 * Retorna a assinatura em Base64 (para guardar na BD) e os 4 chars para impressão.
 */
export const signInvoice = async (
    hashInput: InvoiceHashInput,
    privateKeyBase64: string
): Promise<AgtSignatureResult> => {
    const hashString = buildHashString(hashInput);

    // Importar chave privada
    const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-1' } },
        false,
        ['sign']
    );

    // Assinar
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const signatureBuffer = await window.crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        data
    );

    const signatureBase64 = arrayBufferToBase64(signatureBuffer);
    const hashChars = extractHashChars(signatureBase64);

    return { hashString, signatureBase64, hashChars };
};

/**
 * Extrai os 4 caracteres do hash para impressão obrigatória na fatura.
 * Posições: 11, 21, 31, 41 da assinatura em Base64 (indexado a 0).
 */
export const extractHashChars = (signatureBase64: string): string => {
    return HASH_CHAR_POSITIONS
        .map(pos => signatureBase64[pos] ?? '0')
        .join('');
};

/**
 * Verifica a assinatura de uma fatura (para auditoria).
 */
export const verifyInvoiceSignature = async (
    hashString: string,
    signatureBase64: string,
    publicKeyBase64: string
): Promise<boolean> => {
    try {
        const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            publicKeyBuffer,
            { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-1' } },
            false,
            ['verify']
        );
        const encoder = new TextEncoder();
        return await window.crypto.subtle.verify(
            'RSASSA-PKCS1-v1_5',
            publicKey,
            base64ToArrayBuffer(signatureBase64),
            encoder.encode(hashString)
        );
    } catch {
        return false;
    }
};

/**
 * Exporta uma chave como ficheiro .pem para download.
 */
export const downloadPemFile = (pemContent: string, filename: string): void => {
    const blob = new Blob([pemContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

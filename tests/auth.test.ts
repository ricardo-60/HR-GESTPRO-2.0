import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataLayer, setForcedOffline } from '../lib/dataLayer';

// ==============================================================================
// MOCKS
// ==============================================================================

// Mock do supabase client
vi.mock('../lib/supabase', () => {
    return {
        supabase: {
            auth: {
                signInWithPassword: vi.fn().mockImplementation(async (credentials) => {
                    if (credentials.email === 'admin@empresa.com' && credentials.password === 'senha123') {
                        return {
                            data: {
                                session: {
                                    user: { id: 'user-id-123', email: credentials.email }
                                }
                            },
                            error: null
                        };
                    }
                    return { data: { session: null }, error: { message: 'Invalid credentials' } };
                })
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { id: 'user-id-123', tenant_id: 'tenant-123', role: 'admin' },
                            error: null
                        })
                    })
                })
            })
        },
        SUPABASE_URL: 'https://rzelexvouysvkejfwrbf.supabase.co',
        checkSupabaseConfig: vi.fn().mockReturnValue(true)
    };
});

// Mock do authHash para evitar dependência do Web Crypto API (não disponível em jsdom)
// Usamos btoa() em vez de Buffer.from() porque o jsdom não expõe Buffer do Node.js
vi.mock('../lib/authHash', () => {
    return {
        createPasswordHash: vi.fn().mockImplementation(async (password: string) => {
            // Simula a criação de hash: retorna valores consistentes baseados na password
            const fakeHash = btoa(`pbkdf2_hash_${password}`);
            const fakeSalt = btoa('salt_16');
            return { hash: fakeHash, salt: fakeSalt };
        }),
        verifyPassword: vi.fn().mockImplementation(async (password: string, storedHash: string) => {
            // Simula verificação: retorna true se a hash simulada corresponde
            // Ignoramos storedSalt porque o mock simula hash matching sem ele
            const expectedHash = btoa(`pbkdf2_hash_${password}`);
            return expectedHash === storedHash;
        }),
        generateOfflineSessionToken: vi.fn().mockReturnValue('mock_offline_session_token_abc123')
    };
});

// Mock do localDB
vi.mock('../lib/db/localDB', () => {
    return {
        localQuery: vi.fn().mockImplementation(async (sql: string, params: any[]) => {
            // Login offline - utilizador COM hash armazenado (credenciais offline válidas)
            if (sql.includes('user_profiles') && params[0] === 'offline@empresa.com') {
                // hash de 'senha123' simulada pelo mock do authHash
                const fakeHash = btoa('pbkdf2_hash_senha123');
                return [{
                    id: 'user-offline-123',
                    email: 'offline@empresa.com',
                    full_name: 'Usuário Offline',
                    password_hash: fakeHash,
                    password_salt: btoa('salt_16')
                }];
            }
            // Login offline - utilizador SEM hash (nunca fez login online)
            if (sql.includes('user_profiles') && params[0] === 'semhash@empresa.com') {
                return [{
                    id: 'user-nohash-456',
                    email: 'semhash@empresa.com',
                    full_name: 'Sem Hash',
                    password_hash: null,
                    password_salt: null
                }];
            }
            return [];
        }),
        localExecute: vi.fn().mockResolvedValue({ changes: 1 })
    };
});

// ==============================================================================
// TESTES
// ==============================================================================

describe('dataLayer.auth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setForcedOffline(false);
    });

    // --- ONLINE ---

    it('deve realizar login online com sucesso usando credenciais corretas', async () => {
        const credentials = { email: 'admin@empresa.com', password: 'senha123' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).toBeNull();
        expect(res.data.session).not.toBeNull();
        expect(res.data.session.user.email).toBe('admin@empresa.com');
    });

    it('deve retornar erro no login online com credenciais incorretas', async () => {
        const credentials = { email: 'admin@empresa.com', password: 'senha_errada' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).not.toBeNull();
        expect(res.error.message).toBe('Invalid credentials');
    });

    // --- OFFLINE (SEGURO - COM HASH PBKDF2) ---

    it('deve realizar login offline com sucesso quando a password corresponde ao hash armazenado', async () => {
        setForcedOffline(true);

        // 'senha123' corresponde ao hash simulado retornado pelo mock do localQuery
        const credentials = { email: 'offline@empresa.com', password: 'senha123' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).toBeNull();
        expect(res.data.session).not.toBeNull();
        expect(res.data.session.user.id).toBe('user-offline-123');
        expect(res.data.session.user.email).toBe('offline@empresa.com');
    });

    it('deve RECUSAR login offline quando a password NÃO corresponde ao hash', async () => {
        setForcedOffline(true);

        // Password diferente de 'senha123' — o hash simulado não corresponde
        const credentials = { email: 'offline@empresa.com', password: 'senha_errada' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).not.toBeNull();
        expect(res.error.message).toContain('Credenciais inválidas');
    });

    it('deve RECUSAR login offline quando o perfil não tem hash armazenado (nunca fez login online)', async () => {
        setForcedOffline(true);

        const credentials = { email: 'semhash@empresa.com', password: 'qualquer' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).not.toBeNull();
        expect(res.error.message).toContain('Autenticação offline não disponível');
        expect(res.error.message).toContain('Faça login com internet pelo menos uma vez');
    });

    it('deve retornar erro no login offline se o e-mail não existir localmente', async () => {
        setForcedOffline(true);

        const credentials = { email: 'nao_existe@empresa.com', password: 'senha' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).not.toBeNull();
        expect(res.error.message).toContain('Incapaz de autenticar offline');
    });

    // --- TRANSIÇÃO ONLINE→OFFLINE ---

    it('deve gerar e armazenar hash durante login online para uso offline futuro', async () => {
        setForcedOffline(false);

        const credentials = { email: 'admin@empresa.com', password: 'senha123' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).toBeNull();

        // Verificar que o mock do authHash.createPasswordHash foi chamado
        const { createPasswordHash } = await import('../lib/authHash');
        expect(createPasswordHash).toHaveBeenCalledWith('senha123');
    });
});

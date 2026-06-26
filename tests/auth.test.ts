import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataLayer, setForcedOffline } from '../lib/dataLayer';

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

// Mock do localDB
vi.mock('../lib/db/localDB', () => {
    return {
        localQuery: vi.fn().mockImplementation(async (sql, params) => {
            if (sql.includes('user_profiles') && params[0] === 'offline@empresa.com') {
                return [{ id: 'user-offline-123', email: 'offline@empresa.com', full_name: 'Usuário Offline' }];
            }
            return [];
        }),
        localExecute: vi.fn().mockResolvedValue({ changes: 1 })
    };
});

describe('dataLayer.auth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset da conectividade para Online por padrão nos testes
        // Como o dataLayer usa isOnline() internamente e este responde baseando-se no forcedOffline e navigator.onLine,
        // garantiremos que ele chame o Supabase.
        setForcedOffline(false);
    });

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

    it('deve realizar login offline com sucesso se o e-mail existir localmente', async () => {
        // Forçar modo offline
        setForcedOffline(true);

        const credentials = { email: 'offline@empresa.com', password: 'qualquer_senha' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).toBeNull();
        expect(res.data.session).not.toBeNull();
        expect(res.data.session.user.id).toBe('user-offline-123');
        expect(res.data.session.user.email).toBe('offline@empresa.com');
    });

    it('deve retornar erro no login offline se o e-mail não existir localmente', async () => {
        // Forçar modo offline
        setForcedOffline(true);

        const credentials = { email: 'nao_existe@empresa.com', password: 'senha' };
        const res = await dataLayer.auth.signInWithPassword(credentials);

        expect(res.error).not.toBeNull();
        expect(res.error.message).toContain('Incapaz de autenticar offline');
    });
});

import '@testing-library/jest-dom';

const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem(key: string) {
            return store[key] || null;
        },
        setItem(key: string, value: string) {
            store[key] = value;
        },
        removeItem(key: string) {
            delete store[key];
        },
        clear() {
            store = {};
        }
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
});

// Mock global do fetch para evitar warnings de localhost:3002 durante testes offlineSync/dataLayer
global.fetch = (async (url: string, options: any) => {
    return {
        ok: true,
        json: async () => ({ rows: [], changes: 1 })
    };
}) as any;

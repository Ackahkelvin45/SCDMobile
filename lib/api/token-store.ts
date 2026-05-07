export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: number;
  refreshTokenExpiresAt?: number;
};

type TokenListener = (tokens: AuthTokens | null) => void;
export type TokenStorageAdapter = {
  clearTokens: () => Promise<void>;
  getTokens: () => Promise<AuthTokens | null>;
  setTokens: (tokens: AuthTokens) => Promise<void>;
};

const inMemoryAdapter: TokenStorageAdapter = {
  async clearTokens() {
    return;
  },
  async getTokens() {
    return null;
  },
  async setTokens() {
    return;
  },
};

let currentTokens: AuthTokens | null = null;
let didHydrateTokens = false;
let storageAdapter: TokenStorageAdapter = inMemoryAdapter;
const listeners = new Set<TokenListener>();

function notifySubscribers(tokens: AuthTokens | null): void {
  listeners.forEach((listener) => {
    listener(tokens);
  });
}

async function hydrateTokensFromStorage(): Promise<void> {
  if (didHydrateTokens) {
    return;
  }

  currentTokens = await storageAdapter.getTokens();
  didHydrateTokens = true;
}

export const tokenStore = {
  configureAdapter(adapter: TokenStorageAdapter): void {
    storageAdapter = adapter;
    didHydrateTokens = false;
  },

  async getTokens(): Promise<AuthTokens | null> {
    await hydrateTokensFromStorage();
    return currentTokens;
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    currentTokens = { ...tokens };
    didHydrateTokens = true;
    await storageAdapter.setTokens(currentTokens);
    notifySubscribers(currentTokens);
  },

  async clearTokens(): Promise<void> {
    currentTokens = null;
    didHydrateTokens = true;
    await storageAdapter.clearTokens();
    notifySubscribers(null);
  },

  subscribe(listener: TokenListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

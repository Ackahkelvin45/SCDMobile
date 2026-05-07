import { useEffect, useState } from 'react';

import { AuthTokens, tokenStore } from '@/lib/api';

export function useAuthSession() {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    tokenStore.getTokens().then((currentTokens) => {
      if (!active) {
        return;
      }

      setTokens(currentTokens);
      setIsReady(true);
    });

    const unsubscribe = tokenStore.subscribe((nextTokens) => {
      setTokens(nextTokens);
      setIsReady(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    isAuthenticated: Boolean(tokens?.accessToken),
    isReady,
    tokens,
  };
}

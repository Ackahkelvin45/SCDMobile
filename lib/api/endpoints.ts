function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

export const API_ENDPOINTS = {
  auth: {
    register: withTrailingSlash('/auth/users'),
    login: withTrailingSlash('/auth/login'),
    refresh: withTrailingSlash('/auth/refresh'),
    me: withTrailingSlash('/auth/users/me'),
    logout: withTrailingSlash('/auth/logout'),
  },
  visits: {
    list:   withTrailingSlash('/visits'),
    latest: withTrailingSlash('/visits/latest'),
    trends: withTrailingSlash('/visits/trends'),
  },
  medications: {
    today: withTrailingSlash('/medications/today'),
    log:   withTrailingSlash('/medications/log'),
  },
  symptoms: {
    log: withTrailingSlash('/symptoms'),
  },
  ml: {
    huBaseline:        withTrailingSlash('/ml/hu-baseline'),
    predict:           withTrailingSlash('/ml/predict-hu-response'),
    latestPrediction:  withTrailingSlash('/ml/predictions/latest'),
  },
} as const;

// Paths follow docs/backend-api-requirements.md (v2) and multi-model-prediction.md (v2).
export const API_ENDPOINTS = {
  auth: {
    register: '/auth/users/',
    login: '/auth/login/',
    refresh: '/auth/refresh/',
    me: '/auth/users/me/',
    logout: '/auth/logout/',
    passwordChange: '/auth/password/change/',
    // ponytail: Django built-in reset page; confirm the path once the backend wires it up.
    passwordResetPage: '/accounts/password_reset/',
  },
  config: '/config/',
  facilities: '/facilities/',
  clinicians: '/clinicians/',
  flags: {
    list: '/flags/',
    acknowledge: (id: string) => `/flags/${id}/acknowledge/`,
  },
  patients: {
    list: '/patients/',
    detail: (id: string) => `/patients/${id}/`,
    baseline: (id: string) => `/patients/${id}/hu-baseline/`,
    baselineHistory: (id: string) => `/patients/${id}/hu-baseline/history/`,
    visits: (id: string) => `/patients/${id}/visits/`,
    trends: (id: string) => `/patients/${id}/trends/`,
    predictions: (id: string) => `/patients/${id}/predictions/`,
  },
  visits: {
    detail: (id: string) => `/visits/${id}/`,
    eligibility: (id: string) => `/visits/${id}/prediction-eligibility/`,
    predict: (id: string) => `/visits/${id}/predict/`,
  },
} as const;

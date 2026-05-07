export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  visits: {
    latest: ['visits', 'latest'] as const,
    list:   ['visits', 'list']   as const,
    trends: ['visits', 'trends'] as const,
  },
  medications: {
    today: ['medications', 'today'] as const,
  },
  ml: {
    baseline:         ['ml', 'baseline'] as const,
    latestPrediction: ['ml', 'latestPrediction'] as const,
  },
};

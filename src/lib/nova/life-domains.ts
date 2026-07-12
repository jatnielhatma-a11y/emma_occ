export type LifeDomain = 'finance' | 'home' | 'travel' | 'health' | 'learning';

export type LifeDomainCounts = Record<LifeDomain, number>;

export const emptyLifeDomainCounts: LifeDomainCounts = {
  finance: 0,
  home: 0,
  travel: 0,
  health: 0,
  learning: 0,
};

export function buildLifeDomainReadiness(counts: LifeDomainCounts) {
  const activeDomainCount = Object.values(counts).filter((count) => count > 0).length;
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return {
    activeDomainCount,
    totalRecords,
    allDomainsStarted: activeDomainCount === Object.keys(emptyLifeDomainCounts).length,
    recommendationStatus: totalRecords > 0 ? 'context-ready' : 'waiting-for-context',
  };
}

export function domainPrivacyNote(domain: LifeDomain) {
  switch (domain) {
    case 'finance':
      return 'Finance stores planning metadata only. No bank connection is active in Release 3.';
    case 'home':
      return 'Home records stay user-scoped and manually curated.';
    case 'travel':
      return 'Travel records do not alter Emma OCC commute planning in Release 3.';
    case 'health':
      return 'Health records are sensitive personal notes and are not medical advice.';
    case 'learning':
      return 'Learning records can support future recommendations after explicit review.';
  }
}

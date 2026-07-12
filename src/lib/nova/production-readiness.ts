export type ProductionGate =
  | 'test_suite'
  | 'build'
  | 'e2e'
  | 'security'
  | 'monitoring'
  | 'fallback_behavior'
  | 'notifications'
  | 'rollback'
  | 'privacy_controls'
  | 'mobile_pwa'
  | 'commute_accuracy';

export type ProductionReadinessRecord = {
  gate: ProductionGate;
  title: string;
  detail: string;
  status: 'passed' | 'attention' | 'blocked' | 'manual';
  severity: 'critical' | 'high' | 'medium' | 'low';
  stage: 'automated' | 'live' | 'manual';
  sourceFreshness: 'live' | 'recent' | 'fallback' | 'manual' | 'unavailable';
  evidenceRefs: string[];
};

export const emptyProductionGateCounts: Record<ProductionGate, number> = {
  test_suite: 0,
  build: 0,
  e2e: 0,
  security: 0,
  monitoring: 0,
  fallback_behavior: 0,
  notifications: 0,
  rollback: 0,
  privacy_controls: 0,
  mobile_pwa: 0,
  commute_accuracy: 0,
};

export function productionGateGuardrail(record: Pick<ProductionReadinessRecord, 'gate' | 'status' | 'severity' | 'stage'>) {
  if (record.status === 'blocked' && (record.severity === 'critical' || record.severity === 'high')) return 'release-blocker';
  if (record.gate === 'fallback_behavior' && record.status !== 'passed') return 'fallback-label-review-required';
  if (record.gate === 'notifications' && record.status !== 'passed') return 'notification-verification-required';
  if (record.gate === 'rollback' && record.status !== 'passed') return 'rollback-test-required';
  if (record.stage === 'manual' && record.status === 'manual') return 'manual-verification-required';
  if (record.status === 'attention') return 'watch-before-launch';
  return 'ready';
}

export function buildProductionReadinessSummary(records: ProductionReadinessRecord[]) {
  const counts = records.reduce(
    (next, record) => ({ ...next, [record.gate]: next[record.gate] + 1 }),
    { ...emptyProductionGateCounts }
  );
  const coveredGateCount = Object.values(counts).filter((count) => count > 0).length;
  const blockers = records.filter((record) => productionGateGuardrail(record) === 'release-blocker');
  const manualChecks = records.filter((record) => productionGateGuardrail(record).includes('required'));
  const criticalPassed = records.filter((record) => record.severity === 'critical').every((record) => record.status === 'passed');

  return {
    totalRecords: records.length,
    coveredGateCount,
    requiredGateCount: Object.keys(emptyProductionGateCounts).length,
    requiredGatesCovered: coveredGateCount === Object.keys(emptyProductionGateCounts).length,
    blockers: blockers.length,
    manualChecks: manualChecks.length,
    criticalPassed,
    launchStatus:
      blockers.length > 0
        ? 'blocked'
        : criticalPassed && manualChecks.length === 0
          ? 'launch-ready'
          : 'candidate-with-follow-up',
    counts,
  };
}

export function release6SeedRecords(): ProductionReadinessRecord[] {
  return [
    {
      gate: 'test_suite',
      title: 'Unit and integration tests',
      detail: 'The release gate requires npm test to pass before daily-use approval.',
      status: 'passed',
      severity: 'critical',
      stage: 'automated',
      sourceFreshness: 'recent',
      evidenceRefs: ['npm test'],
    },
    {
      gate: 'build',
      title: 'Production build',
      detail: 'The release gate requires npm run build to pass before launch.',
      status: 'passed',
      severity: 'critical',
      stage: 'automated',
      sourceFreshness: 'recent',
      evidenceRefs: ['npm run build'],
    },
    {
      gate: 'e2e',
      title: 'End-to-end production flows',
      detail: 'Critical flows must be verified before release.',
      status: 'passed',
      severity: 'critical',
      stage: 'automated',
      sourceFreshness: 'recent',
      evidenceRefs: ['end-to-end tests'],
    },
    {
      gate: 'security',
      title: 'Critical security review',
      detail: 'Dependency audit, OAuth scope review, token storage, and RLS coverage must have no critical blockers.',
      status: 'passed',
      severity: 'critical',
      stage: 'automated',
      sourceFreshness: 'recent',
      evidenceRefs: ['npm audit', 'RLS review'],
    },
    {
      gate: 'monitoring',
      title: 'Live integration monitoring',
      detail: 'Health surfaces must report live, degraded, fallback, and unavailable states.',
      status: 'attention',
      severity: 'high',
      stage: 'live',
      sourceFreshness: 'live',
      evidenceRefs: ['/api/health'],
    },
    {
      gate: 'fallback_behavior',
      title: 'Fallback labels',
      detail: 'Fallback and unavailable data must remain visibly labeled before influencing decisions.',
      status: 'passed',
      severity: 'critical',
      stage: 'automated',
      sourceFreshness: 'recent',
      evidenceRefs: ['fallback tests'],
    },
    {
      gate: 'notifications',
      title: 'Notification dedupe and cooldowns',
      detail: 'Duplicate alerts are suppressed and cooldowns reduce repeat notifications.',
      status: 'passed',
      severity: 'critical',
      stage: 'automated',
      sourceFreshness: 'recent',
      evidenceRefs: ['notification tests'],
    },
    {
      gate: 'rollback',
      title: 'Rollback and recovery',
      detail: 'Rollback, backup/recovery, and migration rollback procedures must be rehearsed before v1.0.',
      status: 'manual',
      severity: 'high',
      stage: 'manual',
      sourceFreshness: 'manual',
      evidenceRefs: ['Release 6 docs'],
    },
    {
      gate: 'privacy_controls',
      title: 'Privacy controls',
      detail: 'OAuth scopes, encrypted token storage, location-data deletion, and RLS ownership policies are reviewable.',
      status: 'passed',
      severity: 'critical',
      stage: 'automated',
      sourceFreshness: 'recent',
      evidenceRefs: ['privacy controls'],
    },
    {
      gate: 'mobile_pwa',
      title: 'Mobile and installed PWA behavior',
      detail: 'iPhone, Android, desktop, and installed PWA behavior are tracked as a manual release gate.',
      status: 'manual',
      severity: 'medium',
      stage: 'manual',
      sourceFreshness: 'manual',
      evidenceRefs: ['manifest', 'service worker'],
    },
    {
      gate: 'commute_accuracy',
      title: 'Planned-versus-actual commute accuracy',
      detail: 'Commute outcomes can be recorded without continuous GPS or silent duty changes.',
      status: 'manual',
      severity: 'medium',
      stage: 'manual',
      sourceFreshness: 'manual',
      evidenceRefs: ['commute accuracy records'],
    },
  ];
}

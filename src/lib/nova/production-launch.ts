export type LaunchCheck =
  | 'automated_tests'
  | 'production_build'
  | 'e2e_flows'
  | 'live_integration_health'
  | 'fallback_verification'
  | 'notification_verification'
  | 'security_review'
  | 'privacy_review'
  | 'rollback_rehearsal'
  | 'device_validation'
  | 'accessibility'
  | 'performance'
  | 'backup_recovery'
  | 'release_notes'
  | 'production_deployment';

export type LaunchCheckStatus = 'passed' | 'attention' | 'blocked' | 'manual';

export type LaunchCheckRecord = {
  check: LaunchCheck;
  title: string;
  detail: string;
  status: LaunchCheckStatus;
  critical: boolean;
  automated: boolean;
};

export const launchCheckList: LaunchCheck[] = [
  'automated_tests',
  'production_build',
  'e2e_flows',
  'live_integration_health',
  'fallback_verification',
  'notification_verification',
  'security_review',
  'privacy_review',
  'rollback_rehearsal',
  'device_validation',
  'accessibility',
  'performance',
  'backup_recovery',
  'release_notes',
  'production_deployment',
];

export function launchCheckGuardrail(record: Pick<LaunchCheckRecord, 'status' | 'critical' | 'automated'>) {
  if (record.status === 'blocked' && record.critical) return 'launch-blocker';
  if (record.status === 'manual') return 'manual-proof-required';
  if (record.status === 'attention') return 'watch-before-v1';
  if (record.status === 'blocked') return 'blocked-follow-up';
  return record.automated ? 'verified-automated' : 'verified-manual';
}

export function buildRelease7LaunchSummary(records: LaunchCheckRecord[]) {
  const covered = new Set(records.map((record) => record.check));
  const blockers = records.filter((record) => launchCheckGuardrail(record) === 'launch-blocker');
  const manualChecks = records.filter((record) => launchCheckGuardrail(record) === 'manual-proof-required');
  const warnings = records.filter((record) => launchCheckGuardrail(record) === 'watch-before-v1');
  const criticalPassed = records.filter((record) => record.critical).every((record) => record.status === 'passed');
  const productionLive = records.some((record) => record.check === 'production_deployment' && record.status === 'passed');
  const v1Ready = productionLive && blockers.length === 0 && manualChecks.length === 0 && warnings.length === 0 && criticalPassed;

  return {
    totalRecords: records.length,
    coveredCheckCount: covered.size,
    requiredCheckCount: launchCheckList.length,
    requiredChecksCovered: launchCheckList.every((check) => covered.has(check)),
    blockers: blockers.length,
    manualChecks: manualChecks.length,
    warnings: warnings.length,
    criticalPassed,
    productionLive,
    v1Ready,
    status: blockers.length > 0 ? 'blocked' : productionLive ? 'production-live-candidate' : 'ready-to-deploy',
  };
}

export function release7LaunchChecks(productionLive = false): LaunchCheckRecord[] {
  return [
    { check: 'automated_tests', title: 'Automated tests', detail: 'npm test must pass before release.', status: 'passed', critical: true, automated: true },
    { check: 'production_build', title: 'Production build', detail: 'npm run build must pass before release.', status: 'passed', critical: true, automated: true },
    { check: 'e2e_flows', title: 'End-to-end flows', detail: 'Operational flows must pass with fallback labels intact.', status: 'passed', critical: true, automated: true },
    { check: 'live_integration_health', title: 'Live integration health', detail: 'All live integrations must report real status and source freshness.', status: 'attention', critical: true, automated: true },
    { check: 'fallback_verification', title: 'Fallback verification', detail: 'Fallback data is clearly labeled and never presented as live.', status: 'passed', critical: true, automated: true },
    { check: 'notification_verification', title: 'Notification verification', detail: 'Duplicate notifications are suppressed with cooldowns.', status: 'passed', critical: true, automated: true },
    { check: 'security_review', title: 'Security review', detail: 'Critical security issues must be resolved before v1.0.', status: 'passed', critical: true, automated: true },
    { check: 'privacy_review', title: 'Privacy review', detail: 'OAuth scopes, encrypted tokens, RLS, and location deletion controls are reviewed.', status: 'passed', critical: true, automated: true },
    { check: 'rollback_rehearsal', title: 'Rollback rehearsal', detail: 'Rollback must be rehearsed and documented before final v1.0 approval.', status: 'manual', critical: true, automated: false },
    { check: 'device_validation', title: 'Device validation', detail: 'iPhone, Android, desktop, and installed PWA behavior require real-device proof.', status: 'manual', critical: false, automated: false },
    { check: 'accessibility', title: 'Accessibility testing', detail: 'Accessibility pass must be completed before final v1.0.', status: 'manual', critical: false, automated: false },
    { check: 'performance', title: 'Performance testing', detail: 'Performance and GPS battery impact require production-device observation.', status: 'manual', critical: false, automated: false },
    { check: 'backup_recovery', title: 'Backup and recovery', detail: 'Backup and recovery procedures must be proven before final v1.0.', status: 'manual', critical: true, automated: false },
    { check: 'release_notes', title: 'Release notes', detail: 'Versioning and release notes are documented for the production candidate.', status: 'passed', critical: false, automated: false },
    { check: 'production_deployment', title: 'Production deployment', detail: 'The production deployment is live and verified before final approval.', status: productionLive ? 'passed' : 'manual', critical: true, automated: false },
  ];
}

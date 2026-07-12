export type NovaReleaseId = 1 | 2 | 3 | 4 | 5 | 6;

export type NovaModuleStatus = 'active' | 'foundation' | 'planned';

export type NovaModule = {
  id: string;
  name: string;
  release: NovaReleaseId;
  status: NovaModuleStatus;
  preservesEmmaOcc?: boolean;
  summary: string;
  capabilities: string[];
  privacyNotes?: string[];
};

export type NovaRelease = {
  id: NovaReleaseId;
  name: string;
  title: string;
  status: 'active' | 'planned';
  goal: string;
  modules: NovaModule[];
};

export const novaReleases: NovaRelease[] = [
  {
    id: 1,
    name: 'Release 1',
    title: 'Foundation',
    status: 'active',
    goal: 'Preserve Emma OCC while establishing NOVA as a modular personal operating system.',
    modules: [
      {
        id: 'emma-occ',
        name: 'Emma OCC',
        release: 1,
        status: 'active',
        preservesEmmaOcc: true,
        summary: 'Operational control remains the active module for duties, commute readiness, roster awareness, weather, email attention, and alerts.',
        capabilities: [
          'Mission Control dashboard',
          'Google Calendar',
          'Gmail',
          'Google Maps',
          'NS',
          'Weather',
          'GPS and geofencing readiness',
          'Notifications',
        ],
        privacyNotes: ['Operational data must stay scoped to the authenticated user when Supabase-backed storage is enabled.'],
      },
      {
        id: 'provider-health-layer',
        name: 'Provider Health Layer',
        release: 1,
        status: 'foundation',
        summary: 'Every live integration exposes source state, fallback state, and recovery guidance before it influences operational decisions.',
        capabilities: ['Fallback labels', 'Source freshness', 'Provider status', 'Retry-ready boundaries'],
        privacyNotes: ['Fallback data is always labeled and must not be presented as live data.'],
      },
      {
        id: 'privacy-security-baseline',
        name: 'Privacy and Security Baseline',
        release: 1,
        status: 'foundation',
        summary: 'Release 1 keeps secrets server-side and delays durable personal memory until opt-in controls exist.',
        capabilities: ['Server-only secrets', 'Supabase architecture target', 'OpenAI Responses API architecture target', 'Memory opt-in gate'],
        privacyNotes: ['The memory engine remains planned until inspect, export, delete, and source-attribution controls are implemented.'],
      },
    ],
  },
  {
    id: 2,
    name: 'Release 2',
    title: 'Personal Core',
    status: 'active',
    goal: 'Add personal identity, memory, interests, goals, habits, relationships, and timeline.',
    modules: [
      {
        id: 'personal-identity',
        name: 'Personal Identity',
        release: 2,
        status: 'active',
        summary: 'User profile, family context, preferences, and durable identity signals.',
        capabilities: ['Personal profile', 'Family context', 'Preference graph'],
        privacyNotes: ['Identity data is user-scoped and editable before it informs recommendations.'],
      },
      {
        id: 'privacy-first-memory',
        name: 'Privacy-first Memory Engine',
        release: 2,
        status: 'foundation',
        summary: 'Opt-in, inspectable memory with source attribution, deletion, and scope controls.',
        capabilities: ['Memory consent', 'Memory review', 'Memory deletion', 'Source attribution', 'Memory disabled by default'],
        privacyNotes: ['Memory remains disabled until explicit consent is saved. AI-suggested memories need separate permission.'],
      },
      {
        id: 'life-graph',
        name: 'Interests, Goals, Habits, Relationships, Timeline',
        release: 2,
        status: 'active',
        summary: 'Personal planning records linked to daily operations without changing Emma OCC behavior.',
        capabilities: ['Interests', 'Goals', 'Habits', 'Relationships', 'Timeline'],
      },
    ],
  },
  {
    id: 3,
    name: 'Release 3',
    title: 'Life Domains',
    status: 'active',
    goal: 'Add finance, home, travel, health, and learning modules.',
    modules: [
      {
        id: 'finance-domain',
        name: 'Finance',
        release: 3,
        status: 'active',
        summary: 'Private financial planning records for budgets, obligations, subscriptions, savings, and reminders.',
        capabilities: ['Budgets', 'Financial obligations', 'Subscriptions', 'Savings goals'],
        privacyNotes: ['Release 3 stores planning metadata only. No bank connection is active.'],
      },
      {
        id: 'home-domain',
        name: 'Home',
        release: 3,
        status: 'active',
        summary: 'Home operations records for maintenance, household tasks, utilities, documents, and recurring responsibilities.',
        capabilities: ['Maintenance', 'Utilities', 'Household tasks', 'Home documents'],
      },
      {
        id: 'travel-domain',
        name: 'Travel',
        release: 3,
        status: 'active',
        summary: 'Travel planning records for trips, documents, reservations, packing, and mobility preferences.',
        capabilities: ['Trips', 'Reservations', 'Travel documents', 'Packing'],
        privacyNotes: ['Travel records do not change Emma OCC commute planning in Release 3.'],
      },
      {
        id: 'health-domain',
        name: 'Health',
        release: 3,
        status: 'active',
        summary: 'Wellbeing records for appointments, routines, medications, recovery, and personal health notes.',
        capabilities: ['Appointments', 'Medication notes', 'Routines', 'Recovery'],
        privacyNotes: ['Health records are sensitive notes and are not medical advice.'],
      },
      {
        id: 'learning-domain',
        name: 'Learning',
        release: 3,
        status: 'active',
        summary: 'Learning records for courses, skills, reading, certifications, and progress tracking.',
        capabilities: ['Courses', 'Skills', 'Reading', 'Certifications', 'Progress'],
      },
    ],
  },
  {
    id: 4,
    name: 'Release 4',
    title: 'Intelligence and Automation',
    status: 'active',
    goal: 'Add prediction, recommendations, context, automation, and daily AI.',
    modules: [
      {
        id: 'recommendation-engine',
        name: 'Prediction and Recommendations',
        release: 4,
        status: 'active',
        summary: 'Personalized recommendations with confidence labels and verified source context.',
        capabilities: ['Prediction', 'Recommendations', 'Confidence labels', 'Source attribution'],
        privacyNotes: ['Release 4 recommendations are advisory and must show source freshness before action.'],
      },
      {
        id: 'context-engine',
        name: 'Context Engine',
        release: 4,
        status: 'active',
        summary: 'Connects operational, personal-core, and life-domain signals into a reviewable context layer.',
        capabilities: ['Context signals', 'Source freshness', 'Fallback labeling'],
        privacyNotes: ['Context signals stay reviewable and user-scoped.'],
      },
      {
        id: 'automation-guardrails',
        name: 'Automation Guardrails',
        release: 4,
        status: 'foundation',
        summary: 'Automation is stored as disabled-by-default candidates that require confirmation before action.',
        capabilities: ['Automation candidates', 'Manual approval', 'No silent writes'],
        privacyNotes: ['NOVA cannot mutate calendar, commute, email, memory, or notification state without user confirmation.'],
      },
      {
        id: 'daily-ai-routines',
        name: 'Daily AI',
        release: 4,
        status: 'active',
        summary: 'Daily AI routines use verified JSON context with deterministic fallback.',
        capabilities: ['Daily brief', 'OpenAI Responses API', 'Deterministic fallback', 'Suppressed update tracking'],
        privacyNotes: ['OpenAI calls use store=false and verified JSON context only.'],
      },
    ],
  },
  {
    id: 5,
    name: 'Release 5',
    title: 'NOVA Intelligence',
    status: 'active',
    goal: 'Add multi-device sync, voice, vision, collaboration, developer platform, and NOVA intelligence.',
    modules: [
      {
        id: 'multi-device-sync',
        name: 'Multi-device Sync',
        release: 5,
        status: 'active',
        summary: 'Device-scoped sync readiness for phone, desktop, and installed PWA behavior.',
        capabilities: ['Multi-device sync', 'Device scopes', 'Sync freshness', 'Conflict-safe records'],
        privacyNotes: ['Sync can be disabled per capability and must respect local-only records.'],
      },
      {
        id: 'voice-interface',
        name: 'Voice',
        release: 5,
        status: 'foundation',
        summary: 'Consent-gated voice command readiness for daily assistant workflows.',
        capabilities: ['Voice', 'Explicit consent', 'Command review'],
        privacyNotes: ['Voice remains blocked until explicit consent is granted.'],
      },
      {
        id: 'vision-interface',
        name: 'Vision',
        release: 5,
        status: 'foundation',
        summary: 'Consent-gated image and document understanding readiness.',
        capabilities: ['Vision', 'Image review', 'Source attribution'],
        privacyNotes: ['Vision remains blocked until explicit consent is granted.'],
      },
      {
        id: 'collaboration-layer',
        name: 'Collaboration',
        release: 5,
        status: 'foundation',
        summary: 'Shared planning readiness with invite scopes and auditability.',
        capabilities: ['Collaboration', 'Invite scopes', 'Audit trail'],
        privacyNotes: ['Collaboration must be opt-in and scoped before sharing personal records.'],
      },
      {
        id: 'developer-platform',
        name: 'Developer Platform',
        release: 5,
        status: 'foundation',
        summary: 'Scoped extension readiness for future integrations and developer workflows.',
        capabilities: ['Developer platform', 'Scoped extensions', 'Permission boundaries'],
        privacyNotes: ['Developer records require developer-scoped privacy mode.'],
      },
      {
        id: 'nova-intelligence',
        name: 'NOVA Intelligence',
        release: 5,
        status: 'active',
        summary: 'Unified intelligence layer joining Emma OCC, personal core, life domains, and advisory AI.',
        capabilities: ['NOVA Intelligence', 'Multi-modal readiness', 'Privacy-first orchestration'],
        privacyNotes: ['NOVA Intelligence can recommend, but operational changes still require confirmation.'],
      },
    ],
  },
  {
    id: 6,
    name: 'Release 6',
    title: 'Production Readiness',
    status: 'active',
    goal: 'Harden NOVA for daily operational use with release gates, monitoring, rollback, privacy controls, and verified fallback behavior.',
    modules: [
      {
        id: 'production-release-gates',
        name: 'Production Release Gates',
        release: 6,
        status: 'active',
        summary: 'Tracks build, test, e2e, security, fallback, notification, and missed-duty safety gates before launch.',
        capabilities: ['Release checklist', 'Build gate', 'Test gate', 'E2E gate', 'Security gate', 'Missed-duty safety gate'],
        privacyNotes: ['Release evidence stores status labels and references, not secrets or raw personal data.'],
      },
      {
        id: 'production-monitoring',
        name: 'Monitoring and Health',
        release: 6,
        status: 'active',
        summary: 'Surfaces live integration health, source freshness, fallback labels, and operational status for daily use.',
        capabilities: ['Monitoring', 'Integration health', 'Source freshness', 'Fallback verification'],
        privacyNotes: ['Health reports must never include tokens, API keys, raw email bodies, or exact private location history.'],
      },
      {
        id: 'recovery-runbooks',
        name: 'Recovery Runbooks',
        release: 6,
        status: 'foundation',
        summary: 'Documents rollback, integration-failure response, backup/recovery, and database migration rollback procedures.',
        capabilities: ['Rollback', 'Backup and recovery', 'Runbooks', 'Migration rollback'],
        privacyNotes: ['Runbooks describe operational procedures without storing provider secrets.'],
      },
      {
        id: 'privacy-launch-controls',
        name: 'Privacy Launch Controls',
        release: 6,
        status: 'active',
        summary: 'Validates OAuth scopes, encrypted token storage, location deletion, RLS coverage, and data minimization before launch.',
        capabilities: ['OAuth scope review', 'Token storage review', 'Location-data deletion', 'Supabase RLS review', 'Privacy controls'],
        privacyNotes: ['Launch is blocked if private memory, location, or token controls are not reviewable and revocable.'],
      },
      {
        id: 'commute-accuracy-loop',
        name: 'Commute Accuracy Loop',
        release: 6,
        status: 'foundation',
        summary: 'Tracks planned-versus-actual commute outcomes so NOVA can improve warnings without silently changing duties.',
        capabilities: ['Planned-versus-actual commute accuracy', 'Delayed departure review', 'Missed-train review', 'Manual outcome labels'],
        privacyNotes: ['Accuracy records are user-owned, deletable, and do not require continuous background GPS.'],
      },
    ],
  },
];

export const requiredFoundationCapabilities = [
  'Mission Control dashboard',
  'Google Calendar',
  'Gmail',
  'Google Maps',
  'NS',
  'Weather',
  'GPS and geofencing readiness',
  'Notifications',
  'Supabase architecture target',
  'OpenAI Responses API architecture target',
];

export function activeNovaModules() {
  return novaReleases.flatMap((release) => release.modules).filter((module) => module.status !== 'planned');
}

export function plannedNovaModules() {
  return novaReleases.flatMap((release) => release.modules).filter((module) => module.status === 'planned');
}

export function missingFoundationCapabilities() {
  const covered = new Set(activeNovaModules().flatMap((module) => module.capabilities));
  return requiredFoundationCapabilities.filter((capability) => !covered.has(capability));
}

export function foundationSummary() {
  const missing = missingFoundationCapabilities();
  return {
    release: novaReleases[0],
    activeModules: activeNovaModules(),
    plannedModules: plannedNovaModules(),
    activeReleases: novaReleases.filter((release) => release.status === 'active'),
    futureReleases: novaReleases.filter((release) => release.status === 'planned'),
    emmaOccPreserved: activeNovaModules().some((module) => module.id === 'emma-occ' && module.preservesEmmaOcc),
    coveredCapabilityCount: requiredFoundationCapabilities.length - missing.length,
    requiredCapabilityCount: requiredFoundationCapabilities.length,
    missing,
  };
}

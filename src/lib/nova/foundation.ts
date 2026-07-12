export type NovaReleaseId = 1 | 2 | 3 | 4 | 5;

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
    status: 'planned',
    goal: 'Add finance, home, travel, health, and learning modules.',
    modules: [
      {
        id: 'life-domain-suite',
        name: 'Finance, Home, Travel, Health, Learning',
        release: 3,
        status: 'planned',
        summary: 'Personal life domains that feed recommendations only after explicit configuration.',
        capabilities: ['Finance', 'Home', 'Travel', 'Health', 'Learning'],
      },
    ],
  },
  {
    id: 4,
    name: 'Release 4',
    title: 'Intelligence and Automation',
    status: 'planned',
    goal: 'Add prediction, recommendations, context, automation, and daily AI.',
    modules: [
      {
        id: 'recommendation-engine',
        name: 'Prediction and Recommendations',
        release: 4,
        status: 'planned',
        summary: 'Personalized recommendations with confidence labels and verified source context.',
        capabilities: ['Prediction', 'Recommendations', 'Context', 'Automation', 'Daily AI'],
      },
    ],
  },
  {
    id: 5,
    name: 'Release 5',
    title: 'NOVA Intelligence',
    status: 'planned',
    goal: 'Add multi-device sync, voice, vision, collaboration, developer platform, and NOVA intelligence.',
    modules: [
      {
        id: 'nova-intelligence',
        name: 'NOVA Intelligence',
        release: 5,
        status: 'planned',
        summary: 'Multi-modal, collaborative, and extensible intelligence built on the privacy foundation.',
        capabilities: ['Multi-device sync', 'Voice', 'Vision', 'Collaboration', 'Developer platform', 'NOVA Intelligence'],
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

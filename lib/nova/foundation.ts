import {
  getActiveNovaModules,
  getMissingFoundationCapabilities,
  getPlannedNovaModules,
  NOVA_RELEASES,
  REQUIRED_FOUNDATION_CAPABILITIES
} from "./modules";

export function buildNovaFoundationSummary() {
  const activeModules = getActiveNovaModules();
  const plannedModules = getPlannedNovaModules();
  const missingCapabilities = getMissingFoundationCapabilities();

  return {
    release: NOVA_RELEASES[0],
    activeModules,
    plannedModules,
    requiredCapabilityCount: REQUIRED_FOUNDATION_CAPABILITIES.length,
    coveredCapabilityCount: REQUIRED_FOUNDATION_CAPABILITIES.length - missingCapabilities.length,
    missingCapabilities,
    emmaOccPreserved: activeModules.some((module) => module.id === "emma-occ" && module.preservesEmmaOcc),
    futureReleases: NOVA_RELEASES.filter((release) => release.id > 1)
  };
}

export function getFoundationReadinessLabel() {
  const summary = buildNovaFoundationSummary();
  if (!summary.emmaOccPreserved || summary.missingCapabilities.length > 0) return "Needs review";
  return "Foundation ready";
}

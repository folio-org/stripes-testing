import { PANE_REQUEST_PHASES } from '../constants';
import { PANE_REQUEST_PROFILES } from '../profiles';

const PHASES = new Set(Object.values(PANE_REQUEST_PHASES));

const uniqueRoutes = (routes) => {
  return routes.filter(
    (route, index, items) => items.findIndex(({ id }) => id === route.id) === index,
  );
};

export const getProfile = (pane) => {
  const profile = PANE_REQUEST_PROFILES[pane];

  if (!profile) throw new Error(`Unsupported pane request profile: ${pane}`);

  return profile;
};

export const assertPhase = (phase) => {
  if (!PHASES.has(phase)) throw new Error(`Unsupported pane request phase: ${phase}`);
};

export const getRoutes = (pane, phase, conditions = {}) => {
  assertPhase(phase);

  const profile = getProfile(pane);
  // Variants replace (rather than extend) the normal primary routes. This is
  // what lets ISBN conversion precede a list request that may never be sent.
  // Declaration order is intentional when more than one predicate can match.
  const variant =
    phase === PANE_REQUEST_PHASES.RESULTS &&
    profile.resultVariants?.find(({ when }) => when({ conditions }));

  return uniqueRoutes([...(variant?.routes || profile[phase] || [])]);
};

export const getResponseDependencies = (pane, phase) => {
  assertPhase(phase);

  return (
    getProfile(pane).responseDependencies?.filter(
      (dependency) => (dependency.phase || PANE_REQUEST_PHASES.RESULTS) === phase,
    ) || []
  );
};

export const getRegisteredRoutes = (pane, phase, conditions = {}) => {
  // Dependency aliases must exist before the trigger. Which dependencies are
  // required is knowable only after earlier responses arrive.
  return uniqueRoutes([
    ...getRoutes(pane, phase, conditions),
    ...getResponseDependencies(pane, phase).map(({ route }) => route),
  ]);
};

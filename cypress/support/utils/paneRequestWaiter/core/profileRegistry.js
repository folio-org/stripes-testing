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

export const getRoutes = (pane, phase) => {
  assertPhase(phase);

  return uniqueRoutes([...(getProfile(pane)[phase] || [])]);
};

export const getResponseDependencies = (pane, phase) => {
  assertPhase(phase);

  return (
    getProfile(pane).responseDependencies?.filter(
      (dependency) => (dependency.phase || PANE_REQUEST_PHASES.RESULTS) === phase,
    ) || []
  );
};

export const getRegisteredRoutes = (pane, phase) => {
  return uniqueRoutes([
    ...getRoutes(pane, phase),
    ...getResponseDependencies(pane, phase).map(({ route }) => route),
  ]);
};

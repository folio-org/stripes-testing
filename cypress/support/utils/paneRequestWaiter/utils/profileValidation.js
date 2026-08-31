import { PANE_REQUEST_PHASES } from '../constants';

const PHASES = Object.values(PANE_REQUEST_PHASES);
const HTTP_METHODS = new Set(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);

const assertRoute = (profileName, route) => {
  if (!route?.id || !route.pathname?.startsWith('/')) {
    throw new Error(`Invalid route in pane request profile: ${profileName}`);
  }

  if (!HTTP_METHODS.has(route.method)) {
    throw new Error(`Invalid method for ${profileName}.${route.id}: ${route.method}`);
  }

  if (route.matcher && typeof route.matcher !== 'function') {
    throw new Error(`Invalid matcher for ${profileName}.${route.id}`);
  }

  const invalidAcceptedStatus = route.acceptedErrorStatuses?.find(
    (status) => !Number.isInteger(status) || status < 400 || status > 599,
  );

  if (invalidAcceptedStatus) {
    throw new Error(`Invalid accepted error status for ${profileName}.${route.id}`);
  }
};

const assertUniqueRouteIds = (profileName, phase, routes) => {
  const routeIds = routes.map(({ id }) => id);
  const duplicateId = routeIds.find((id, index) => routeIds.indexOf(id) !== index);

  if (duplicateId) throw new Error(`Duplicate ${phase} route in ${profileName}: ${duplicateId}`);
};

const validateDependencies = (profileName, profile, phase) => {
  const dependencies = (profile.responseDependencies || []).filter(
    (dependency) => (dependency.phase || PANE_REQUEST_PHASES.RESULTS) === phase,
  );
  const variantRoutes =
    phase === PANE_REQUEST_PHASES.RESULTS
      ? (profile.resultVariants || []).flatMap(({ routes }) => routes)
      : [];
  const availableRouteIds = new Set(
    [...(profile[phase] || []), ...variantRoutes].map(({ id }) => id),
  );
  const initialRouteSets = [
    profile[phase] || [],
    ...(phase === PANE_REQUEST_PHASES.RESULTS
      ? (profile.resultVariants || []).map(({ routes }) => routes)
      : []),
  ].map((routes) => new Set(routes.map(({ id }) => id)));
  const dependencyRouteIds = new Set();

  dependencies.forEach((dependency) => {
    assertRoute(profileName, dependency.route);

    if (!Array.isArray(dependency.dependsOn) || typeof dependency.when !== 'function') {
      throw new Error(`Invalid response dependency in ${profileName}: ${dependency.route.id}`);
    }

    if (dependencyRouteIds.has(dependency.route.id)) {
      throw new Error(`Duplicate ${phase} dependency in ${profileName}: ${dependency.route.id}`);
    }

    const duplicatesInitialRoute = initialRouteSets.some((routeIds) => {
      return (
        routeIds.has(dependency.route.id) &&
        dependency.dependsOn.every((routeId) => routeIds.has(routeId))
      );
    });

    if (duplicatesInitialRoute) {
      throw new Error(`Duplicate ${phase} dependency in ${profileName}: ${dependency.route.id}`);
    }

    const unavailableRoute = dependency.dependsOn.find(
      (routeId) => !availableRouteIds.has(routeId),
    );

    if (unavailableRoute) {
      throw new Error(
        `Dependency ${profileName}.${dependency.route.id} must follow its route: ${unavailableRoute}`,
      );
    }

    if (dependency.requestCount && typeof dependency.requestCount !== 'function') {
      throw new Error(`Invalid requestCount in ${profileName}: ${dependency.route.id}`);
    }

    if (dependency.remember && typeof dependency.remember !== 'function') {
      throw new Error(`Invalid remember callback in ${profileName}: ${dependency.route.id}`);
    }

    availableRouteIds.add(dependency.route.id);
    dependencyRouteIds.add(dependency.route.id);
  });
};

/** Validates profiles once at module load so configuration errors fail early. */
export const validateProfiles = (profiles) => {
  Object.entries(profiles).forEach(([profileName, profile]) => {
    PHASES.forEach((phase) => {
      const routes = profile[phase] || [];

      routes.forEach((profileRoute) => assertRoute(profileName, profileRoute));
      assertUniqueRouteIds(profileName, phase, routes);
      if (phase === PANE_REQUEST_PHASES.RESULTS) {
        (profile.resultVariants || []).forEach((variant) => {
          if (
            typeof variant.when !== 'function' ||
            !Array.isArray(variant.routes) ||
            !variant.routes.length
          ) {
            throw new Error(`Invalid result variant in pane request profile: ${profileName}`);
          }
          variant.routes.forEach((profileRoute) => assertRoute(profileName, profileRoute));
          assertUniqueRouteIds(profileName, phase, variant.routes);
        });
      }
      validateDependencies(profileName, profile, phase);
    });
  });

  return profiles;
};

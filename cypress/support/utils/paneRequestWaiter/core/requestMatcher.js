/** Parses a Cypress or fetch request URL for profile matchers. */
export const requestDetails = (request, baseUrl) => {
  const url = new URL(request.url, baseUrl);

  return {
    url: url.href,
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
  };
};

/** Applies both the profile's built-in matcher and a caller-provided matcher. */
export const matchesRequest = (request, routeMatcher, customMatcher, baseUrl) => {
  const details = requestDetails(request, baseUrl);

  return (!routeMatcher || routeMatcher(details)) && (!customMatcher || customMatcher(details));
};

/** Returns the first route matching method, pathname, and optional predicates. */
export const findMatchingRoute = ({ request, routes, matchers = {}, baseUrl }) => {
  const details = requestDetails(request, baseUrl);

  return routes.find((candidate) => {
    return (
      candidate.method === request.method.toUpperCase() &&
      candidate.pathname === details.pathname &&
      matchesRequest(request, candidate.matcher, matchers[candidate.id], baseUrl)
    );
  });
};

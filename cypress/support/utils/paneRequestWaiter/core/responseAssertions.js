/** Whether a response is successful or has an explicitly accepted error status. */
export const isSuccessfulResponse = (response, route = {}) => {
  const acceptedErrorStatuses = route.acceptedErrorStatuses || [];

  return Boolean(
    response && (response.statusCode < 400 || acceptedErrorStatuses.includes(response.statusCode)),
  );
};

/** Throws when a tracked request has no response or an unexpected HTTP error. */
export const assertSuccessfulResponses = (interceptions, routes = []) => {
  const completedRequests = Array.isArray(interceptions) ? interceptions : [interceptions];

  completedRequests.forEach(({ request, response }, index) => {
    if (!isSuccessfulResponse(response, routes[index])) {
      const status = response?.statusCode || 'no response';
      throw new Error(`Pane request failed (${status}): ${request.url}`);
    }
  });

  return interceptions;
};

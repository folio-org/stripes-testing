/** Throws when any tracked request has no response or an HTTP error response. */
export const assertSuccessfulResponses = (interceptions) => {
  const completedRequests = Array.isArray(interceptions) ? interceptions : [interceptions];

  completedRequests.forEach(({ request, response }) => {
    if (!response || response.statusCode >= 400) {
      const status = response?.statusCode || 'no response';
      throw new Error(`Pane request failed (${status}): ${request.url}`);
    }
  });

  return interceptions;
};

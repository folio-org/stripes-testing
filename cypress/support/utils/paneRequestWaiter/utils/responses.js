const asInterceptions = (response) => {
  return Array.isArray(response) ? response : [response].filter(Boolean);
};

/** Returns records from every batch captured for a route. */
export const responseRecords = (responses, routeId, property) => {
  return asInterceptions(responses[routeId]).flatMap(
    (interception) => interception.response?.body?.[property] || [],
  );
};

export const orderRecords = (responses) => responseRecords(responses, 'orders', 'purchaseOrders');
export const orderLineRecords = (responses) => responseRecords(responses, 'orderLines', 'poLines');

export const hasOrderLineProperty = (responses, property) => {
  return orderLineRecords(responses).some((line) => line[property]);
};

export const hasOrderLineLocation = (responses) => {
  return orderLineRecords(responses).some(({ locations = [] }) => {
    return locations.some(({ locationId }) => locationId);
  });
};

export const hasOrderLineHolding = (responses) => {
  return orderLineRecords(responses).some(({ locations = [] }) => {
    return locations.some(({ holdingId }) => holdingId);
  });
};

export const hasLocalHoldingLocation = (responses) => {
  return responseRecords(responses, 'holdings', 'holdingsRecords').some(
    ({ permanentLocationId }) => permanentLocationId,
  );
};

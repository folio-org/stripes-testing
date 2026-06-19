Cypress.Commands.add('getItemRequestsApi', (searchParams) => {
  cy.okapiRequest({
    path: 'circulation/requests',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('requests', body.requests);
  });
});

Cypress.Commands.add('createItemRequestApi', (data) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'circulation/requests',
    body: data,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    Cypress.env('request', body);
    return body;
  });
});

Cypress.Commands.add('createPrintEventApi', (requestIds, requesterId, requesterName) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'circulation/print-events-entry',
    body: {
      requestIds,
      requesterId,
      requesterName,
      printEventDate: new Date().toISOString(),
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getCancellationReasonsApi', (searchParams) => {
  cy.okapiRequest({
    path: 'cancellation-reason-storage/cancellation-reasons',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('cancellationReasons', body.cancellationReasons);
    return body.cancellationReasons;
  });
});

Cypress.Commands.add('addCancellationReasonApi', (data) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'cancellation-reason-storage/cancellation-reasons',
    body: data,
  }).then(({ body }) => {
    Cypress.env('request', body);
    return body;
  });
});

Cypress.Commands.add('deleteCancellationReasonApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `cancellation-reason-storage/cancellation-reasons/${id}`,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('getCirculationSettingsByName', (name) => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: 'circulation/settings',
      searchParams: {
        query: `(name==${name})`,
      },
      failOnStatusCode: true,
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => {
      return body;
    });
});

Cypress.Commands.add('enablePrintEventLogFeature', () => {
  return cy.getCirculationSettingsByName('printEventLogFeature').then((body) => {
    const existing = (body.circulationSettings ?? [])[0];
    if (existing) {
      const wasEnabled = existing.value?.enablePrintLog === 'true';
      return cy
        .okapiRequest({
          method: 'PUT',
          path: `circulation/settings/${existing.id}`,
          body: { ...existing, value: { enablePrintLog: 'true' } },
          isDefaultSearchParamsRequired: false,
        })
        .then(() => ({ id: existing.id, wasCreated: false, wasEnabled }));
    }
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'circulation/settings',
        body: { name: 'printEventLogFeature', value: { enablePrintLog: 'true' } },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body: created }) => ({ id: created.id, wasCreated: true, wasEnabled: false }));
  });
});

Cypress.Commands.add('cleanupPrintEventLogFeature', ({ id, wasCreated, wasEnabled }) => {
  if (wasCreated) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `circulation/settings/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  }
  if (!wasEnabled) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `circulation/settings/${id}`,
      body: { id, name: 'printEventLogFeature', value: { enablePrintLog: 'false' } },
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  }
  return cy.wrap(null);
});

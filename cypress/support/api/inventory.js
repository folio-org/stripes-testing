import uuid from 'uuid';

const DEFAULT_INSTANCE = {
  source: 'FOLIO',
  discoverySuppress: false,
  staffSuppress: false,
  previouslyHeld: false,
};

Cypress.Commands.add('getLoanTypes', (searchParams) => {
  cy
    .okapiRequest({
      path: 'loan-types',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('loanTypes', body.loantypes);
    });
});

Cypress.Commands.add('getMaterialTypes', (searchParams) => {
  cy
    .okapiRequest({
      path: 'material-types',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('materialTypes', body.mtypes);
    });
});

Cypress.Commands.add('getLocations', (searchParams) => {
  cy
    .okapiRequest({
      path: 'locations',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('locations', body.locations);
    });
});

Cypress.Commands.add('getHoldingTypes', (searchParams) => {
  cy
    .okapiRequest({
      path: 'holdings-types',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('holdingsTypes', body.holdingsTypes);
    });
});

Cypress.Commands.add('getHoldingSources', (searchParams) => {
  cy
    .okapiRequest({
      path: 'holdings-sources',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('holdingSources', body.holdingsRecordsSources);
    });
});

Cypress.Commands.add('getInstanceTypes', (searchParams) => {
  cy
    .okapiRequest({
      path: 'instance-types',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('instanceTypes', body.instanceTypes);
    });
});

Cypress.Commands.add('createInstance', ({ instance, holdings = [], items = [] }) => {
  const instanceId = uuid();

  cy
    .okapiRequest({
      method: 'POST',
      path: 'inventory/instances',
      body: {
        ...DEFAULT_INSTANCE,
        id: instanceId,
        ...instance,
      }
    })
    .then(() => {
      cy
        .wrap(holdings)
        .each((holding, i) => cy.createHolding({
          holding: { ...holding, instanceId },
          items: items[i],
        }));
    });
});

Cypress.Commands.add('createHolding', ({ holding, items = [] }) => {
  const holdingId = uuid();

  cy
    .okapiRequest({
      method: 'POST',
      path: 'holdings-storage/holdings',
      body: {
        id: holdingId,
        ...holding,
      }
    })
    .then(() => {
      cy
        .wrap(items)
        .each(item => cy.createItem({ ...item, holdingsRecordId: holdingId }));
    });
});

Cypress.Commands.add('createItem', (item) => {
  const itemId = uuid();

  cy.okapiRequest({
    method: 'POST',
    path: 'inventory/items',
    body: {
      id: itemId,
      ...item,
    }
  });
});

Cypress.Commands.add('getItems', (searchParams) => {
  cy
    .okapiRequest({
      path: 'inventory/items',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('items', body.items);
    });
});

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
      return body.loantypes;
    });
});

// TODO: update tests where cypress env is still used
Cypress.Commands.add('getMaterialTypes', (searchParams) => {
  cy
    .okapiRequest({
      path: 'material-types',
      searchParams,
    })
    .then(response => {
      Cypress.env('materialTypes', response.body.mtypes);
      return response.body.mtypes[0];
    });
});

// TODO: update tests where cypress env is still used
Cypress.Commands.add('getLocations', (searchParams) => {
  cy
    .okapiRequest({
      path: 'locations',
      searchParams,
    })
    .then(response => {
      Cypress.env('locations', response.body.locations);
      return response.body.locations[0];
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
      return body.holdingsTypes;
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
      return body.holdingsRecordsSources;
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
      return body.instanceTypes;
    });
});

Cypress.Commands.add('getInstanceIdentifierTypes', (searchParams) => {
  cy
    .okapiRequest({
      path: 'identifier-types',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('identifierTypes', body.identifierTypes);
    });
});

Cypress.Commands.add('createInstance', ({ instance, holdings = [], items = [] }) => {
  const { instanceId = uuid() } = instance;
  delete instance.instanceId;
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
      cy.wrap(instanceId).as('instanceId');
    });
  return cy.get('@instanceId');
});

Cypress.Commands.add('createHolding', ({ holding, items = [] }) => {
  const { holdingId = uuid() } = holding;
  delete holding.holdingId;
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

Cypress.Commands.add('deleteHoldingRecord', (holdingsRecordId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `holdings-storage/holdings/${holdingsRecordId}`,
  });
});

Cypress.Commands.add('createItem', (item) => {
  const { itemId = uuid() } = item;
  delete item.itemId;
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
      return body.items[0];
    });
});

Cypress.Commands.add('deleteItem', (itemId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `inventory/items/${itemId}`,
  });
});

Cypress.Commands.add('getProductIdTypes', (searchParams) => {
  cy
    .okapiRequest({
      path: 'identifier-types',
      searchParams,
    })
    .then(response => {
      return response.body.identifierTypes[0];
    });
});

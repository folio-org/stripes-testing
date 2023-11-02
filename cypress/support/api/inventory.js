import uuid from 'uuid';
import { INSTANCE_SOURCE_NAMES } from '../constants';

const DEFAULT_INSTANCE = {
  source: INSTANCE_SOURCE_NAMES.FOLIO,
  discoverySuppress: false,
  staffSuppress: false,
  previouslyHeld: false,
};

Cypress.Commands.add('getInstanceById', (instanceId) => {
  return cy
    .okapiRequest({
      path: `inventory/instances/${instanceId}`,
    })
    .then(({ body }) => {
      return body;
    });
});

Cypress.Commands.add('createLoanType', (loanType) => {
  return cy
    .okapiRequest({
      path: 'loan-types',
      method: 'POST',
      body: loanType,
    })
    .then(({ body }) => {
      Cypress.env('loanTypes', body);
      return body;
    });
});

Cypress.Commands.add('getLoanTypes', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'loan-types',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('loanTypes', body.loantypes);
      return body.loantypes;
    });
});

Cypress.Commands.add('deleteLoanType', (loanId) => {
  return cy.okapiRequest({
    path: `loan-types/${loanId}`,
    method: 'DELETE',
  });
});
// TODO: update tests where cypress env is still used
// TODO: move to the related fragment
Cypress.Commands.add('getMaterialTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'material-types',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    Cypress.env('materialTypes', response.body.mtypes);
    return response.body.mtypes[0];
  });
});

// TODO: update tests where cypress env is still used
Cypress.Commands.add('getLocations', (searchParams) => {
  cy.okapiRequest({
    path: 'locations',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    Cypress.env('locations', response.body.locations);
    return response.body.locations[0];
  });
});

Cypress.Commands.add('getHoldingTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'holdings-types',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('holdingsTypes', body.holdingsTypes);
    return body.holdingsTypes;
  });
});

Cypress.Commands.add('getInstanceTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'instance-types',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('instanceTypes', body.instanceTypes);
    return body.instanceTypes;
  });
});

// TODO: move to related fragment
Cypress.Commands.add('createInstanceType', (specialInstanceType) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'instance-types',
    body: specialInstanceType,
  }).then(({ body }) => {
    Cypress.env('instanceTypes', body.instanceTypes);
    return body;
  });
});

Cypress.Commands.add('getInstanceIdentifierTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'identifier-types',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('identifierTypes', body.identifierTypes);
  });
});

// Depricated, use createFolioInstanceViaApi instead
Cypress.Commands.add('createInstance', ({ instance, holdings = [], items = [] }) => {
  const { instanceId = uuid() } = instance;

  delete instance.instanceId;

  const holdingIds = [];

  cy.okapiRequest({
    method: 'POST',
    path: 'inventory/instances',
    body: {
      ...DEFAULT_INSTANCE,
      id: instanceId,
      ...instance,
    },
  }).then(() => {
    cy.wrap(holdings)
      .each((holding, i) => cy.createHolding({
        holding: { ...holding, instanceId },
        items: items[i],
      }))
      .then((holdingId) => {
        holdingIds.push(holdingId);
      });
    cy.wrap(instanceId).as('instanceId');
  });
  return cy.get('@instanceId');
});

Cypress.Commands.add('updateInstance', (requestData) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `inventory/instances/${requestData.id}`,
    body: requestData,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
  return cy.get('@instanceId');
});

// Depricated, use createFolioInstanceViaApi instead
// TODO: move preparing of IDs from createFolioInstanceViaApi into createHolding
Cypress.Commands.add('createHolding', ({ holding, items = [] }) => {
  const { holdingId = uuid() } = holding;
  delete holding.holdingId;

  const itemIds = [];
  const holdingsIds = [];

  cy.okapiRequest({
    method: 'POST',
    path: 'holdings-storage/holdings',
    body: {
      id: holdingId,
      ...holding,
    },
  })
    .then(() => {
      cy.wrap(items).each((item) => cy
        .createItem({ ...item, holdingsRecordId: holdingId })
        .then((itemId) => itemIds.push(itemId)));
    })
    .then(() => {
      cy.wrap(holding).then((holdingsId) => holdingsIds.push(holdingsId));
    });
});

Cypress.Commands.add('getHoldings', (searchParams) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'holdings-storage/holdings',
    searchParams,
  }).then(({ body }) => {
    return body.holdingsRecords;
  });
});

Cypress.Commands.add('deleteHoldingRecordViaApi', (holdingsRecordId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `holdings-storage/holdings/${holdingsRecordId}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('updateHoldingRecord', (holdingsRecordId, newParams) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `holdings-storage/holdings/${holdingsRecordId}`,
    body: newParams,
  });
});

// Depricated, use createFolioInstanceViaApi instead
Cypress.Commands.add('createItem', (item) => {
  const { itemId = uuid() } = item;
  delete item.itemId;
  cy.okapiRequest({
    method: 'POST',
    path: 'inventory/items',
    body: {
      id: itemId,
      ...item,
    },
  }).then((res) => {
    return res;
  });
});

Cypress.Commands.add('getItems', (searchParams) => {
  cy.okapiRequest({
    path: 'inventory/items',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('items', body.items);
    return body.items[0];
  });
});

Cypress.Commands.add('updateItemViaApi', (item) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `inventory/items/${item.id}`,
    body: { ...item },
  }).then(({ body }) => body);
});

Cypress.Commands.add('deleteItemViaApi', (itemId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `inventory/items/${itemId}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getProductIdTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'identifier-types',
    searchParams,
  }).then((response) => {
    return response.body.identifierTypes[0];
  });
});

Cypress.Commands.add('getRecordDataInEditorViaApi', (holdingsID) => {
  cy.okapiRequest({
    method: 'GET',
    path: `records-editor/records?externalId=${holdingsID}`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => cy.wrap(body).as('body'));
  return cy.get('@body');
});

Cypress.Commands.add('getInstanceHRID', (instanceUUID) => {
  return cy
    .okapiRequest({
      path: `inventory/instances/${instanceUUID}`,
    })
    .then(({ body }) => {
      return body.hrid;
    });
});

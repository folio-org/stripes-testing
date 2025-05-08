import uuid from 'uuid';

Cypress.Commands.add('getAcqUnitsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'acquisitions-units/units',
    searchParams,
  });
});

Cypress.Commands.add(
  'createAcqUnitApi',
  (name, restrictions = { read: false, create: true, update: true, delete: true }) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'acquisitions-units/units',
      body: {
        id: uuid(),
        name,
        protectRead: restrictions.read,
        protectCreate: restrictions.create,
        protectUpdate: restrictions.update,
        protectDelete: restrictions.delete,
      },
      isDefaultSearchParams: false,
    });
  },
);

Cypress.Commands.add('deleteAcqUnitApi', (unitId) => {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `acquisitions-units/units/${unitId}`,
    isDefaultSearchParams: false,
  });
});

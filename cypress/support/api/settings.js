import uuid from 'uuid';

Cypress.Commands.add('createMaterialTypeApi', (materialType) => {
  const materialTypeId = uuid();

  cy.okapiRequest({
    method: 'POST',
    path: 'material-types',
    body: {
      id: materialTypeId,
      ...materialType,
    },
  });
});

Cypress.Commands.add('deleteMaterialTypeApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `material-types/${id}`,
  });
});

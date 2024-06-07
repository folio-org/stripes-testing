Cypress.Commands.add('getPermissions', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'perms/permissions?length=5',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getGobiSettings', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'gobi/orders/custom-mappings/ListedElectronicMonograph',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getTenantSettings', () => {
  const UpdatedUrl = encodeURI('service-points?query=cql.allRecords=1 sortby name&limit=2');
  cy.okapiRequest({
    method: 'GET',
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});

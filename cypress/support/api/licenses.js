Cypress.Commands.add('getLicensesByStatus', (status) => {
  const UpdatedUrl = encodeURI(
    `licenses/licenses?filters=status.value=${status}sort=name=asc&stats=true&perPage=100&offset=0`,
  );
  cy.okapiRequest({
    method: 'GET',
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getIdByName', (licenseName) => {
  const UpdatedUrl = encodeURI(
    `licenses/licenses?match=name&match=alternateNames.name&match=description&term=${licenseName}&filters=status.value%3D%3Dactive&sort=name%3Basc&stats=true&page=1&perPage=25`,
  );
  cy.okapiRequest({
    method: 'GET',
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('deleteLicenseById', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `licenses/licenses/${id}`,
    isDefaultSearchParamsRequired: false,
  });
});

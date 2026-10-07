Cypress.Commands.add('getTagsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'tags',
    searchParams,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('createTagApi', (tag) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'tags',
    body: {
      ...tag,
    },
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    return response.body.id;
  });
});

Cypress.Commands.add('deleteTagApi', (tagId, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `tags/${tagId}`,
    failOnStatusCode: !ignoreErrors,
    isDefaultSearchParamsRequired: false,
  });
});

// Sets tags on an eHoldings resource ("title+package") or package directly via API.
// Pass `isPackage: true` with the package's own id to tag the package itself instead.
Cypress.Commands.add(
  'addTagsToEHoldingsEntityApi',
  ({ entityId, entityName, tags, isPackage = false } = {}) => {
    return cy.okapiRequest({
      method: 'PUT',
      path: `eholdings/${isPackage ? 'packages' : 'resources'}/${entityId}/tags`,
      body: {
        data: {
          type: 'tags',
          attributes: {
            name: entityName,
            tags: { tagList: tags },
          },
        },
      },
      contentTypeHeader: 'application/vnd.api+json',
      isDefaultSearchParamsRequired: false,
    });
  },
);

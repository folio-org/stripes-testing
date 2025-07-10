import { REQUEST_METHOD } from '../constants';

Cypress.Commands.add('getSpecificatoinIds', () => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'specification-storage/specifications',
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    return response.body.specifications;
  });
});

Cypress.Commands.add('syncSpecifications', (specificationId) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: `specification-storage/specifications/${specificationId}/sync`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('checkSpecificationStorageApi', () => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'specification-storage/specifications',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('deleteSpecificationField', (fieldId, failOnStatusCode = true) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `specification-storage/fields/${fieldId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode,
  });
});

Cypress.Commands.add('getSpecificationFields', (specificationId) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: `specification-storage/specifications/${specificationId}/fields`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add(
  'deleteSpecificationFieldByTag',
  (specificationId, tagValue, failOnStatusCode = true) => {
    return cy.getSpecificationFields(specificationId).then((response) => {
      const field = response.body.fields.find((f) => f.tag === tagValue);
      if (field) {
        return cy.deleteSpecificationField(field.id, failOnStatusCode);
      }
      return cy.wrap(null);
    });
  },
);

Cypress.Commands.add('createSpecificationField', (specificationId, field) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: `specification-storage/specifications/${specificationId}/fields`,
    isDefaultSearchParamsRequired: false,
    body: field,
  });
});

Cypress.Commands.add('updateSpecificationField', (fieldId, field, failOnStatusCode = true) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.PUT,
    path: `specification-storage/fields/${fieldId}`,
    isDefaultSearchParamsRequired: false,
    body: field,
    failOnStatusCode,
  });
});

Cypress.Commands.add('createSpecificationFieldSubfield', (fieldId, subfield) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: `specification-storage/fields/${fieldId}/subfields`,
    isDefaultSearchParamsRequired: false,
    body: subfield,
  });
});

Cypress.Commands.add('getSpecificationFieldSubfields', (fieldId) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: `specification-storage/fields/${fieldId}/subfields`,
    isDefaultSearchParamsRequired: false,
  });
});

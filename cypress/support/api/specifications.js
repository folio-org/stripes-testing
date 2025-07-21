import { REQUEST_METHOD } from '../constants';

Cypress.Commands.add('getSpecificatoinIds', (searchParams) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'specification-storage/specifications',
    isDefaultSearchParamsRequired: false,
    searchParams,
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

Cypress.Commands.add(
  'createSpecificationFieldSubfield',
  (fieldId, subfield, failOnStatusCode = true) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: `specification-storage/fields/${fieldId}/subfields`,
      isDefaultSearchParamsRequired: false,
      body: subfield,
      failOnStatusCode,
    });
  },
);

Cypress.Commands.add('getSpecificationFieldSubfields', (fieldId) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: `specification-storage/fields/${fieldId}/subfields`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('deleteSpecificationFieldSubfield', (subfieldId, failOnStatusCode = true) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `specification-storage/subfields/${subfieldId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode,
  });
});

Cypress.Commands.add(
  'updateSpecificationSubfield',
  (subfieldId, subfield, failOnStatusCode = true) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.PUT,
      path: `specification-storage/subfields/${subfieldId}`,
      isDefaultSearchParamsRequired: false,
      body: subfield,
      failOnStatusCode,
    });
  },
);

Cypress.Commands.add('getSpecificationFieldIndicators', (fieldId) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: `specification-storage/fields/${fieldId}/indicators`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add(
  'createSpecificationFieldIndicator',
  (fieldId, indicator, failOnStatusCode = true) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: `specification-storage/fields/${fieldId}/indicators`,
      isDefaultSearchParamsRequired: false,
      body: indicator,
      failOnStatusCode,
    });
  },
);

Cypress.Commands.add(
  'updateSpecificationFieldIndicator',
  (indicatorId, indicator, failOnStatusCode = true) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.PUT,
      path: `specification-storage/indicators/${indicatorId}`,
      isDefaultSearchParamsRequired: false,
      body: indicator,
      failOnStatusCode,
    });
  },
);

Cypress.Commands.add('getSpecificationIndicatorCodes', (indicatorId) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: `specification-storage/indicators/${indicatorId}/indicator-codes`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add(
  'createSpecificationIndicatorCode',
  (indicatorId, indicatorCode, failOnStatusCode = true) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: `specification-storage/indicators/${indicatorId}/indicator-codes`,
      isDefaultSearchParamsRequired: false,
      body: indicatorCode,
      failOnStatusCode,
    });
  },
);

Cypress.Commands.add(
  'updateSpecificationIndicatorCode',
  (indicatorCodeId, indicatorCode, failOnStatusCode = true) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.PUT,
      path: `specification-storage/indicator-codes/${indicatorCodeId}`,
      isDefaultSearchParamsRequired: false,
      body: indicatorCode,
      failOnStatusCode,
    });
  },
);

Cypress.Commands.add(
  'deleteSpecificationIndicatorCode',
  (indicatorCodeId, failOnStatusCode = true) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `specification-storage/indicator-codes/${indicatorCodeId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode,
    });
  },
);

Cypress.Commands.add('getSpecificatoinRules', (specificationId) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: `specification-storage/specifications/${specificationId}/rules`,
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    return response.body.rules;
  });
});

Cypress.Commands.add('updateSpecificatoinRule', (specificationId, specificationRuleId, body) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.PATCH,
    path: `specification-storage/specifications/${specificationId}/rules/${specificationRuleId}`,
    isDefaultSearchParamsRequired: false,
    body,
  });
});

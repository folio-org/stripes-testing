import { CUSTOM_FIELD_ENTITY_TYPES } from '../constants/constants';

Cypress.Commands.add('getCustomFieldsViaApi', (entityType = CUSTOM_FIELD_ENTITY_TYPES.USER) => {
  let moduleVersionPromise;

  if (entityType === CUSTOM_FIELD_ENTITY_TYPES.USER) {
    moduleVersionPromise = cy.getModUsersVersion();
  }

  return moduleVersionPromise.then((modVersion) => {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'custom-fields?limit=2147483647',
        isDefaultSearchParamsRequired: false,
        additionalHeaders: { 'x-okapi-module-id': modVersion },
      })
      .then((response) => {
        return response.body;
      });
  });
});

Cypress.Commands.add(
  'updateCustomFieldsViaApi',
  (customFields, entityType = CUSTOM_FIELD_ENTITY_TYPES.USER) => {
    let moduleVersionPromise;

    if (entityType === CUSTOM_FIELD_ENTITY_TYPES.USER) {
      moduleVersionPromise = cy.getModUsersVersion();
    }

    return cy.getCustomFieldsViaApi().then((response) => {
      return moduleVersionPromise.then((modVersion) => {
        return cy.okapiRequest({
          path: 'custom-fields',
          method: 'PUT',
          body: {
            customFields: response.customFields.concat(customFields),
            entityType,
          },
          isDefaultSearchParamsRequired: false,
          additionalHeaders: { 'x-okapi-module-id': modVersion },
        });
      });
    });
  },
);

Cypress.Commands.add(
  'createCustomFieldsViaApi',
  (customFields, entityType = CUSTOM_FIELD_ENTITY_TYPES.USER) => {
    let moduleVersionPromise;

    if (entityType === CUSTOM_FIELD_ENTITY_TYPES.USER) {
      moduleVersionPromise = cy.getModUsersVersion();
    }

    return cy.getCustomFieldsViaApi().then((response) => {
      return moduleVersionPromise.then((modVersion) => {
        const createdCustomFields = [];

        return cy
          .wrap(customFields)
          .each((customField, index) => {
            return cy
              .okapiRequest({
                path: 'custom-fields',
                method: 'POST',
                body: {
                  isRepeatable: false,
                  order: response.customFields.length + index + 1,
                  ...customField,
                },
                isDefaultSearchParamsRequired: false,
                additionalHeaders: { 'x-okapi-module-id': modVersion },
              })
              .then(({ body }) => {
                createdCustomFields.push(body);
              });
          })
          .then(() => createdCustomFields);
      });
    });
  },
);

Cypress.Commands.add(
  'deleteCustomFieldsViaApi',
  ({ ids, entityType = CUSTOM_FIELD_ENTITY_TYPES.USER }) => {
    let moduleVersionPromise;

    if (entityType === CUSTOM_FIELD_ENTITY_TYPES.USER) {
      moduleVersionPromise = cy.getModUsersVersion();
    }
    return moduleVersionPromise.then((modVersion) => {
      return cy.wrap(ids).each((id) => {
        return cy.okapiRequest({
          path: `custom-fields/${id}`,
          method: 'DELETE',
          isDefaultSearchParamsRequired: false,
          additionalHeaders: { 'x-okapi-module-id': modVersion },
        });
      });
    });
  },
);

import { CUSTOM_FIELD_ENTITY_TYPES } from '../constants/constants';

Cypress.Commands.add('getCustomFieldsViaApi', (entityType = CUSTOM_FIELD_ENTITY_TYPES.USER) => {
  let moduleVersionPromise;

  if (entityType === CUSTOM_FIELD_ENTITY_TYPES.USER) {
    moduleVersionPromise = cy.getModUsersVersion();
  } else if (
    entityType === CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER ||
    entityType === CUSTOM_FIELD_ENTITY_TYPES.PO_LINE
  ) {
    moduleVersionPromise = cy.getModOrdersStorageVersion();
  }

  return moduleVersionPromise.then((modVersion) => {
    // Build query parameters with entityType filter
    const queryParams = `limit=2147483647&query=${encodeURIComponent(`entityType==${entityType}`)}`;

    return cy
      .okapiRequest({
        method: 'GET',
        path: `custom-fields?${queryParams}`,
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
    } else if (
      entityType === CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER ||
      entityType === CUSTOM_FIELD_ENTITY_TYPES.PO_LINE
    ) {
      moduleVersionPromise = cy.getModOrdersStorageVersion();
    }

    return cy.getCustomFieldsViaApi(entityType).then((response) => {
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
    } else if (
      entityType === CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER ||
      entityType === CUSTOM_FIELD_ENTITY_TYPES.PO_LINE
    ) {
      moduleVersionPromise = cy.getModOrdersStorageVersion();
    }

    return cy.getCustomFieldsViaApi(entityType).then((response) => {
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
  'replaceCustomFieldViaApi',
  (updatedCustomField, entityType = CUSTOM_FIELD_ENTITY_TYPES.USER) => {
    let moduleVersionPromise;

    if (entityType === CUSTOM_FIELD_ENTITY_TYPES.USER) {
      moduleVersionPromise = cy.getModUsersVersion();
    } else if (
      entityType === CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER ||
      entityType === CUSTOM_FIELD_ENTITY_TYPES.PO_LINE
    ) {
      moduleVersionPromise = cy.getModOrdersStorageVersion();
    }

    // Use CQL query to filter by entityType
    const query = `entityType==${entityType}`;

    return cy.getCustomFieldsViaApi(entityType, query).then((response) => {
      return moduleVersionPromise.then((modVersion) => {
        const updatedFields = response.customFields.map((f) => {
          return f.id === updatedCustomField.id ? updatedCustomField : f;
        });

        return cy.okapiRequest({
          path: 'custom-fields',
          method: 'PUT',
          body: {
            customFields: updatedFields,
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
  'deleteCustomFieldsViaApi',
  ({ ids, entityType = CUSTOM_FIELD_ENTITY_TYPES.USER }) => {
    let moduleVersionPromise;

    if (entityType === CUSTOM_FIELD_ENTITY_TYPES.USER) {
      moduleVersionPromise = cy.getModUsersVersion();
    } else if (
      entityType === CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER ||
      entityType === CUSTOM_FIELD_ENTITY_TYPES.PO_LINE
    ) {
      moduleVersionPromise = cy.getModOrdersStorageVersion();
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

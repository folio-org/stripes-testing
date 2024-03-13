import getRandomPostfix, { getRandomLetters } from '../utils/stringTools';

Cypress.Commands.add('getAuthorityHeadingsUpdatesViaAPI', (startDate, endDate, limit = '100') => {
  cy.okapiRequest({
    method: 'GET',
    path: 'links/stats/authority',
    searchParams: {
      action: 'UPDATE_HEADING',
      fromDate: `${startDate}T00:00:00.000Z`,
      toDate: `${endDate}T23:59:59.000Z`,
      limit,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.stats;
  });
});

Cypress.Commands.add('getAuthoritySourceFileIdViaAPI', (authorityFileName) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'authority-source-files',
    searchParams: {
      query: `name="${authorityFileName}"`,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.authoritySourceFiles[0].id;
  });
});

Cypress.Commands.add(
  'createAuthoritySourceFileUsingAPI',
  (prefix, startWithNumber, sourceName, isActive = true, sourceType = 'Local', baseURL = null) => {
    cy.okapiRequest({
      method: 'POST',
      path: 'authority-source-files',
      body: {
        baseUrl: baseURL,
        code: prefix,
        hridManagement: {
          startNumber: startWithNumber,
        },
        name: sourceName,
        selectable: isActive,
        source: sourceType,
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => body.id);
  },
);

Cypress.Commands.add('deleteAuthoritySourceFileViaAPI', (id, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `authority-source-files/${id}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  }).then(({ status }) => {
    return status;
  });
});

Cypress.Commands.add(
  'createAuthoritySourceFileViaAPI',
  ({
    name = `Test auth source file ${getRandomPostfix()}`,
    code = getRandomLetters(8),
    type = 'Test',
    baseUrl = `http://id.loc.gov/authorities/${getRandomLetters(8)}/`,
  } = {}) => {
    cy.okapiRequest({
      method: 'POST',
      path: 'authority-source-files',
      body: {
        name,
        code,
        type,
        baseUrl,
        source: 'local',
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      cy.wrap(body).as('body');
    });
    return cy.get('@body');
  },
);

import { recurse } from 'cypress-recurse';
import getRandomPostfix, { getRandomLetters } from '../utils/stringTools';
import { REQUEST_METHOD } from '../constants';

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

Cypress.Commands.add('getAuthoritySourceFileDataViaAPI', (authorityFileName) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'authority-source-files',
    searchParams: {
      query: `name="${authorityFileName}"`,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    Cypress.env('authoritySourceFiles', body.authoritySourceFiles);
    return cy.wrap(body.authoritySourceFiles[0]);
  });
});

Cypress.Commands.add('getAuthoritySourceFileDataByIdViaAPI', (authorityFileId) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: `authority-source-files/${authorityFileId}`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add(
  'createAuthoritySourceFileUsingAPI',
  (
    prefix,
    startWithNumber,
    sourceName,
    isActive = true,
    baseURL = null,
    ignoreErrors = false,
    sourceType = 'Local',
  ) => {
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
      failOnStatusCode: !ignoreErrors,
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
  'setActiveAuthoritySourceFileViaAPI',
  (authorityFileId, version, isActive = true) => {
    cy.okapiRequest({
      method: REQUEST_METHOD.PATCH,
      path: `authority-source-files/${authorityFileId}`,
      body: {
        id: authorityFileId,
        selectable: isActive,
        _version: version,
      },
      isDefaultSearchParamsRequired: false,
    });
  },
);

Cypress.Commands.add(
  'updateBaseUrlInAuthoritySourceFileViaAPI',
  (authorityFileId, version, newBaseUrl) => {
    cy.okapiRequest({
      method: REQUEST_METHOD.PATCH,
      path: `authority-source-files/${authorityFileId}`,
      body: {
        id: authorityFileId,
        baseUrl: newBaseUrl,
        _version: version,
      },
      isDefaultSearchParamsRequired: false,
    });
  },
);

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
      // wait for source file to be fully created on back-end side
      cy.wait(2000);
    });
    return cy.get('@body');
  },
);

Cypress.Commands.add('createMarcAuthorityViaAPI', (LDR, fields) => {
  cy.okapiRequest({
    path: 'records-editor/records',
    method: 'POST',
    isDefaultSearchParamsRequired: false,
    body: {
      _actionType: 'create',
      leader: LDR,
      fields,
      suppressDiscovery: false,
      marcFormat: 'AUTHORITY',
    },
  }).then(({ body }) => {
    recurse(
      () => {
        return cy.okapiRequest({
          method: 'GET',
          path: `records-editor/records/status?qmRecordId=${body.qmRecordId}`,
          isDefaultSearchParamsRequired: false,
        });
      },
      (response) => response.body.status === 'CREATED',
      {
        limit: 10,
        timeout: 80000,
        delay: 5000,
      },
    ).then((response) => {
      cy.wrap(response.body.externalId).as('createdMarcAuthorityId');

      return cy.get('@createdMarcAuthorityId');
    });
  });
});

Cypress.Commands.add('getAuthoritiesCountViaAPI', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'authority-storage/authorities?limit=1',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.totalRecords;
  });
});

Cypress.Commands.add('getSrsRecordsByAuthorityId', (instanceId) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: `source-storage/records/${instanceId}/formatted`,
    searchParams: {
      idType: 'AUTHORITY',
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

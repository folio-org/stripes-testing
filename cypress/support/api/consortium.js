import {
  PUBLISH_COORDINATOR_SHARE_DETAILS_KEYS,
  REQUEST_METHOD,
} from '../constants';
import { ConsortiumUtils } from '../utils';

Cypress.Commands.add('getConsortiaId', (options = {}) => {
  const { force = false } = options;
  const cached = Cypress.env('activeConsortiumId');

  /*
    Consortium ID is required for most of the API calls related to consortia, so caching it will significantly reduce the number of API calls and speed up the tests.
   */
  if (cached && !force) {
    return cy.wrap(cached);
  }

  return cy.okapiRequest({
    method: 'GET',
    path: 'consortia',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    const consortiumId = body.consortia[0].id;

    Cypress.env('activeConsortiumId', consortiumId);

    return consortiumId;
  });
});

Cypress.Commands.add('assignAffiliationToUser', (affiliationTenantId, targetUserId) => {
  cy.wait(15000);
  cy.getConsortiaId().then((consortiaId) => {
    cy.waitForPrimaryAffiliationSetup(consortiaId, targetUserId);
    cy.okapiRequest({
      method: 'POST',
      path: `consortia/${consortiaId}/user-tenants`,
      body: {
        tenantId: affiliationTenantId,
        userId: targetUserId,
      },
      isDefaultSearchParamsRequired: false,
    });
  });
});

Cypress.Commands.add('removeAffiliationFromUser', (tenantId, targetUserId) => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `consortia/${consortiaId}/user-tenants`,
      searchParams: {
        tenantId,
        userId: targetUserId,
      },
      isDefaultSearchParamsRequired: false,
    });
  });
});

Cypress.Commands.add('affiliateUserToTenant', ({ tenantId, userId, permissions }) => {
  cy.resetTenant();
  cy.assignAffiliationToUser(tenantId, userId);
  cy.setTenant(tenantId);
  cy.assignPermissionsToExistingUser(userId, permissions);
  cy.resetTenant();
});

/*
  Before using the command, please look at the Publish Coordinator API commands, listed below in this file.
  In most cases it's better to use sendPublishCoordinatorPublication command, which will send publication request and wait until publication is completed before returning results.
 */
Cypress.Commands.add('getPublications', (publicationForTenants, publicationUrl) => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: `consortia/${consortiaId}/publications`,
      body: {
        method: REQUEST_METHOD.GET,
        tenants: publicationForTenants,
        url: publicationUrl,
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.id;
    });
  });
});

Cypress.Commands.add('getUserAffiliationsCount', () => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'GET',
      path: `consortia/${consortiaId}/_self`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.totalRecords;
    });
  });
});

Cypress.Commands.add('getUserTenants', () => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'GET',
      path: `consortia/${consortiaId}/_self`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.userTenants;
    });
  });
});

Cypress.Commands.add('waitForPrimaryAffiliationSetup', (consortiaId, targetUserId) => {
  cy.recurse(
    () => {
      return cy.okapiRequest({
        path: `consortia/${consortiaId}/user-tenants`,
        searchParams: {
          userId: targetUserId,
          limit: 50,
        },
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
      });
    },
    (response) => {
      return response.body.userTenants?.some((el) => el.isPrimary === true) ?? false;
    },
    {
      limit: 20,
      timeout: 40000,
      delay: 1000,
    },
  );
});

Cypress.Commands.add('getAllTenants', () => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'GET',
      path: `consortia/${consortiaId}/tenants`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.tenants;
    });
  });
});

/* <---------- Publications API ----------> */
/*
  Raw API. Initiate publish coordinator request and return ID of publication and it's status.
  https://s3.amazonaws.com/foliodocs/api/mod-consortia/s/publications.html#operation/publishRequests
 */
Cypress.Commands.add('initPublishCoordinatorRequest', (publication) => {
  const {
    method,
    payload,
    tenants,
    url,
  } = publication;

  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: `consortia/${consortiaId}/publications`,
      body: {
        method,
        payload,
        tenants,
        url: url.startsWith('/') ? url : `/${url}`,
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return {
        id: body.id,
        status: body.status,
      };
    });
  });
});

/*
  Raw API. Initialize share setting publication for specific setting and return publication ID.
  https://s3.amazonaws.com/foliodocs/api/mod-consortia/s/sharing_settings.html
 */
Cypress.Commands.add('initShareSettingPublication', (publication, options = {}) => {
  const { method = REQUEST_METHOD.POST } = options;
  const {
    url,
    settingId,
    payload,
  } = publication;

  cy.getConsortiaId().then((consortiaId) => {
    const baseUrl = `consortia/${consortiaId}/sharing/settings`;
    const path = method === REQUEST_METHOD.POST ? baseUrl : `${baseUrl}/${settingId}`;

    cy.okapiRequest({
      method,
      path,
      body: {
        payload,
        settingId,
        url: url.startsWith('/') ? url : `/${url}`,
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      const id = (
        method === REQUEST_METHOD.DELETE
          ? body[PUBLISH_COORDINATOR_SHARE_DETAILS_KEYS.DELETE]
          : body[PUBLISH_COORDINATOR_SHARE_DETAILS_KEYS.CREATE] || body[PUBLISH_COORDINATOR_SHARE_DETAILS_KEYS.UPDATE]
      );

      return { id };
    });
  });
});

/*
  Raw API. Get publication details by ID.
  https://s3.amazonaws.com/foliodocs/api/mod-consortia/s/publications.html#operation/getPublicationDetails
 */
Cypress.Commands.add('getPublicationDetails', (publicationId) => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: REQUEST_METHOD.GET,
      path: `consortia/${consortiaId}/publications/${publicationId}`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return {
        id: body.id,
        status: body.status,
      };
    });
  });
});

/*
  Raw API. Get publication results by ID.
  https://s3.amazonaws.com/foliodocs/api/mod-consortia/s/publications.html#operation/getPublicationResults
 */
Cypress.Commands.add('getPublicationResults', (publicationId) => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: REQUEST_METHOD.GET,
      path: `consortia/${consortiaId}/publications/${publicationId}/results`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return {
        publicationResults: body.publicationResults,
        totalRecords: body.totalRecords,
      };
    });
  });
});

/*
  Helper command to send publication request and get results when publication is completed.
  It uses getPublicationDetails command to check publication status and waits until publication is completed before getting results.
  By default, it will retry 10 times with 1 second delay between retries. If publication is still in progress after 10 retries, it will throw an error.
 */
Cypress.Commands.add('sendPublishCoordinatorPublication', (publication) => {
  cy.initPublishCoordinatorRequest(publication).then(({ id }) => {
    return ConsortiumUtils.getPublicationResults(id);
  });
});

/*
  Helper command to send share setting publication request and get results when publication is completed.
  It uses getPublicationDetails command to check publication status and waits until publication is completed before getting results.
  By default, it will retry 10 times with 1 second delay between retries. If publication is still in progress after 10 retries, it will throw an error.
 */
Cypress.Commands.add('sendPublishCoordinatorShareSettingPublication', (publication, options) => {
  cy.initShareSettingPublication(publication, options).then(({ id }) => {
    return ConsortiumUtils.getPublicationResults(id);
  });
});

const PER_PAGE = 100;

const fetchAllPages = (getPage, page = 1, collected = []) => {
  return getPage(page, PER_PAGE).then((response) => {
    cy.expect(response.status).to.eq(200);

    const items = response.body.results ?? response.body;
    const all = collected.concat(items);

    if (items.length < PER_PAGE) {
      return all;
    }
    return fetchAllPages(getPage, page + 1, all);
  });
};

const collectDocFileIds = (records) => {
  const fileIds = [];

  records.forEach((record) => {
    const docs = record.docs ?? [];
    const supplementaryDocs = record.supplementaryDocs ?? [];

    // collect all fileUpload IDs
    docs.forEach((doc) => {
      if (doc.fileUpload?.id) fileIds.push(doc.fileUpload.id);
    });
    supplementaryDocs.forEach((supplementaryDoc) => {
      if (supplementaryDoc.fileUpload?.id) fileIds.push(supplementaryDoc.fileUpload.id);
    });
  });

  return fileIds;
};

const verifyFilesAccessible = (fileIds) => {
  if (fileIds.length === 0) {
    cy.log('No docs or supplementaryDocs found — skipping file access checks');
    return;
  }

  const failures = [];

  fileIds.forEach((id) => {
    cy.getAgreementFileRaw(id).then((fileResponse) => {
      if (fileResponse.status !== 200) {
        failures.push(`erm/files/${id}/raw returned ${fileResponse.status}`);
      }
    });
  });

  cy.then(() => {
    expect(failures, failures.join('\n')).to.have.length(0);
  });
};

describe('fse-agreements', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195097 - Get agreement with active status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'agreements', 'loc', 'fast-check', 'TC195097'] },
    () => {
      cy.getAgreementsByStatus('active').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC196411 - Verify agreement file docs are accessible for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'agreements-docs', 'TC196411'] },
    () => {
      fetchAllPages((page, perPage) => cy.getAgreements(page, perPage)).then((agreements) => {
        verifyFilesAccessible(collectDocFileIds(agreements));
      });
    },
  );

  it(
    `FDOPS-111111 - Verify entitlement file docs are accessible for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'entitlements-docs', 'FDOPS-111111'] },
    () => {
      fetchAllPages((page, perPage) => cy.getEntitlements(page, perPage)).then((entitlements) => {
        verifyFilesAccessible(collectDocFileIds(entitlements));
      });
    },
  );
});

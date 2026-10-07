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
      cy.getAgreements().then((response) => {
        cy.expect(response.status).to.eq(200);

        const agreements = response.body.results ?? response.body;
        const fileIds = [];

        agreements.forEach((agreement) => {
          const docs = agreement.docs ?? [];
          const supplementaryDocs = agreement.supplementaryDocs ?? [];

          // collect all fileUpload IDs
          docs.forEach((doc) => {
            if (doc.fileUpload?.id) fileIds.push(doc.fileUpload.id);
          });
          supplementaryDocs.forEach((supplementaryDoc) => {
            if (supplementaryDoc.fileUpload?.id) fileIds.push(supplementaryDoc.fileUpload.id);
          });
        });

        if (fileIds.length === 0) {
          cy.log('No docs or supplementaryDocs found — skipping file access checks');
          return;
        }

        fileIds.forEach((id) => {
          cy.getAgreementFileRaw(id).then((fileResponse) => {
            cy.expect(
              fileResponse.status,
              `erm/files/${id}/raw returned ${fileResponse.status}`,
            ).to.eq(200);
          });
        });
      });
    },
  );

  it(
    `FDOPS-6963 - ERM identifier endpoints are readable for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'erm-identifiers', 'FDOPS-6963'] },
    () => {
      cy.getErmIdentifiers().then((response) => {
        cy.expect(response.status).to.eq(200);

        const identifiers = response.body.results ?? response.body;

        if (!identifiers.length) {
          cy.log('No ERM identifiers found — skipping item lookup check');
          return;
        }

        cy.getErmIdentifierById(identifiers[0].id).then((itemResponse) => {
          cy.expect(itemResponse.status).to.eq(200);
        });
      });
    },
  );

  it(
    `FDOPS-6964 - Entitlement log entries carry package IDs and resource URLs for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'entitlements', 'FDOPS-6964'] },
    () => {
      cy.getEntitlements().then((response) => {
        cy.expect(response.status).to.eq(200);

        const entitlements = response.body.results ?? response.body;

        if (!entitlements.length) {
          cy.log('No entitlement log entries found — skipping field checks');
          return;
        }

        entitlements.forEach((entitlement) => {
          cy.expect(entitlement).to.have.property('packageId');
          cy.expect(entitlement).to.have.property('resourceURL');
        });
      });
    },
  );
});

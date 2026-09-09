describe('fse-licenses', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195325 - Get licenses by status for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'licenses', 'loc', 'TC195325'] },
    () => {
      cy.getLicensesByStatus('active').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC196410 - Verify license file docs are accessible for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'licenses-docs', 'TC196410'] },
    () => {
      cy.getLicenses().then((response) => {
        cy.expect(response.status).to.eq(200);

        const licenses = response.body.results ?? response.body;
        const fileIds = [];

        licenses.forEach((license) => {
          const docs = license.docs ?? [];
          const supplementaryDocs = license.supplementaryDocs ?? [];

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
          cy.getLicenseFileRaw(id).then((fileResponse) => {
            cy.expect(
              fileResponse.status,
              `licenses/files/${id}/raw returned ${fileResponse.status}`,
            ).to.eq(200);
          });
        });
      });
    },
  );
});

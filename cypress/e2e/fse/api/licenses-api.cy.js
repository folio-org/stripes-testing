describe('fse-licenses', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195325 - Get licenses by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'licenses', 'loc', 'TC195325'] },
    () => {
      cy.getLicensesByStatus('active').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC196410 - Verify license file docs are accessible for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'licenses-docs', 'TC196410'] },
    () => {
      cy.getLicenses().then((response) => {
        cy.expect(response.status).to.eq(200);

        const licenses = response.body.results ?? response.body;
        const fileIds = [];

        licenses.forEach((license) => {
          const docs = license.docs ?? [];
          const supplementaryDocs = license.supplementaryDocs ?? [];

          docs.forEach((doc) => {
            if (doc.id) fileIds.push(doc.id);
          });
          supplementaryDocs.forEach((doc) => {
            if (doc.id) fileIds.push(doc.id);
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

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
    `TC196411 - Verify agreement file docs are accessible for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'agreements', 'sanity'] },
    () => {
      cy.getAgreements().then((response) => {
        cy.expect(response.status).to.eq(200);

        const agreements = response.body.results ?? response.body;
        const fileIds = [];

        agreements.forEach((agreement) => {
          const docs = agreement.docs ?? [];
          const supplementaryDocs = agreement.supplementaryDocs ?? [];

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
});

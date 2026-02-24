import Agreements from '../../../support/fragments/agreements/agreements';

describe('fse-usage-reports - API for production tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195661 - send basic usage report get requests for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'usage-reports', 'TC195661'] },
    () => {
      cy.getUsageReportTitles().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log(response.body);
      });

      cy.getUsageReportPackages().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log(response.body);
      });

      cy.getUsageReportTitleData().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log(response.body);
      });

      cy.getUsageReportData().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log(response.body);
      });
    },
  );
});

describe('fse-usage-reports - API for non-production tenants', () => {
  let agreementId;

  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  afterEach(() => {
    // delete created agreement
    Agreements.deleteViaApi(agreementId);
  });

  it(
    `TC195662 - create agreement and send related get usage-reports for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'usage-reports', 'nonProd', 'TC195662'] },
    () => {
      const currentDate = new Date();
      // create new agreement
      Agreements.createViaApi().then((agr) => {
        agreementId = agr.id;

        // send request for created agreement id
        cy.getUsageReportUseOverTime(
          agreementId,
          currentDate.getFullYear(),
          currentDate.getFullYear(),
        ).then((response) => {
          cy.expect(response.status).to.eq(200);
        });

        cy.getUsageReportReqsByDateOfUse(
          agreementId,
          currentDate.getFullYear(),
          currentDate.getFullYear(),
        ).then((response) => {
          cy.expect(response.status).to.eq(200);
        });

        cy.getUsageReportReqsByPubYear(
          agreementId,
          currentDate.getFullYear(),
          currentDate.getFullYear(),
          '1M',
        ).then((response) => {
          cy.expect(response.status).to.eq(200);
        });

        cy.getUsageReportCostPerUse(
          agreementId,
          currentDate.getFullYear(),
          currentDate.getFullYear(),
        ).then((response) => {
          cy.expect(response.status).to.eq(200);
        });
      });
    },
  );
});

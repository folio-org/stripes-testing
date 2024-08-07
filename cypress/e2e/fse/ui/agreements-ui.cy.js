import TopMenu from '../../../support/fragments/topMenu';
import Agreements from '../../../support/fragments/agreements/searchAndFilterAgreements';

describe('fse-agreements - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195280 - verify that agreements module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'agreements'] },
    () => {
      cy.visit(TopMenu.agreementsPath);
      Agreements.verifyAgreementsFilterPane();
    },
  );
});

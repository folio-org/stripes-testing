import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';

describe('fse-eholdings - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195279 - verify that eholdings module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'eholdings'] },
    () => {
      cy.visit(TopMenu.eholdingsPath);
      EHoldingsSearch.waitLoading();
    },
  );
});

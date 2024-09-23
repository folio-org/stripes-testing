import TopMenu from '../../../support/fragments/topMenu';
import Checkout from '../../../support/fragments/checkout/checkout';

describe('fse-checkout - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195283 - verify that checkout module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'checkout'] },
    () => {
      cy.visit(TopMenu.checkOutPath);
      Checkout.waitLoading();
    },
  );
});

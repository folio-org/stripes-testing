import TopMenu from '../../../support/fragments/topMenu';
import Invoices from '../../../support/fragments/invoices/invoices';

describe('fse-invoices - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195320 - verify that invoices page is displayed',
    { tags: ['sanity', 'fse', 'ui', 'invoices'] },
    () => {
      cy.visit(TopMenu.invoicesPath);
      Invoices.waitLoading();
    },
  );
});

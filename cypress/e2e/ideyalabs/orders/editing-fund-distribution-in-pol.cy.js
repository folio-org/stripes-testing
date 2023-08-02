import invoice from '../../../support/fragments/ideyalabs/invoice';
import topMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';

const searchInvoiceNumber = {
  parameter: 'Keyword',
  value: '17210-4',
};

const fundID = 'Fund B (b)';

describe('Orders', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.ordersPath);
  });

  it(
    'C368486 Editing fund distribution in PO line when related Reviewed invoice exists (thunderjet)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.orderLinesPath);
      invoice.searchByParameter(
        searchInvoiceNumber.parameter,
        searchInvoiceNumber.value
      );
      invoice.orderLinesResults();
      invoice.orderList(searchInvoiceNumber.value);
      invoice.PODetails(fundID); // API getting failed while changing Fund ID in bugfest ENV
      invoice.clickOnViewTransactions();
      cy.visit(topMenu.invoicesPath);
      invoice.verifyTransactionsPane();
    }
  );
});

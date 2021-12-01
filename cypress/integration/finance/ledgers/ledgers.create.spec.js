import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';

describe('ui-finance: Ledger list search and filters', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.visit('/finance/ledger');
      });
  });

  it('C4053 should create new ledger if mandatory fields are filled', function () {
    Ledgers.createDefaultLedger();
    Ledgers.deleteLedgerViaActions();
  });
});

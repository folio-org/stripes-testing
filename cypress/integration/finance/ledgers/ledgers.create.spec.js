import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import NewLedger from '../../../support/fragments/finance/ledgers/newLedger';

describe('ui-finance: Ledger list search and filters', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.ledgerPath);
  });

  it('C4053 should create new ledger if mandatory fields are filled', () => {
    const timestamp = (new Date()).getTime();
    const defaultLedger = NewLedger.defaultLedger;

    Ledgers.createDefaultLedger(defaultLedger);
    Ledgers.deleteLedgerViaActions(defaultLedger);
    Ledgers.checkCreatedLedgerName(defaultLedger);

    // should not create new ledger if mandatory fields are not filled
    const testLedgerName = `E2E ledger ${timestamp}`;
    Ledgers.tryToCreateLedgerWithoutMandatoryFields(testLedgerName);
    Ledgers.searchLedgerByName(testLedgerName);
    Ledgers.checkZeroSearchResultsHeader();
  });
});

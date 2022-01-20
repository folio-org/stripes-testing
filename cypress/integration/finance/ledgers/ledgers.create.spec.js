import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import NewLedger from '../../../support/fragments/finance/ledgers/newLedger';
import getRandomPostfix from '../../../support/utils/stringTools';
import testType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';

describe('ui-finance: Ledger creation', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.ledgerPath);
  });

  it('C4053 should create new ledger if mandatory fields are filled', { tags: [testType.smoke] }, () => {
    const defaultLedger = NewLedger.defaultLedger;

    Ledgers.createDefaultLedger(defaultLedger);
    Ledgers.checkCreatedLedgerName(defaultLedger);
    Ledgers.deleteLedgerViaActions(defaultLedger);

    // should not create new ledger if mandatory fields are not filled
    const testLedgerName = `autotest_ledger_${getRandomPostfix()}`;
    Ledgers.tryToCreateLedgerWithoutMandatoryFields(testLedgerName);
    FinanceHelp.searchByName(testLedgerName);
    Ledgers.checkZeroSearchResultsHeader();
  });
});

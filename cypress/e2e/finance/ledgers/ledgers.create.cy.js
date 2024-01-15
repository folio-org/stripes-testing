import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewLedger from '../../../support/fragments/finance/ledgers/newLedger';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('ui-finance: Ledgers', () => {
  before(() => {
    cy.loginAsAdmin();
    cy.visit(TopMenu.ledgerPath);
  });

  it('C4053 Create a new ledger (thunderjet)', { tags: ['smoke', 'thunderjet'] }, () => {
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

import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewLedger from '../../../support/fragments/finance/ledgers/newLedger';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Ledgers', () => {
  before(() => {
    cy.loginAsAdmin({ path: TopMenu.ledgerPath, waiter: Ledgers.waitForLedgerDetailsLoading });
  });

  it(
    'C4053 Create a new ledger (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C4053', 'shiftLeft'] },
    () => {
      const defaultLedger = NewLedger.defaultLedger;

      Ledgers.createDefaultLedger(defaultLedger);
      Ledgers.checkCreatedLedgerName(defaultLedger);
      Ledgers.deleteLedgerViaActions(defaultLedger);

      // should not create new ledger if mandatory fields are not filled
      const testLedgerName = `autotest_ledger_${getRandomPostfix()}`;
      Ledgers.tryToCreateLedgerWithoutMandatoryFields(testLedgerName);
      FinanceHelp.searchByName(testLedgerName);
      Ledgers.checkZeroSearchResultsHeader();
    },
  );
});

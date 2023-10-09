import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';

describe('ui-finance: Funds', () => {
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
        });
      });
    });
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
  });

  after(() => {
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
  });

  it(
    'C357528 Warning message for already existing field appears when after filling duplicated field user clicks on the dropdown with filter options list (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Funds.createFundForWarningMessage(defaultFund);
      Funds.checkWarningMessageFundCodeUsed();
    },
  );
});

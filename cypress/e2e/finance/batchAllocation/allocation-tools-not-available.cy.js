import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Users from '../../../support/fragments/users/users';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';

describe('Finance › Batch allocation', () => {
  let user;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const fund = { ...Funds.defaultUiFund };

  before('Setup data', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledger.fiscalYearOneId = fy.id;
      Ledgers.createViaApi(ledger).then((lg) => {
        ledger.id = lg.id;
        fund.ledgerId = lg.id;
        Funds.createViaApi(fund).then((fundResponse) => {
          fund.id = fundResponse.fund.id;
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiFinanceViewFiscalYear.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C648520 "Allocation tools" submenu is not available in "Actions" menu on "Fiscal year" and "Fund" panes (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C648520'] },
    () => {
      FiscalYears.searchByName(fiscalYear.name);
      FiscalYears.selectFisacalYear(fiscalYear.name);
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.assertAllocationToolsSubmenuAbsent();
      FinanceHelper.selectFundsNavigation();
      Funds.searchByName(fund.name);
      Funds.selectFund(fund.name);
      Funds.assertAllocationToolsSubmenuAbsent();
    },
  );
});

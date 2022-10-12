import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('ui-finance: Transactions', () => {
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const allocatedQuantity = '50';
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear)
      .then(response => {
        defaultFiscalYear.id = response.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

        Ledgers.createViaApi(defaultLedger)
          .then(ledgerResponse => {
            defaultLedger.id = ledgerResponse.id;
            defaultfund.ledgerId = defaultLedger.id;

            Funds.createViaApi(defaultfund)
              .then(fundResponse => {
                defaultfund.id = fundResponse.fund.id;

                cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
                FinanceHelp.searchByName(defaultfund.name);
                FinanceHelp.selectFromResultsList();
                Funds.addBudget(allocatedQuantity);
              });
          });
      });
    cy.createTempUser([
      permissions.uiFinanceFinanceViewGroup.gui,
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceCreateTransfers.gui,
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceExportFinanceRecords.gui,
      permissions.uiFinanceManageAcquisitionUnits.gui,
      permissions.uiFinanceManuallyReleaseEncumbrance.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewGroups.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewEditFiscalYear.gui,
      permissions.uiFinanceViewEditFundAndBudget.gui,
      permissions.uiFinanceViewEditGroup.gui,
      permissions.uiFinanceViewEditLedger.gui,
      permissions.uiFinanceViewEditCreateFiscalYear.gui,
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiFinanceCreateViewEditGroups.gui,
      permissions.uiFinanceViewEditCreateLedger.gui,
      permissions.uiFinanceViewEditDeleteFiscalYear.gui,
      permissions.uiFinanceViewEditDeletFundBudget.gui,
      permissions.uiFinanceViewEditDeletGroups.gui,
      permissions.uiFinanceViewEditDeleteLedger.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.fundPath, waiter: Funds.waitLoading });
      });
  });

  after(() => {
    cy.loginAsAdmin({ path:Se.a, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(defaultfund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    InteractorsTools.checkCalloutMessage('Budget has been deleted');
    Funds.checkIsBudgetDeleted();

    Funds.deleteFundViaApi(defaultfund.id);

    Ledgers.deleteledgerViaApi(defaultLedger.id);

    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);

    Users.deleteViaApi(user.userId);
  });

  it('C163928 Test acquisition unit restrictions for Fund records (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    FinanceHelp.searchByName(defaultfund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.increaseAllocation();
    InteractorsTools.checkCalloutMessage(`$50.00 was successfully allocated to the budget ${defaultfund.code}-${defaultFiscalYear.code}`);
    Funds.viewTransactions();
    Funds.checkTransactionList(defaultfund.code);
  });
});

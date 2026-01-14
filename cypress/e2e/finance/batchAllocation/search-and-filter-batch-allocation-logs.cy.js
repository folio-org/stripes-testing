import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import Groups from '../../../support/fragments/finance/groups/groups';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import DateTools from '../../../support/utils/dateTools';

describe('Finance › Batch allocation', () => {
  let user;
  const fiscalYear1 = {
    ...FiscalYears.defaultUiFiscalYear,
    code: DateTools.getRandomFiscalYearCodeFY(2000, 9999),
  };
  const fiscalYear2 = {
    ...FiscalYears.defaultUiFiscalYear,
    name: `${FiscalYears.defaultUiFiscalYear.name}_2`,
  };
  const ledgers = [
    {
      ...Ledgers.defaultUiLedger,
      name: `Ledger_A_${getRandomPostfix()}`,
      code: `test_automation_code_1_${getRandomPostfix()}`,
    },
    {
      ...Ledgers.defaultUiLedger,
      name: `Ledger_B_${getRandomPostfix()}`,
      code: `test_automation_code_2_${getRandomPostfix()}`,
    },
  ];
  const funds = [
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_A_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_1`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_B_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_2`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_C_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_3`,
    },
  ];
  const budgets = [
    { ...Budgets.getDefaultBudget(), allocated: 100 },
    { ...Budgets.getDefaultBudget(), allocated: 200 },
    { ...Budgets.getDefaultBudget(), allocated: 300 },
  ];
  const groupA = { ...Groups.defaultUiGroup };
  const groupB = {
    ...Groups.defaultUiGroup,
    name: `autotest_group_2_${getRandomPostfix()}`,
    code: `${getRandomPostfix()}_2`,
  };
  const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
  let logId;

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.ledgerPath,
      waiter: Ledgers.waitLoading,
    });

    FiscalYears.createViaApi(fiscalYear1).then((fiscalYearOneResponse) => {
      fiscalYear1.id = fiscalYearOneResponse.id;
      ledgers[0].fiscalYearOneId = fiscalYear1.id;
      budgets[0].fiscalYearId = fiscalYearOneResponse.id;
      fiscalYear2.code = 'PO' + fiscalYear1.code.slice(2);
      FiscalYears.createViaApi(fiscalYear2).then((fiscalYearTwoResponse) => {
        fiscalYear2.id = fiscalYearTwoResponse.id;
        ledgers[1].fiscalYearOneId = fiscalYear2.id;
        budgets[1].fiscalYearId = fiscalYearTwoResponse.id;
        budgets[2].fiscalYearId = fiscalYearTwoResponse.id;
        Ledgers.createViaApi(ledgers[0]).then((ledgerOneResponse) => {
          ledgers[0].id = ledgerOneResponse.id;
          funds[0].ledgerId = ledgerOneResponse.id;
          Ledgers.createViaApi(ledgers[1]).then((ledgerTwoResponse) => {
            ledgers[1].id = ledgerTwoResponse.id;
            funds[1].ledgerId = ledgerTwoResponse.id;
            funds[2].ledgerId = ledgerTwoResponse.id;
            Groups.createViaApi(groupA).then((groupAResponse) => {
              groupA.id = groupAResponse.id;
              Groups.createViaApi(groupB).then((groupBResponse) => {
                groupB.id = groupBResponse.id;
                Funds.createViaApi(funds[0], [groupAResponse.id]).then((fundOneResponse) => {
                  funds[0].id = fundOneResponse.fund.id;
                  budgets[0].fundId = fundOneResponse.fund.id;
                  Budgets.createViaApi(budgets[0]);
                });
                Funds.createViaApi(funds[1], [groupBResponse.id]).then((fundTwoResponse) => {
                  funds[1].id = fundTwoResponse.fund.id;
                  budgets[1].fundId = fundTwoResponse.fund.id;
                  Budgets.createViaApi(budgets[1]);
                });
                Funds.createViaApi(funds[2]).then((fundThreeResponse) => {
                  funds[2].id = fundThreeResponse.fund.id;
                  budgets[2].fundId = fundThreeResponse.fund.id;
                  Budgets.createViaApi(budgets[2]);
                });
              });
            });
          });
        });
      });
    });
    Ledgers.searchByName(ledgers[0].name);
    Ledgers.selectLedger(ledgers[0].name);
    BatchEditBudget.clickBatchAllocationButton();
    BatchEditBudget.saveAndCloseBatchAllocation();
    BatchEditBudget.setAllocationChange(funds[0].name, '100');
    BatchEditBudget.clickRecalculateButton();
    cy.wait(1000);
    BatchEditBudget.assertTotalAllocatedAfter(funds[0].name, '200.00');
    BatchEditBudget.clickSaveAndCloseButton();
    cy.wait(4000);

    cy.createTempUser([
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewGroups.gui,
      permissions.uiUsersView.gui,
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiFinanceFundUpdateLogsView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });
    });
    Ledgers.searchByName(ledgers[1].name);
    Ledgers.selectLedger(ledgers[1].name);
    BatchEditBudget.clickBatchAllocationButton();
    BatchEditBudget.saveAndCloseBatchAllocation();
    BatchEditBudget.setAllocationChange(funds[1].name, '100');
    BatchEditBudget.setAllocationChange(funds[2].name, '100');
    BatchEditBudget.clickRecalculateButton();
    cy.wait(1000);
    BatchEditBudget.assertTotalAllocatedAfter(funds[1].name, '300.00');
    BatchEditBudget.assertTotalAllocatedAfter(funds[2].name, '400.00');
    BatchEditBudget.clickSaveAndCloseButton();
    cy.wait(4000);
    Ledgers.closeOpenedPage();
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C692072 Search and filter pane on Batch allocation logs screen (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C692072'] },
    () => {
      BatchEditBudget.openBatchAllocationLogsFromLedgerList();
      BatchEditBudget.filterLogsByFiscalYear(fiscalYear1.code);
      BatchEditBudget.verifyLogExists(fiscalYear1.code, ledgers[0].code);
      BatchEditBudget.filterLogsByFiscalYear(fiscalYear2.code);
      BatchEditBudget.verifyLogExists(fiscalYear2.code, ledgers[1].code);
      BatchEditBudget.getLogsId().then((idValue) => {
        logId = idValue;
        BatchEditBudget.collapseSearchPane();
        BatchEditBudget.openSearchPane();
        BatchEditBudget.resetFiltersIfActive();
        BatchEditBudget.filterByDate(today, today);
        BatchEditBudget.verifyLogExists(fiscalYear2.code, ledgers[1].code);
        BatchEditBudget.resetFiltersIfActive();
        BatchEditBudget.filterLogsByLedger(ledgers[0].name);
        BatchEditBudget.verifyLogExists(fiscalYear1.code, ledgers[0].code);
        BatchEditBudget.filterLogsByGroup(groupA.name);
        BatchEditBudget.verifyLogExists(fiscalYear1.code, ledgers[0].code);
        BatchEditBudget.resetFiltersIfActive();
        BatchEditBudget.filterLogsByLedger(ledgers[1].name);
        BatchEditBudget.verifyLogExists(fiscalYear2.code, ledgers[1].code);
        BatchEditBudget.filterLogsByGroup(groupB.name);
        BatchEditBudget.verifyLogExists(fiscalYear2.code, ledgers[1].code);
        BatchEditBudget.resetFiltersIfActive();
        BatchEditBudget.filterLogsByUser(user.username);
        BatchEditBudget.verifyLogExists(fiscalYear2.code, ledgers[1].code);
        BatchEditBudget.resetFiltersIfActive();
        BatchEditBudget.searchLogs(fiscalYear2.code, ledgers[1].code);
        BatchEditBudget.resetFiltersIfActive();
        BatchEditBudget.searchByParameters('ID', String(logId));
        BatchEditBudget.verifyLogExists(fiscalYear2.code, ledgers[1].code);
        BatchEditBudget.searchByParameters('ID', '10000');
        BatchEditBudget.verifyNoResultsMessage('10000');
      });
    },
  );
});

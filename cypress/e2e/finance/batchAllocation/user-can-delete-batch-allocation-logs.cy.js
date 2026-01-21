import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance › Batch allocation', () => {
  let user;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
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
    {
      ...Ledgers.defaultUiLedger,
      name: `Ledger_C_${getRandomPostfix()}`,
      code: `test_automation_code_3_${getRandomPostfix()}`,
    },
    {
      ...Ledgers.defaultUiLedger,
      name: `Ledger_D_${getRandomPostfix()}`,
      code: `test_automation_code_4_${getRandomPostfix()}`,
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
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_D_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_4`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_E_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_5`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_F_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_6`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_G_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_7`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_J_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_8`,
    },
  ];

  const budgets = [
    { ...Budgets.getDefaultBudget(), allocated: 50 },
    { ...Budgets.getDefaultBudget(), allocated: 100 },
    { ...Budgets.getDefaultBudget(), allocated: 150 },
    { ...Budgets.getDefaultBudget(), allocated: 200 },
    { ...Budgets.getDefaultBudget(), allocated: 250 },
    { ...Budgets.getDefaultBudget(), allocated: 300 },
    { ...Budgets.getDefaultBudget(), allocated: 350 },
    { ...Budgets.getDefaultBudget(), allocated: 400 },
  ];

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.ledgerPath,
      waiter: Ledgers.waitLoading,
    });

    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledgers.forEach((ledger) => {
        ledger.fiscalYearOneId = fy.id;
      });
      budgets.forEach((b) => {
        b.fiscalYearId = fy.id;
      });
      Ledgers.createViaApi(ledgers[0]).then((ledger1Response) => {
        ledgers[0].id = ledger1Response.id;
        funds[0].ledgerId = ledger1Response.id;
        funds[1].ledgerId = ledger1Response.id;
        Ledgers.createViaApi(ledgers[1]).then((ledger2Response) => {
          ledgers[1].id = ledger2Response.id;
          funds[2].ledgerId = ledger2Response.id;
          funds[3].ledgerId = ledger2Response.id;
          Ledgers.createViaApi(ledgers[2]).then((ledger3Response) => {
            ledgers[2].id = ledger2Response.id;
            funds[4].ledgerId = ledger3Response.id;
            funds[5].ledgerId = ledger3Response.id;
            Ledgers.createViaApi(ledgers[3]).then((ledger4Response) => {
              ledgers[3].id = ledger2Response.id;
              funds[6].ledgerId = ledger4Response.id;
              funds[7].ledgerId = ledger4Response.id;
              funds.forEach((fund, idx) => {
                Funds.createViaApi(fund).then((fundResp) => {
                  fund.id = fundResp.fund.id;
                  const budgetToUse = budgets[idx];
                  budgetToUse.fundId = fund.id;
                  Budgets.createViaApi(budgetToUse).then((budgetResp) => {
                    budgetToUse.id = budgetResp.id;
                  });
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
    BatchEditBudget.setAllocationChange(funds[1].name, '100');
    BatchEditBudget.clickRecalculateButton();
    cy.wait(1000);
    BatchEditBudget.assertTotalAllocatedAfter(funds[0].name, '150.00');
    BatchEditBudget.assertTotalAllocatedAfter(funds[1].name, '200.00');
    BatchEditBudget.clickSaveAndCloseButton();
    cy.wait(4000);
    Ledgers.searchByName(ledgers[1].name);
    Ledgers.selectLedger(ledgers[1].name);
    BatchEditBudget.clickBatchAllocationButton();
    BatchEditBudget.saveAndCloseBatchAllocation();
    BatchEditBudget.setAllocationChange(funds[2].name, '100');
    BatchEditBudget.setAllocationChange(funds[3].name, '100');
    BatchEditBudget.clickRecalculateButton();
    cy.wait(1000);
    BatchEditBudget.assertTotalAllocatedAfter(funds[2].name, '250.00');
    BatchEditBudget.assertTotalAllocatedAfter(funds[3].name, '300.00');
    BatchEditBudget.clickSaveAndCloseButton();
    cy.wait(4000);
    Ledgers.searchByName(ledgers[2].name);
    Ledgers.selectLedger(ledgers[2].name);
    BatchEditBudget.clickBatchAllocationButton();
    BatchEditBudget.saveAndCloseBatchAllocation();
    BatchEditBudget.setAllocationChange(funds[4].name, '100');
    BatchEditBudget.setAllocationChange(funds[5].name, '100');
    BatchEditBudget.clickRecalculateButton();
    cy.wait(1000);
    BatchEditBudget.assertTotalAllocatedAfter(funds[4].name, '350.00');
    BatchEditBudget.assertTotalAllocatedAfter(funds[5].name, '400.00');
    BatchEditBudget.clickSaveAndCloseButton();
    cy.wait(4000);
    Ledgers.searchByName(ledgers[3].name);
    Ledgers.selectLedger(ledgers[3].name);
    BatchEditBudget.clickBatchAllocationButton();
    BatchEditBudget.saveAndCloseBatchAllocation();
    BatchEditBudget.setAllocationChange(funds[6].name, '100');
    BatchEditBudget.setAllocationChange(funds[7].name, '100');
    BatchEditBudget.clickRecalculateButton();
    cy.wait(1000);
    BatchEditBudget.assertTotalAllocatedAfter(funds[6].name, '450.00');
    BatchEditBudget.assertTotalAllocatedAfter(funds[7].name, '500.00');
    BatchEditBudget.clickSaveAndCloseButton();
    cy.wait(4000);

    cy.createTempUser([
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceFundUpdateLogsView.gui,
      permissions.uiFinanceFundUpdateLogsDelete.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C651498 User can delete Batch allocation logs (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C651498'] },
    () => {
      BatchEditBudget.openBatchAllocationLogsFromLedgerList();
      BatchEditBudget.clickActionsButton();
      BatchEditBudget.assertDeleteLogsOptionDisabled();
      cy.wait(1000);
      BatchEditBudget.selectLogWithNamePart(fiscalYear.code, ledgers[0].code);
      BatchEditBudget.clickActionsButton();
      BatchEditBudget.clickDeleteAllocationLogs();
      BatchEditBudget.cancelBatchEditBudget();
      BatchEditBudget.clickActionsButton();
      BatchEditBudget.clickDeleteAllocationLogs();
      BatchEditBudget.clickConfirmButton();
      InteractorsTools.checkCalloutMessage('Log(s) successfully deleted');
      BatchEditBudget.searchLogs(fiscalYear.code, ledgers[0].code);
      BatchEditBudget.verifyNoResultsMessage(`${fiscalYear.code}-${ledgers[0].code}`);
      BatchEditBudget.resetFiltersIfActive();
      BatchEditBudget.selectLogWithNamePart(fiscalYear.code, ledgers[1].code);
      BatchEditBudget.selectLogWithNamePart(fiscalYear.code, ledgers[2].code);
      BatchEditBudget.clickActionsButton();
      BatchEditBudget.clickDeleteAllocationLogs();
      BatchEditBudget.clickConfirmButton();
      InteractorsTools.checkCalloutMessage('Log(s) successfully deleted');
      BatchEditBudget.searchLogs(fiscalYear.code, ledgers[1].code);
      BatchEditBudget.verifyNoResultsMessage(`${fiscalYear.code}-${ledgers[1].code}`);
      BatchEditBudget.resetFiltersIfActive();
      BatchEditBudget.searchLogs(fiscalYear.code, ledgers[2].code);
      BatchEditBudget.verifyNoResultsMessage(`${fiscalYear.code}-${ledgers[2].code}`);
      BatchEditBudget.resetFiltersIfActive();
      BatchEditBudget.clickLogForLedger(fiscalYear.code, ledgers[3].code);
      BatchEditBudget.clickActionsButton();
      BatchEditBudget.clickDeleteButton();
      BatchEditBudget.cancelBatchEditBudget();
      BatchEditBudget.clickActionsButton();
      BatchEditBudget.clickDeleteButton();
      BatchEditBudget.clickDeleteButton();
      InteractorsTools.checkCalloutMessage('Log(s) successfully deleted');
      BatchEditBudget.searchLogs(fiscalYear.code, ledgers[3].code);
      BatchEditBudget.verifyNoResultsMessage(`${fiscalYear.code}-${ledgers[3].code}`);
    },
  );
});

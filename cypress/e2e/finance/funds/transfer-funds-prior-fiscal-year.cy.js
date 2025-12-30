import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance › Funds', () => {
  let user;
  const fiscalYear1 = { ...FiscalYears.defaultUiFiscalYear };
  const fiscalYear2 = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.get3DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const ledger = { ...Ledgers.defaultUiLedger };
  const fundA = { ...Funds.defaultUiFund };
  const fundB = {
    ...Funds.defaultUiFund,
    name: `autotest_fund_B_${getRandomPostfix()}`,
    code: `${getRandomPostfix()}_2`,
    allocatedToIds: [],
  };
  const budgetACurrent = { ...Budgets.getDefaultBudget(), allocated: 100 };
  const budgetAPlanned = { ...Budgets.getDefaultBudget(), allocated: 100, budgetStatus: 'Planned' };
  const budgetBCurrent = { ...Budgets.getDefaultBudget(), allocated: 100 };
  const budgetBPlanned = { ...Budgets.getDefaultBudget(), allocated: 100, budgetStatus: 'Planned' };

  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

  before('Setup data', () => {
    cy.loginAsAdmin({
      path: TopMenu.fiscalYearPath,
      waiter: FiscalYears.waitLoading,
    });

    FiscalYears.createViaApi(fiscalYear1).then((fy1) => {
      fiscalYear1.id = fy1.id;
      ledger.fiscalYearOneId = fy1.id;
      budgetACurrent.fiscalYearId = fy1.id;
      budgetBCurrent.fiscalYearId = fy1.id;
      fiscalYear2.code = fiscalYear1.code.slice(0, -1) + '2';
      FiscalYears.createViaApi(fiscalYear2).then((fy2) => {
        fiscalYear2.id = fy2.id;
        budgetAPlanned.fiscalYearId = fy2.id;
        budgetBPlanned.fiscalYearId = fy2.id;

        Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          ledger.id = ledgerResponse.id;
          fundA.ledgerId = ledgerResponse.id;
          fundB.ledgerId = ledgerResponse.id;

          Funds.createViaApi(fundA).then((fundAResponse) => {
            fundA.id = fundAResponse.fund.id;
            budgetAPlanned.fundId = fundAResponse.fund.id;
            budgetACurrent.fundId = fundAResponse.fund.id;
            fundB.allocatedToIds.push(fundAResponse.fund.id);
            Budgets.createViaApi(budgetAPlanned);
            Budgets.createViaApi(budgetACurrent);
          });

          Funds.createViaApi(fundB).then((fundBResponse) => {
            fundB.id = fundBResponse.fund.id;
            budgetBCurrent.fundId = fundBResponse.fund.id;
            budgetBPlanned.fundId = fundBResponse.fund.id;
            Budgets.createViaApi(budgetBPlanned);
            Budgets.createViaApi(budgetBCurrent);
          });
        });
      });
    });

    FinanceHelper.searchByName(fiscalYear1.name);
    FiscalYears.selectFY(fiscalYear1.name);
    FiscalYears.editFiscalYearDetails();
    FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
      periodStartForFirstFY,
      periodEndForFirstFY,
    );
    FinanceHelper.searchByName(fiscalYear2.name);
    FiscalYears.selectFY(fiscalYear2.name);
    FiscalYears.editFiscalYearDetails();
    FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
      periodStartForSecondFY,
      periodEndForSecondFY,
    );

    cy.createTempUser([
      permissions.uiFinanceCreateTransfers.gui,
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C692240 Transferring funds in prior fiscal year and canceling allocation increase (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Funds.searchByName(fundB.name);
      Funds.selectFund(fundB.name);
      Funds.selectPreviousBudgetDetails();
      Funds.transfer(fundA, fundB);
      InteractorsTools.checkCalloutMessage(
        `$10.00 was successfully transferred to the budget ${budgetACurrent.name}`,
      );
      Funds.openIncreaseAllocationModal();
      Funds.checkIncreaseAllocationModal();
      Funds.cancelIncreaseAllocationModal();
      Funds.openDecreaseAllocationModal();
      Funds.cancelDecreaseAllocationModal();
      Funds.closeBudgetDetails();
      Funds.searchByName(fundA.name);
      Funds.selectFund(fundA.name);
      Funds.selectPreviousBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Transfer');
      Funds.varifyDetailsInTransaction(
        fiscalYear1.code,
        '$10.00',
        'User',
        'Transfer',
        `${fundB.name} (${fundB.code})`,
      );
    },
  );
});

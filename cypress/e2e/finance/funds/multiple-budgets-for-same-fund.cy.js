import { BUDGET_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../support/utils';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';

describe('Finance', () => {
  describe('Funds', () => {
    const date = new Date();
    const code = `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}`;
    const fiscalYears = {
      current: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}01`,
        periodStart: new Date(date.getFullYear(), 0, 1),
        periodEnd: new Date(date.getFullYear(), 11, 31),
      },
      upcoming: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}02`,
        periodStart: new Date(date.getFullYear() + 1, 0, 1),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
      next: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}03`,
        periodStart: new Date(date.getFullYear() + 2, 0, 1),
        periodEnd: new Date(date.getFullYear() + 2, 11, 31),
      },
    };
    const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYears.current.id };
    const fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
    const testData = {
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(fiscalYears).forEach((fiscalYear) => {
          FiscalYears.createViaApi(fiscalYear);
        });
        Ledgers.createViaApi(ledger);
        Funds.createViaApi(fund);
      });

      cy.createTempUser([Permissions.uiFinanceViewEditCreateFundAndBudget.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Budgets.getBudgetViaApi({ query: `fundId=${fund.id}` }).then(({ budgets }) => {
          budgets.forEach((budget) => Budgets.deleteViaApi(budget.id));
        });
        Funds.deleteFundViaApi(fund.id);
        Ledgers.deleteLedgerViaApi(ledger.id);
        Object.values(fiscalYears).forEach((fiscalYear) => {
          FiscalYears.deleteFiscalYearViaApi(fiscalYear.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C353527 Allow user to create multiple planned budgets (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353527'] },
      () => {
        // Open Fund from Preconditions
        FinanceHelper.searchByName(fund.name);
        Funds.selectFund(fund.name);

        // Fund details includes "Current budget", "Planned budget", "Previous budget"
        FundDetails.checkFundDetails({
          // currentBudget: [],
          plannedBudget: [],
          previousBudgets: [],
        });

        // Click "New" button in "Planned budget" accordion
        const AddBudgetModal = FundDetails.clickAddPlannedBudget();

        // Fill the following fields: "Status", "Allocated"
        AddBudgetModal.fillBudgetDetails({
          status: BUDGET_STATUSES.PLANNED,
          allocated: '10',
        });
        // * "Fiscal Year" field is specified with "upcoming" value
        AddBudgetModal.checkBudgetDetails({
          fiscalYear: fiscalYears.upcoming.id,
        });

        // Click "Save" button
        AddBudgetModal.clickSaveButton();
        BudgetDetails.checkBudgetDetails({
          information: [
            { key: 'Name', value: fiscalYears.upcoming.code },
            { key: 'Status', value: BUDGET_STATUSES.PLANNED },
          ],
        });

        // Close Budget details by clicking "X" button
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          plannedBudgets: [{ name: fiscalYears.upcoming.code, allocated: '10.00' }],
        });

        // Click "New" button in "Planned budget" accordion
        FundDetails.clickAddPlannedBudget();

        // Fill the following fields: "Status", "Allocated"
        AddBudgetModal.fillBudgetDetails({
          status: BUDGET_STATUSES.PLANNED,
          allocated: '100',
        });
        // * "Fiscal Year" field is specified with "next" value
        AddBudgetModal.checkBudgetDetails({
          fiscalYear: fiscalYears.next.id,
        });

        // Click "Save" button
        AddBudgetModal.clickSaveButton();
        BudgetDetails.checkBudgetDetails({
          information: [
            { key: 'Name', value: fiscalYears.next.code },
            { key: 'Status', value: BUDGET_STATUSES.PLANNED },
          ],
        });

        // Close Budget details by clicking "X" button
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          plannedBudgets: [
            { name: fiscalYears.upcoming.code, allocated: '10.00' },
            { name: fiscalYears.next.code, allocated: '100.00' },
          ],
        });
      },
    );
  });
});

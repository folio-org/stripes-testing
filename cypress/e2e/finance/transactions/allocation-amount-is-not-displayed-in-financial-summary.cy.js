import { Permissions } from '../../../support/dictionary';
import {
  Budgets,
  FiscalYears,
  Funds,
  Ledgers,
  FinanceHelper,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import AddTransferModal from '../../../support/fragments/finance/modals/addTransferModal';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';

describe('Finance', () => {
  describe('Transactions', () => {
    const fiscalYear = FiscalYears.getDefaultFiscalYear();
    const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYear.id };
    const allocatedTo = {
      a: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_00A.${new Date().getTime()}`,
        ledgerId: ledger.id,
      },
      c: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_00C.${new Date().getTime()}`,
        ledgerId: ledger.id,
      },
    };
    const funds = {
      a: allocatedTo.a,
      b: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_00B.${new Date().getTime()}`,
        ledgerId: ledger.id,
        allocatedToIds: [allocatedTo.a.id],
      },
      c: allocatedTo.c,
      d: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_00D.${new Date().getTime()}`,
        ledgerId: ledger.id,
      },
      e: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_00E.${new Date().getTime()}`,
        ledgerId: ledger.id,
      },
      f: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_00F.${new Date().getTime()}`,
        ledgerId: ledger.id,
        allocatedToIds: [allocatedTo.c.id],
      },
    };
    const testData = {
      budgets: [],
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        FiscalYears.createViaApi(fiscalYear);
        Ledgers.createViaApi(ledger);
        Object.values(funds).forEach((fund) => {
          Funds.createViaApi(fund);

          const budget = {
            ...Budgets.getDefaultBudget(),
            allocated: 100,
            fiscalYearId: fiscalYear.id,
            fundId: fund.id,
          };
          testData.budgets.push(budget);
          Budgets.createViaApi(budget);
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceCreateAllocations.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewLedger.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
          });
        }, 20_000);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.budgets.forEach((budget) => {
          Budgets.deleteViaApi(budget.id, false);
        });
        Object.values(funds).forEach((fund) => {
          Funds.deleteFundViaApi(fund.id, false);
        });
        Ledgers.deleteLedgerViaApi(ledger.id, false);
        FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C360116 "Increase/decrease in allocation" amounts for funds related to the same ledger should not be displayed in ledger Financial summary (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C360116'] },
      () => {
        // Click on **"Fund B"** name on "Fund" pane
        FinanceHelper.searchByName(funds.b.name);
        FinanceHelper.selectFirstFundRecord(funds.b.name);

        // Click on the active budget for current fiscal year in "Current budget" accordion
        FundDetails.openCurrentBudgetDetails();

        // Click "Actions" button, Select "Move allocation" option
        BudgetDetails.clickMoveAllocationButton();

        // Fill the following fields: "From", "To", "Amount"
        AddTransferModal.fillTransferDetails({
          fromFund: funds.b.name,
          toFund: funds.a.name,
          amount: '10',
        });

        // Click "Confirm" button
        AddTransferModal.clickConfirmButton({
          transferCreated: false,
          ammountAllocated: true,
        });

        // Close **"Current Budget name"** window by clicking "X" button on the top left corner
        BudgetDetails.closeBudgetDetails();

        // Click on **"Fund F"** name on "Fund" pane
        FinanceHelper.searchByName(funds.f.name);
        FinanceHelper.selectFirstFundRecord(funds.f.name);

        // Click on the active budget for current fiscal year in "Current budget" accordion
        FundDetails.openCurrentBudgetDetails();

        // Click "Actions" button, Select "Move allocation" option
        BudgetDetails.clickMoveAllocationButton();

        // Fill the following fields: "From", "To", "Amount"
        AddTransferModal.fillTransferDetails({
          fromFund: funds.f.name,
          toFund: funds.c.name,
          amount: '20',
        });

        // Click "Confirm" button
        AddTransferModal.clickConfirmButton({
          transferCreated: false,
          ammountAllocated: true,
        });

        // Close **"Current Budget name"** window by clicking "X" button on the top left corner
        BudgetDetails.closeBudgetDetails();

        // Click "Ledger" toggle on "Search & filter" pane
        FinanceHelper.selectLedgersNavigation();

        // Search for the ledger from Preconditions item #2 and click on it
        FinanceHelper.searchByName(ledger.name);
        FinanceHelper.selectFirstLedger(ledger.name);

        // Both "Increase in allocation" and "Decrease in allocation" fields in "Financial summary" accordion are specified with 0.00 value
        LedgerDetails.checkLedgerDetails({
          financialSummary: [
            { key: 'Increase in allocation', value: '$0.00' },
            { key: 'Decrease in allocation', value: '$0.00' },
          ],
        });
      },
    );
  });
});

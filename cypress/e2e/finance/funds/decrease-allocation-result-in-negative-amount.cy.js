import { Permissions } from '../../../support/dictionary';
import { Budgets, Funds } from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';

describe('Finance', () => {
  describe('Funds', () => {
    const testData = {
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          budget: { allocated: 0 },
        });

        testData.fiscalYear = fiscalYear;
        testData.fund = fund;
        testData.budget = budget;
      });

      cy.createTempUser([
        Permissions.uiFinanceCreateAllocations.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewEditFundAndBudget.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C414970 Decrease allocation resulting in a negative available budget amount (thunderjet) (TaaS)',
      { tags: ['obsolete', 'thunderjet', 'eurekaPhase1'] },
      () => {
        // Open Fund from Preconditions
        Funds.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        FundDetails.checkFundDetails({
          currentBudget: { name: testData.budget.name, allocated: '$0.00' },
        });

        // Click on the record in "Current budget" accordion
        const BudgetDetails = FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: 'Total allocated', value: '$0.00' }],
        });

        // Click "Actions" button, Select "Decrease allocation" option
        const AddTransferModal = BudgetDetails.clickDecreaseAllocationButton();

        // Fill the following fields: "Amount"
        AddTransferModal.fillTransferDetails({ amount: '10' });

        // Click "Confirm" button
        AddTransferModal.clickConfirmButton({
          confirmNegative: { confirm: true },
          transferCreated: false,
          ammountAllocated: true,
        });
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: 'Decrease in allocation', value: '$10.00' },
            { key: 'Total allocated', value: '($10.00)' },
            { key: 'Total funding', value: '($10.00)' },
          ],
          balance: { cash: '($10.00)', available: '($10.00)' },
        });

        // Close "Budget details" page by clicking "X" button
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          currentBudget: {
            name: testData.budget.name,
            allocated: '($10.00)',
            available: '($10.00)',
          },
        });
      },
    );
  });
});

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
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../support/utils';
import InteractorsTools from '../../../support/utils/interactorsTools';
import States from '../../../support/fragments/finance/states';

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
      next: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}02`,
        periodStart: new Date(date.getFullYear() + 1, 0, 1),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
    };
    const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYears.current.id };
    const fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
    const allocatedAmount = '100';
    const allocationValidationError = 'Value must be greater than or equal to 0';
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
      'C663288 Budget can be created in Inactive and Closed status and cannot be created with negative allocation and negative values in "Allowable expenditure/encumbrance percentage" (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C663288'] },
      () => {
        FinanceHelper.searchByName(fund.name);
        Funds.selectFund(fund.name);
        FundDetails.waitLoading();
        FundDetails.checkFundDetails({
          currentBudget: [],
          plannedBudgets: [],
        });

        let AddBudgetModal = FundDetails.clickAddCurrentBudget();
        AddBudgetModal.clickSaveButtonWithoutClosing();
        AddBudgetModal.checkAllocatedFieldError(allocationValidationError);

        AddBudgetModal.fillInAllocated('-100');
        AddBudgetModal.clickSaveButtonWithoutClosing();
        AddBudgetModal.checkAllocatedFieldError(allocationValidationError);

        AddBudgetModal.closeModal();
        FundDetails.waitLoading();

        AddBudgetModal = FundDetails.clickAddPlannedBudget();
        AddBudgetModal.clickSaveButtonWithoutClosing();
        AddBudgetModal.checkAllocatedFieldError(allocationValidationError);

        AddBudgetModal.fillInAllocated('-50');
        AddBudgetModal.clickSaveButtonWithoutClosing();
        AddBudgetModal.checkAllocatedFieldError(allocationValidationError);

        AddBudgetModal.closeModal();
        FundDetails.waitLoading();

        AddBudgetModal = FundDetails.clickAddCurrentBudget();
        AddBudgetModal.fillBudgetDetails({ allocated: allocatedAmount });
        AddBudgetModal.fillInExpenditure('-10');
        AddBudgetModal.clickSaveButtonWithoutClosing();
        InteractorsTools.checkCalloutErrorMessage(States.budgetHasNotBeenCreated);

        AddBudgetModal.closeModal();
        FundDetails.waitLoading();

        AddBudgetModal = FundDetails.clickAddPlannedBudget();
        AddBudgetModal.fillBudgetDetails({ allocated: allocatedAmount });
        AddBudgetModal.fillInEncumbrance('-10');
        AddBudgetModal.clickSaveButtonWithoutClosing();
        InteractorsTools.checkCalloutErrorMessage(States.budgetHasNotBeenCreated);

        AddBudgetModal.closeModal();
        FundDetails.waitLoading();

        AddBudgetModal = FundDetails.clickAddCurrentBudget();
        AddBudgetModal.fillBudgetDetails({
          status: BUDGET_STATUSES.CLOSED,
          allocated: allocatedAmount,
        });
        AddBudgetModal.clearEncumbranceField();
        AddBudgetModal.clickSaveButton();
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: 'Total allocated', value: `$${allocatedAmount}.00` }],
          information: [
            { key: 'Status', value: BUDGET_STATUSES.CLOSED },
            { key: 'Allowable encumbrance', value: '-' },
          ],
        });

        BudgetDetails.closeBudgetDetails();
        AddBudgetModal = FundDetails.clickAddPlannedBudget();
        AddBudgetModal.fillBudgetDetails({
          status: BUDGET_STATUSES.INACTIVE,
          encumbrance: '0',
          allocated: '0',
        });
        AddBudgetModal.clickSaveButton();
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: 'Total allocated', value: '$0.00' }],
          information: [
            { key: 'Status', value: BUDGET_STATUSES.INACTIVE },
            { key: 'Allowable encumbrance', value: '0' },
          ],
        });

        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          currentBudget: { allocated: `$${allocatedAmount}.00` },
          plannedBudgets: [{ allocated: '$0.00' }],
        });
      },
    );
  });
});

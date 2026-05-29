import { FUNDING_INFORMATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import States from '../../../support/fragments/finance/states';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance', () => {
  describe('Funds', () => {
    const testData = {
      user: {},
    };

    const fiscalYear = FiscalYears.getDefaultFiscalYear();
    const ledger = {
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: fiscalYear.id,
      restrictEncumbrance: true,
      restrictExpenditures: true,
    };
    const fundA = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
    const fundB = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
    const budgetA = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      fiscalYearId: fiscalYear.id,
      fundId: fundA.id,
    };
    const budgetB = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      fiscalYearId: fiscalYear.id,
      fundId: fundB.id,
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        FiscalYears.createViaApi(fiscalYear);
        Ledgers.createViaApi(ledger);
        Funds.createViaApi(fundA);
        Funds.createViaApi(fundB);
        Budgets.createViaApi(budgetA);
        Budgets.createViaApi(budgetB);
      });

      cy.createTempUser([
        Permissions.uiFinanceCreateTransfers.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
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
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C825296 Meaningful error toast message appears when money transfer is unsuccessful (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C825296'] },
      () => {
        FinanceHelper.searchByName(fundA.name);
        Funds.selectFund(fundA.name);
        const BudgetDetails = FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: '$0.00' }],
        });

        const AddTransferModal = BudgetDetails.openAddTransferModal();
        AddTransferModal.verifyFromFieldValue('');
        AddTransferModal.verifyToFieldValue(fundA.name);
        AddTransferModal.fillTransferDetails({
          fromFund: fundB.name,
          amount: '200',
        });
        AddTransferModal.verifyConfirmButtonDisabled(false);

        AddTransferModal.clickConfirmButton({
          confirmNegative: { confirm: true },
          expectError: true,
        });
        AddTransferModal.verifyModalView();
        InteractorsTools.checkCalloutMessage(
          States.exceedExpenditureLimitError('200', budgetA.name, budgetB.name),
          'error',
        );

        AddTransferModal.closeModal();
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: '$0.00' }],
        });
      },
    );
  });
});

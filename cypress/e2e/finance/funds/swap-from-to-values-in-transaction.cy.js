import {
  BUDGET_DETAIL_FIELDS,
  BUDGET_STATUSES,
  FUNDING_INFORMATION_NAMES,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  Ledgers,
  TransactionDetails,
  Transactions,
} from '../../../support/fragments/finance';
import AddTransferModal from '../../../support/fragments/finance/modals/addTransferModal';
import { TRANSFER_ACTIONS } from '../../../support/fragments/finance/transfer/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Funds', () => {
    const testData = {
      user: {},
    };

    let fiscalYear;
    let ledger;
    let fundA;
    let fundB;
    let budgetA;
    let budgetB;
    let existingTag;
    const newTagName = `testtag${getRandomPostfix()}`.toLowerCase();
    const transferAmount = '50';
    const allocationAmount = '30';
    const transactionDescription = `autotest_description_${getRandomPostfix()}`;
    const negativeAmount = '-10';

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        fiscalYear = FiscalYears.getDefaultFiscalYear();
        ledger = {
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fiscalYear.id,
          restrictEncumbrance: false,
          restrictExpenditures: false,
        };
        fundA = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
        fundB = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
        budgetA = {
          ...Budgets.getDefaultBudget(),
          allocated: 100,
          fiscalYearId: fiscalYear.id,
          fundId: fundA.id,
        };
        budgetB = {
          ...Budgets.getDefaultBudget(),
          allocated: 100,
          fiscalYearId: fiscalYear.id,
          fundId: fundB.id,
        };

        FiscalYears.createViaApi(fiscalYear);
        Ledgers.createViaApi(ledger);
        Funds.createViaApi(fundA);
        Funds.createViaApi(fundB);
        Budgets.createViaApi(budgetA);
        Budgets.createViaApi(budgetB);

        existingTag = `existingtag${getRandomPostfix()}`.toLowerCase();
        cy.createTagApi({ label: existingTag }).then(() => {});
      });

      cy.createTempUser([
        Permissions.uiFinanceCreateTransfers.gui,
        Permissions.uiFinanceCreateAllocations.gui,
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
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C808443 Swapping "From" and "To" values when creating a transaction between funds (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C808443'] },
      () => {
        FinanceHelper.searchByName(fundA.name);
        Funds.selectFund(fundA.name);
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.waitLoading();
        BudgetDetails.checkBudgetDetails({
          information: [{ key: BUDGET_DETAIL_FIELDS.BUDGET_STATUS, value: BUDGET_STATUSES.ACTIVE }],
        });

        BudgetDetails.openAddTransferModal();
        AddTransferModal.verifyModalView({ header: TRANSFER_ACTIONS.TRANSFER });
        AddTransferModal.verifyFromFieldValue('');
        AddTransferModal.verifyToFieldValue(fundA.name);
        AddTransferModal.verifySwapButtonExists();

        AddTransferModal.clickSwapButton();
        AddTransferModal.verifyFromFieldValue(fundA.name);
        AddTransferModal.verifyToFieldValue('');
        AddTransferModal.verifySwapButtonExists();

        AddTransferModal.fillNegativeAmount(negativeAmount);
        AddTransferModal.expectError('Amount must be a positive number');

        AddTransferModal.clickSwapButton();
        AddTransferModal.verifyFromFieldValue('');
        AddTransferModal.verifyToFieldValue(fundA.name);
        AddTransferModal.verifyAmountFieldValue(negativeAmount);
        AddTransferModal.expectError('Amount must be a positive number');

        AddTransferModal.fillTransferDetails({
          fromFund: fundB.name,
          toFund: fundA.name,
          amount: transferAmount,
          tag: existingTag,
          description: transactionDescription,
        });
        AddTransferModal.addNewTag(newTagName);
        AddTransferModal.verifyTagsDisplayed(existingTag, newTagName);
        AddTransferModal.verifyConfirmButtonDisabled(false);

        AddTransferModal.clickSwapButton();
        AddTransferModal.verifyFromFieldValue(fundA.name);
        AddTransferModal.verifyToFieldValue(fundB.name);
        AddTransferModal.verifyAmountFieldValue(transferAmount);
        AddTransferModal.verifyTagsDisplayed(existingTag, newTagName);

        AddTransferModal.clickSwapButton();
        AddTransferModal.verifyFromFieldValue(fundB.name);
        AddTransferModal.verifyToFieldValue(fundA.name);
        AddTransferModal.verifyAmountFieldValue(transferAmount);
        AddTransferModal.verifyTagsDisplayed(existingTag, newTagName);

        AddTransferModal.clickConfirmButton({ transferCreated: true });
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: `$${transferAmount}.00` },
            {
              key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING,
              value: `$${Number(budgetA.allocated) + Number(transferAmount)}.00`,
            },
          ],
        });

        BudgetDetails.clickViewTransactionsLink();
        Transactions.selectTransaction(TRANSACTION_TYPES.TRANSFER);
        TransactionDetails.waitLoading();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `$${transferAmount}.00` },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: 'User' },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.TRANSFER },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: fundB.name },
            { key: TRANSACTION_DETAIL_FIELDS.TO, value: fundA.name },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: '-' },
            { key: TRANSACTION_DETAIL_FIELDS.TAGS, value: existingTag },
            { key: TRANSACTION_DETAIL_FIELDS.DESCRIPTION, value: transactionDescription },
          ],
        });
        TransactionDetails.closeTransactionDetails();
        Transactions.closeTransactionsPage();

        BudgetDetails.closeBudgetDetails();
        FundDetails.closeFundDetails();
        FinanceHelper.searchByName(fundB.name);
        Funds.selectFund(fundB.name);
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.waitLoading();
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: `($${transferAmount}.00)` },
            {
              key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING,
              value: `$${budgetB.allocated - transferAmount}.00`,
            },
          ],
        });

        BudgetDetails.clickMoveAllocationButton();
        AddTransferModal.verifyModalView({ header: TRANSFER_ACTIONS.MOVE_ALLOCATION });
        AddTransferModal.verifyFromFieldValue('');
        AddTransferModal.verifyToFieldValue(fundB.name);
        AddTransferModal.verifySwapButtonExists();

        AddTransferModal.selectBlankOptionInToField();
        AddTransferModal.fillTransferDetails({
          fromFund: '',
          toFund: '',
          amount: allocationAmount,
          tag: existingTag,
          description: transactionDescription,
        });
        AddTransferModal.verifyFromFieldValue('');
        AddTransferModal.verifyToFieldValue('');
        AddTransferModal.expectErrorPresent('Required!');

        AddTransferModal.clickSwapButton();
        AddTransferModal.verifyFromFieldValue('');
        AddTransferModal.verifyToFieldValue('');
        AddTransferModal.expectErrorPresent('Required!');
        AddTransferModal.verifyAmountFieldValue(allocationAmount);

        AddTransferModal.fillTransferDetails({ fromFund: fundB.name, toFund: fundB.name });
        AddTransferModal.verifyFromFieldValue(fundB.name);
        AddTransferModal.verifyToFieldValue(fundB.name);
        AddTransferModal.expectError(
          'Transfers and allocations can not be made from one budget to that same budget',
        );

        AddTransferModal.clickSwapButton();
        AddTransferModal.verifyFromFieldValue(fundB.name);
        AddTransferModal.verifyToFieldValue(fundB.name);
        AddTransferModal.expectError(
          'Transfers and allocations can not be made from one budget to that same budget',
        );
        AddTransferModal.verifyAmountFieldValue(allocationAmount);

        AddTransferModal.fillTransferDetails({ fromFund: fundA.name });
        AddTransferModal.clickConfirmButton({ transferCreated: false, ammountAllocated: true });

        BudgetDetails.clickViewTransactionsLink();
        Transactions.selectTransaction(TRANSACTION_TYPES.ALLOCATION, `$${allocationAmount}.00`);
        TransactionDetails.waitLoading();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `$${allocationAmount}.00` },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: 'User' },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ALLOCATION },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: fundA.name },
            { key: TRANSACTION_DETAIL_FIELDS.TO, value: fundB.name },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: '-' },
            { key: TRANSACTION_DETAIL_FIELDS.TAGS, value: existingTag },
            { key: TRANSACTION_DETAIL_FIELDS.DESCRIPTION, value: transactionDescription },
          ],
        });
        TransactionDetails.closeTransactionDetails();
      },
    );
  });
});

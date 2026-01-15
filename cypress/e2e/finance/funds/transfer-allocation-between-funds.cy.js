import { Permissions } from '../../../support/dictionary';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
  Transfers,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';

describe('Finance', () => {
  const testData = {
    user: {},
  };

  let fiscalYear;
  let ledger;
  let funds;
  let budgets;

  const createTestFunds = ({ secondBudget = 100 } = {}) => {
    fiscalYear = FiscalYears.getDefaultFiscalYear();
    ledger = {
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: fiscalYear.id,
      restrictEncumbrance: false,
      restrictExpenditures: false,
    };
    funds = {
      first: { ...Funds.getDefaultFund(), ledgerId: ledger.id },
      second: { ...Funds.getDefaultFund(), ledgerId: ledger.id },
    };
    budgets = {
      first: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: fiscalYear.id,
        fundId: funds.first.id,
      },
      second: {
        ...Budgets.getDefaultBudget(),
        allocated: secondBudget,
        fiscalYearId: fiscalYear.id,
        fundId: funds.second.id,
      },
    };

    cy.getAdminToken().then(() => {
      FiscalYears.createViaApi(fiscalYear);
      Ledgers.createViaApi(ledger);
      Object.values(funds).forEach((fund) => {
        Funds.createViaApi(fund);
      });
      Object.values(budgets).forEach((budget) => {
        Budgets.createViaApi(budget);
      });
    });
  };

  before('Create test user', () => {
    cy.createTempUser([
      Permissions.uiFinanceCreateTransfers.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });
  });

  after('Delete test user', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
    });
  });

  describe('Funds', () => {
    beforeEach('Create test data', () => {
      createTestFunds();
      const transfer = Transfers.getDefaultTransfer({
        amount: 0,
        fromFundId: funds.second.id,
        toFundId: funds.first.id,
        fiscalYearId: fiscalYear.id,
      });
      Transfers.createTransferViaApi(transfer);

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
        authRefresh: true,
      });
    });

    it(
      'C374183 Money transfer between funds is successful if it results in negative available amount (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C374183'] },
      () => {
        // Open Fund B from Preconditions
        FinanceHelper.searchByName(funds.second.name);
        Funds.selectFund(funds.second.name);
        FundDetails.checkFundDetails({
          currentBudget: { name: budgets.second.name, allocated: '$100.00', available: '$100.00' },
        });

        // Click on the record in "Current budget" accordion
        const BudgetDetails = FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: 'Initial allocation', value: '$100.00' }],
        });

        // Click "Actions" button, Select "Transfer" option
        const AddTransferModal = BudgetDetails.openAddTransferModal();

        // Fill the following fields: "From", "To", "Amount"
        AddTransferModal.fillTransferDetails({
          fromFund: funds.second.name,
          toFund: funds.first.name,
          amount: '140',
        });

        // Click "Confirm" button, Click "Cancel" button
        AddTransferModal.clickConfirmButton({
          confirmNegative: { confirm: false },
          transferCreated: false,
        });

        // Click "Confirm" button
        AddTransferModal.clickConfirmButton({
          confirmNegative: { confirm: true },
          transferCreated: true,
        });
        BudgetDetails.checkBudgetDetails({
          balance: { available: '($40.00)' },
        });

        // Close Budget details by clicking "X" button
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          currentBudget: { name: budgets.second.name, allocated: '$100.00', available: '($40.00)' },
        });
      },
    );
  });

  describe('Funds', () => {
    beforeEach('Create test data', () => {
      createTestFunds();
      const transfer = Transfers.getDefaultTransfer({
        amount: 110,
        fromFundId: funds.second.id,
        toFundId: funds.first.id,
        fiscalYearId: fiscalYear.id,
      });
      Transfers.createTransferViaApi(transfer);

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
        authRefresh: true,
      });
    });

    it(
      'C375066 Money transfer between funds is successful if budget "From" already has negative available amount (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375066'] },
      () => {
        // Open Fund B from Preconditions
        FinanceHelper.searchByName(funds.second.name);
        Funds.selectFund(funds.second.name);
        FundDetails.checkFundDetails({
          currentBudget: { name: budgets.second.name, allocated: '$100.00', available: '($10.00)' },
        });

        // Click on the record in "Current budget" accordion
        const BudgetDetails = FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          balance: { available: '($10.00)' },
        });

        // Click "Actions" button, Select "Transfer" option
        const AddTransferModal = BudgetDetails.openAddTransferModal();

        // Fill the following fields: "From", "To", "Amount"
        AddTransferModal.fillTransferDetails({
          fromFund: funds.second.name,
          toFund: funds.first.name,
          amount: '20',
        });

        // Click "Confirm" button
        AddTransferModal.clickConfirmButton({ confirmNegative: { confirm: true } });
        BudgetDetails.checkBudgetDetails({
          balance: { available: '($30.00)' },
        });

        // Close Budget details by clicking "X" button
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          currentBudget: { name: budgets.second.name, allocated: '$100.00', available: '($30.00)' },
        });
      },
    );
  });

  describe('Funds', () => {
    beforeEach('Create test transfer', () => {
      createTestFunds();
      const transfer = Transfers.getDefaultTransfer({
        amount: 110,
        fromFundId: funds.first.id,
        toFundId: funds.second.id,
        fiscalYearId: fiscalYear.id,
      });
      Transfers.createTransferViaApi(transfer);

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });

    it(
      'C375067 Money transfer between funds is successful if budget "To" already has negative available amount (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375067'] },
      () => {
        // Open Fund B from Preconditions
        FinanceHelper.searchByName(funds.second.name);
        Funds.selectFund(funds.second.name);
        FundDetails.checkFundDetails({
          currentBudget: { name: budgets.second.name, allocated: '$100.00', available: '$210.00' },
        });

        // Click on the record in "Current budget" accordion
        const BudgetDetails = FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          balance: { available: '$210.00' },
        });

        // Click "Actions" button, Select "Transfer" option
        const AddTransferModal = BudgetDetails.openAddTransferModal();

        // Fill the following fields: "From", "To", "Amount"
        AddTransferModal.fillTransferDetails({
          fromFund: funds.second.name,
          toFund: funds.first.name,
          amount: '130',
        });

        // Click "Confirm" button
        AddTransferModal.clickConfirmButton();
        BudgetDetails.checkBudgetDetails({
          balance: { available: '$80.00' },
        });

        // Close Budget details by clicking "X" button
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          currentBudget: { name: budgets.second.name, allocated: '$100.00', available: '$80.00' },
        });
      },
    );
  });

  describe('Funds', () => {
    beforeEach('Create test transfer', () => {
      createTestFunds({ secondBudget: 0 });
      const transfer = Transfers.getDefaultTransfer({
        amount: 0,
        fromFundId: funds.second.id,
        toFundId: funds.first.id,
        fiscalYearId: fiscalYear.id,
      });
      Transfers.createTransferViaApi(transfer);

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });

    it(
      'C375068 Money transfer between funds is successful if budget "From" already has 0.00 money allocation (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375068'] },
      () => {
        // Open Fund B from Preconditions
        FinanceHelper.searchByName(funds.second.name);
        Funds.selectFund(funds.second.name);
        FundDetails.checkFundDetails({
          currentBudget: { name: budgets.second.name, allocated: '$0.00', available: '$0.00' },
        });

        // Click on the record in "Current budget" accordion
        const BudgetDetails = FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          balance: { available: '$0.00' },
        });

        // Click "Actions" button, Select "Transfer" option
        const AddTransferModal = BudgetDetails.openAddTransferModal();

        // Fill the following fields: "From", "To", "Amount"
        AddTransferModal.fillTransferDetails({
          fromFund: funds.second.name,
          toFund: funds.first.name,
          amount: '40',
        });

        // Click "Confirm" button
        AddTransferModal.clickConfirmButton({ confirmNegative: { confirm: true } });
        BudgetDetails.checkBudgetDetails({
          balance: { available: '($40.00)' },
        });

        // Close Budget details by clicking "X" button
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          currentBudget: { name: budgets.second.name, allocated: '$0.00', available: '($40.00)' },
        });
      },
    );
  });
});

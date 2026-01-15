import { Permissions } from '../../../support/dictionary';
import { ExpenseClasses } from '../../../support/fragments/settings/finance';
import {
  FiscalYears,
  FinanceHelper,
  Ledgers,
  Funds,
  Budgets,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Finance', () => {
  describe('Ledgers', () => {
    const expenseClasses = [
      ExpenseClasses.getDefaultExpenseClass(),
      ExpenseClasses.getDefaultExpenseClass(),
    ];
    const fiscalYear = FiscalYears.getDefaultFiscalYear();
    const ledgers = {
      first: { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYear.id },
      second: { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYear.id },
      third: { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYear.id },
    };
    const funds = {
      first: { ...Funds.getDefaultFund(), ledgerId: ledgers.first.id },
      second: { ...Funds.getDefaultFund(), ledgerId: ledgers.second.id },
      third: { ...Funds.getDefaultFund(), ledgerId: ledgers.third.id },
    };
    const budgets = {
      second: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: fiscalYear.id,
        fundId: funds.second.id,
      },
      third: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: fiscalYear.id,
        fundId: funds.third.id,
        statusExpenseClasses: expenseClasses.map(({ id: expenseClassId }) => ({
          status: 'Active',
          expenseClassId,
        })),
      },
    };
    const testData = {
      fileMasks: {
        first: `*${ledgers.first.code}-${fiscalYear.code}.csv`,
        second: `*${ledgers.second.code}-${fiscalYear.code}.csv`,
        third: `*${ledgers.third.code}-${fiscalYear.code}.csv`,
      },
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        expenseClasses.forEach((expenseClass) => {
          ExpenseClasses.createExpenseClassViaApi(expenseClass);
        });
        FiscalYears.createViaApi(fiscalYear);
        Object.values(ledgers).forEach((ledger) => {
          Ledgers.createViaApi(ledger);
        });
        Object.values(funds).forEach((fund) => {
          Funds.createViaApi(fund);
        });
        Object.values(budgets).forEach((budget) => {
          Budgets.createViaApi(budget);
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceViewLedger.gui,
        Permissions.uiFinanceExportFinanceRecords.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(testData.fileMasks).forEach((fileMask) => {
          FileManager.deleteFileFromDownloadsByMask(fileMask);
        });
        Object.values(budgets).forEach((budget) => {
          Budgets.getBudgetByIdViaApi(budget.id).then((resp) => {
            Budgets.updateBudgetViaApi({ ...resp, statusExpenseClasses: [] });
          });
          Budgets.deleteViaApi(budget.id);
        });
        Object.values(funds).forEach((fund) => {
          Funds.deleteFundViaApi(fund.id);
        });
        Object.values(ledgers).forEach((ledger) => {
          Ledgers.deleteLedgerViaApi(ledger.id);
        });
        expenseClasses.forEach((expenseClasse) => {
          ExpenseClasses.deleteExpenseClassViaApi(expenseClasse.id);
        });
        FiscalYears.deleteFiscalYearViaApi(fiscalYear.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C350963 User can export Ledger with different Funds content (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C350963'] },
      () => {
        // Click on Ledger name link from preconditions
        FinanceHelper.searchByName(ledgers.first.name);
        const LedgerDetails = Ledgers.selectLedger(ledgers.first.name);
        LedgerDetails.checkLedgerDetails({ funds: [] });

        // Export budget information for Ledger #1
        const ExportBudgetModal = LedgerDetails.exportBudgetInformation({
          fiscalYear: fiscalYear.id,
        });

        // Click "Export" button
        ExportBudgetModal.clickExportButton();

        // Open downloaded file, Check "Name (Budget)", "Name(Fund)" columns
        FileManager.convertCsvToJson(testData.fileMasks.first).then((data) => {
          cy.expect(data[0]['Name (Budget)']).to.equal('No budget found');
          cy.expect(data[0]['Name (Fund)']).to.equal(funds.first.name);
        });

        // Open Ledger #2 from Preconditions details pane
        cy.visit(`${TopMenu.ledgerPath}?query=${ledgers.second.name}`);
        Ledgers.selectLedger(ledgers.second.name);
        LedgerDetails.checkLedgerDetails({ funds: [{ name: funds.second.name }] });

        // Export budget information for Ledger #1
        LedgerDetails.exportBudgetInformation({
          fiscalYear: fiscalYear.id,
        });

        // Click "Export" button
        ExportBudgetModal.clickExportButton();

        // Open downloaded file, Check "Name (Budget)", "Name(Fund)" columns
        FileManager.convertCsvToJson(testData.fileMasks.second).then((data) => {
          cy.expect(data[0]['Name (Budget)']).to.equal(budgets.second.name);
          cy.expect(data[0]['Name (Fund)']).to.equal(funds.second.name);
        });

        // Open Ledger #3 from Preconditions details pane
        cy.visit(`${TopMenu.ledgerPath}?query=${ledgers.third.name}`);
        Ledgers.selectLedger(ledgers.third.name);
        LedgerDetails.checkLedgerDetails({ funds: [{ name: funds.third.name }] });

        // Export budget information for Ledger #1
        LedgerDetails.exportBudgetInformation({
          fiscalYear: fiscalYear.id,
        });

        // Click "Export" button
        ExportBudgetModal.clickExportButton();

        // Open downloaded file, Check "Name (Budget)", "Name(Fund)", "Name (ExpClass)" columns
        FileManager.convertCsvToJson(testData.fileMasks.third).then((data) => {
          data.forEach((budget) => {
            cy.expect(funds.third.name).to.equal(budget['Name (Fund)']);
            cy.expect(budgets.third.name).to.equal(budget['Name (Budget)']);
            cy.expect(expenseClasses.map(({ name }) => name)).to.include(
              budget['Name (Exp Class)'],
            );
          });
        });
      },
    );
  });
});

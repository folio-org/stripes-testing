import financeHelper from '../../support/fragments/finance/financeHelper';
import fiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import ledgers from '../../support/fragments/finance/ledgers/ledgers';
import invoices from '../../support/fragments/invoices/invoices';
import topMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testData = {
  fiscalName: 'Fiscal Year 2024',
  selectName: 'Fiscal Year 2024',
  ledgerName: 'Future',
  fiscalYearQuantity1: '300.00',
  fiscalYearQuantity2: '300.00',
  selectLedgerName: 'Future',
  groupsName: 'Test N5',
  selectGroupName: 'Test N5',
  fundName: 'AA1',
  selectFundName: 'AA1',
  searchByInvoiceName: '12344',
  selectSearchByInvoiceNameRecord: '12344',
  selectInvoiceLineNumber: '12320886456-1',
  searchByFinanceName: 'Ledger NIX 1',
  selectsearchByFinanceNameRecord: 'Ledger NIX 1',
  fillRolloverFiscalYearINFo: 'NIX2024',
  ledgername2: 'Ledger NIX 1',
  selectLedgerName2: 'Ledger NIX 1',
  searchByParameterFiscalYear: 'Name',
  searchByNameFiscalYesar: 'AA2023',
  selectFirstFiscalRecord: 'AA2023',
  searchByParameterFiscalYear2: 'Name',
  searchByNameFiscalYear2: 'AA2024',
  selectSecondFiscalRecord: 'AA2024',
  searchByInvoiceName2: '12344',
  selectSearchByInvoiceNameRecord2: '12344',
  selectFundIDFromthelist: 'Fund A(A)',
  selectCurrentBudgerFromthelist: 'A-FYA2023',
  selectTransactionListDetailsResultsFromCurrentBudget: '3/6/2023, 7:48 AM',
  selectviewDetailsPreviousBudgets: 'BFYRO-FYRO2021',
  searchFundName: 'AF2',
  selectFundNameRecordList: 'AF2',
  selectCurrentBudgerFromthelistFunds: 'AF2-AF2024',
  selectTransactionListDetailsResultsFromEmbaranceDate: '6/20/2023, 5:39 AM',
  viewDetailsPreviousBudgetsRecord: 'AF2-AF2021',
  fundFinancialQuantity1: '1,000.00',
  fundFinancialQuantity2: '974.00',
  groupFinancialQuantity1: '2,000.00',
  groupFinancialQuantity2: '2,000.00',
  ledgerFinancialQuantity1: '0.00',
  ledgerFinancialQuantity2: '0.00',
};

describe('Users-loans App', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C396360 Save invoice fiscal year after fund distribution change to fund using different ledger if FY was undefined(Thunderjet)', { tags: [testTypes.criticalPath, devTeams.thunderjet] }, () => {
    cy.visit(topMenu.invoicesPath);
    invoices.searchByNumber(testData.searchByInvoiceName);
    invoices.clickOnFirstInvoicesResultList(
      testData.selectSearchByInvoiceNameRecord
    );
    invoices.selectInvoiceLine(testData.selectInvoiceLineNumber);
    invoices.editInvoiceLine();
    invoices.selectFundID();
    invoices.editVendorInvoiceNumber();
    cy.visit(topMenu.financePath);
    financeHelper.searchByName(testData.searchByFinanceName);
    financeHelper.selectFirstLedger(testData.selectsearchByFinanceNameRecord);
    ledgers.clickonViewledgerDetails();
    ledgers.resetAll();
    financeHelper.searchByName(testData.ledgername2);
    financeHelper.selectFirstLedger(testData.selectLedgerName2);
    ledgers.clickOnFiscalyearTab();
    invoices.searchByParameter(
      testData.searchByParameterFiscalYear,
      testData.searchByNameFiscalYesar
    );
    financeHelper.selectFirstFiscalRecord(testData.selectFirstFiscalRecord);
    fiscalYears.editFiscalYearDetails();
    fiscalYears.filltheStartAndEndDateoncalenderstartDateField1();
    ledgers.resetAll();
    invoices.searchByParameter(
      testData.searchByParameterFiscalYear2,
      testData.searchByNameFiscalYear2
    );
    financeHelper.selectFirstFiscalRecord(testData.selectSecondFiscalRecord);
    fiscalYears.editFiscalYearDetails();
    fiscalYears.filltheStartAndEndDateoncalenderstartDateField2();
    cy.visit(topMenu.invoicesPath);
    invoices.searchByNumber(testData.searchByInvoiceName2);
    invoices.clickOnFirstInvoicesResultList(
      testData.selectSearchByInvoiceNameRecord2
    );
    invoices.approveInvoice(); // API Failure
    invoices.selectInvoiceLine(testData.selectInvoiceLineNumber);
    invoices.selectFundIDFromthelist(testData.selectFundIDFromthelist);
    invoices.selectCurrentBudgerFromthelist(
      testData.selectCurrentBudgerFromthelist
    );
    invoices.clickOnViewTransactionsHyperText();
    invoices.transactionListDetailsResultsFromCurrentBudget(
      testData.selectTransactionListDetailsResultsFromCurrentBudget
    );
    invoices.closeTwoXmarkInOneScreen();
    ledgers.closeOpenedPage();
    ledgers.closeOpenedPage();
    invoices.viewDetailsPreviousBudgets(
      testData.selectviewDetailsPreviousBudgets
    );
    invoices.clickOnViewTransactionsHyperText();
    invoices.transactionListDetailsResultsFromPreviousBudget();
    cy.visit(topMenu.financePath);
    ledgers.clickOnFundTab();
    invoices.searchByParameter(testData.searchByParameterFiscalYear, testData.searchFundName);
    financeHelper.selectFirstFundRecord(testData.selectFundNameRecordList);
    invoices.selectCurrentBudgerFromthelist(
      testData.selectTransactionListDetailsResultsFromEmbaranceDate
    );
    invoices.clickOnViewTransactionsHyperText();
    invoices.transactionListDetailsResultsFromEmbarance(
      testData.selectTransactionListDetailsResultsFromEmbaranceDate
    );
    ledgers.closeOpenedPage();
    ledgers.closeOpenedPage();
    invoices.viewDetailsPreviousBudgets(
      testData.viewDetailsPreviousBudgetsRecord
    );
    invoices.clickOnViewTransactionsHyperText();
    invoices.transactionListDetailsResultsFromPreviousBudgetEmbrance();
  });
});

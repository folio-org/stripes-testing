import financeHelper from '../../support/fragments/finance/financeHelper';
import fiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import funds from '../../support/fragments/finance/funds/funds';
import groups from '../../support/fragments/finance/groups/groups';
import ledgers from '../../support/fragments/finance/ledgers/ledgers';
import invoices from '../../support/fragments/invoices/invoices';
import topMenu from '../../support/fragments/topMenu';

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
  fundFinancialQuantity2: '975.00',
  groupFinancialQuantity1: '2,000.00',
  groupFinancialQuantity2: '2,000.00',
  ledgerFinancialQuantity1: '0.00',
  ledgerFinancialQuantity2: '0.00',
};
const rollOverData = {
  ledgerName: 'AE2',
  selectLedger: 'AE2',
  fiscalYearDate: 'AE2025',
  rollOverDate: '7/21/2023',
  searchByParameter: 'Name',
  searchByName: 'AE2',
  selectFundRecord: 'AE2',
  searchledger: 'Test N8',
  selectLedgerName: 'Test N8',
  fillInRolloverInfo: 'FYG2222',
  currentBudeget: 'Test N11-FYG2024',
  plannedBudget: 'Test N11-FYG1111',
  selectEmbranceResult: '6/20/2023, 4:41 AM',
  assertionData: 'FYG2024',
};

const encumbranceData = {
  searchByName: 'autotest_ledger_275.5001376680388208',
  selectFirstLedger: 'autotest_ledger_275.5001376680388208',
  selectFirstCheckBox: 'FY2024',
  rollOverDate: '7/21/2023',
  fillInRolloverInfo: 'FY2029',
  ledgerName: 'AJ',
  selectLedgerName: 'AJ',
  fundName: 'AJ2',
  selectFund: 'AJ2',
  selectCurrentBudgerFromthelist: 'AJ2-AJ2024',
  transactionListDetailsResultsFromEmbarance: '7/3/2023, 8:12 AM',
  assertionData: 'AJ2024',
};

describe('Users-loans App', () => {
  it('login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C377030-"Available balance" is displayed as a negative number when running a deficit', () => {
    cy.visit(topMenu.financePath);
    fiscalYears.clickOnFiscalYear();
    financeHelper.searchByName(testData.fiscalName);
    financeHelper.selectFirstFinance(testData.selectName);
    ledgers.checkFinancialSummeryQuality(
      testData.fiscalYearQuantity1,
      testData.fiscalYearQuantity2
    );
    ledgers.closeOpenedPage();
    fiscalYears.clickOnLedgerTab();
    financeHelper.searchByName(testData.ledgerName);
    ledgers.selectLedger(testData.selectLedgerName);
    ledgers.checkFinancialSummeryQuality(
      testData.ledgerFinancialQuantity1,
      testData.ledgerFinancialQuantity2
    );
    ledgers.closeOpenedPage();
    groups.clickOnGroupTab();
    groups.searchByName(testData.groupsName);
    groups.selectGroup(testData.selectGroupName);
    ledgers.checkFinancialSummeryQuality(
      testData.groupFinancialQuantity1,
      testData.groupFinancialQuantity2
    );
    ledgers.closeOpenedPage();
    funds.clickOnFundsTab();
    funds.searchByName(testData.fundName);
    funds.selectFund(testData.selectFundName);
    funds.selectBudgetDetails();
    funds.checkBudgetQuantity1(
      testData.fundFinancialQuantity1,
      testData.fundFinancialQuantity2
    );
  });

  it('C396360-Save invoice fiscal year after fund distribution change to fund using different ledger if FY was undefined', () => {
    cy.visit(topMenu.invoicesPath);
    invoices.searchByNumber(testData.searchByInvoiceName);
    invoices.clickOnFirstInvoicesResultList(
      testData.selectSearchByInvoiceNameRecord
    );
    invoices.selectInvoiceLine(testData.selectInvoiceLineNumber);
    invoices.editInvoiceLine();
    invoices.SelectFundID();
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
    fiscalYears.EditFiscalYEarDetails();
    fiscalYears.FilltheStartAndEndDateoncalenderstartDateField1();
    ledgers.resetAll();
    invoices.searchByParameter(
      testData.searchByParameterFiscalYear2,
      testData.searchByNameFiscalYear2
    );
    financeHelper.selectFirstFiscalRecord(testData.selectSecondFiscalRecord);
    fiscalYears.EditFiscalYEarDetails();
    fiscalYears.FilltheStartAndEndDateoncalenderstartDateField2();
    cy.visit(topMenu.invoicesPath);
    invoices.searchByNumber(testData.searchByInvoiceName2);
    invoices.clickOnFirstInvoicesResultList(
      testData.selectSearchByInvoiceNameRecord2
    );
    invoices.approveInvoice(); // API Failure
    invoices.selectInvoiceLine(testData.selectInvoiceLineNumber);
    invoices.SelectFundIDFromthelist(testData.selectFundIDFromthelist);
    invoices.SelectCurrentBudgerFromthelist(
      testData.selectCurrentBudgerFromthelist
    );
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromCurrentBudget(
      testData.selectTransactionListDetailsResultsFromCurrentBudget
    );
    invoices.CloseTwoXmarkInOneScreen();
    ledgers.closeOpenedPage();
    ledgers.closeOpenedPage();
    invoices.viewDetailsPreviousBudgets(
      testData.selectviewDetailsPreviousBudgets
    );
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromPreviousBudget();
    cy.visit(topMenu.financePath);
    ledgers.clickOnFundTab();
    invoices.searchByParameter(testData.searchByParameterFiscalYear, testData.searchFundName);
    financeHelper.selectFirstFundRecord(testData.selectFundNameRecordList);
    invoices.SelectCurrentBudgerFromthelist(
      testData.selectTransactionListDetailsResultsFromEmbaranceDate
    );
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromEmbarance(
      testData.selectTransactionListDetailsResultsFromEmbaranceDate
    );
    ledgers.closeOpenedPage();
    ledgers.closeOpenedPage();
    invoices.viewDetailsPreviousBudgets(
      testData.viewDetailsPreviousBudgetsRecord
    );
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromPreviousBudgetEmbrance();
  });

  it('C359604-Make more than one preview for one ledger and same fiscal year with ""Test rollover"", check test rollover results', () => {
    cy.visit(topMenu.financePath);
    financeHelper.searchByName(rollOverData.ledgerName);
    financeHelper.selectFirstLedger(rollOverData.selectLedger);
    ledgers.clickonViewledgerDetails();
    ledgers.rollover();
    ledgers.selectFirstCheckBox(rollOverData.fiscalYearDate);
    ledgers.clickonViewledgerDetails();
    ledgers.rolloverLogs();
    ledgers.exportRollover(rollOverData.rollOverDate);
    ledgers.closeOpenedPage();
    ledgers.clickOnFundTab();
    invoices.searchByParameter(
      rollOverData.searchByParameter,
      rollOverData.searchByName
    );
    financeHelper.selectFirstFundRecord(rollOverData.selectFundRecord);
    ledgers.clickOnFiscalyearTab();
    ledgers.clickOnLedgerTab();
    financeHelper.searchByName(rollOverData.searchledger);
    financeHelper.selectFirstLedger(rollOverData.selectLedgerName);
    ledgers.clickonViewledgerDetails();
    ledgers.rollover();
    ledgers.fillInRolloverInfo(rollOverData.fillInRolloverInfo);
    ledgers.clickonViewledgerDetails();
    ledgers.selectFund();
    invoices.SelectCurrentBudgerFromthelist(rollOverData.currentBudeget);
    ledgers.closeOpenedPage();
    invoices.viewDetailsPlannedBudgets(rollOverData.plannedBudget);
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromEmbarance(
      rollOverData.selectEmbranceResult
    );
    ledgers.verifyEncumbranceDetailsSection(rollOverData.assertionData);
  });

  it('C375267-Encumbrances are rolled over correctly when order fund distribution was changed and related paid invoice exists (based on Remaining)', () => {
    cy.visit(topMenu.financePath);
    financeHelper.searchByName(encumbranceData.searchByName);
    financeHelper.selectFirstLedger(encumbranceData.selectFirstLedger);
    ledgers.clickonViewledgerDetails();
    ledgers.rollover();
    ledgers.selectFirstCheckBox(encumbranceData.selectFirstCheckBox);
    ledgers.clickonViewledgerDetails();
    ledgers.rolloverLogs();
    ledgers.exportRollover(encumbranceData.rollOverDate);
    ledgers.closeOpenedPage();
    ledgers.clickonViewledgerDetails();
    ledgers.rollover();
    ledgers.fillInRolloverInfo(encumbranceData.fillInRolloverInfo);
    ledgers.clickonViewledgerDetails();
    ledgers.resetAll();
    financeHelper.searchByName(encumbranceData.ledgerName);
    financeHelper.selectFirstLedger(encumbranceData.selectLedgerName);
    ledgers.selectFund();
    ledgers.closeOpenedPage();
    financeHelper.searchByName(encumbranceData.fundName);
    financeHelper.selectFirstFundRecord(encumbranceData.selectFund);
    invoices.SelectCurrentBudgerFromthelist(
      encumbranceData.selectCurrentBudgerFromthelist
    );
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromEmbarance(
      encumbranceData.transactionListDetailsResultsFromEmbarance
    );
    ledgers.verifyEncumbranceDetailsSection(encumbranceData.assertionData);
  });
});

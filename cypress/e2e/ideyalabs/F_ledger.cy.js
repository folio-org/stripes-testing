import ledgers from '../../support/fragments/finance/ledgers/ledgers';
import topMenu from '../../support/fragments/topMenu';
import financeHelper from '../../support/fragments/finance/financeHelper';
import fiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import invoices from '../../support/fragments/invoices/invoices';
import funds from '../../support/fragments/finance/funds/funds';
import groups from '../../support/fragments/finance/groups/groups';

const testData = {
  Fiscalname : 'Fiscal Year 2024',
  Selectname:'Fiscal Year 2024',
  Ledgername:'Future',
  SelectLedgerName:'Future',
  GroupsName:'Test N1',
  SelectGroupName:'Test N1',
  FundName:'AA1',
  SelectFundName:'AA1',
  SearchByInvoiceName:'12344',
  SelectSearchByInvoiceNameRecord:'12344',
  SelectInvoiceLineNumber:'12320886456-1',
  searchByFinanceName:'Ledger NIX 1',
  SelectsearchByFinanceNameRecord:'Ledger NIX 1',
  FillRolloverFiscalYearINFo:'NIX2024',
  Ledgername2:'Ledger NIX 1',
  SelectLedgerName2:'Ledger NIX 1',
  SearchByParameterFiscalYear:'Name',
  SearchByNameFiscalYesar:'AA2023',
  selectFirstFiscalRecord:'AA2023',
  SearchByParameterFiscalYear2:'Name',
  SearchByNameFiscalYear2:'AA2024',
  SelectSecondFiscalRecord:'AA2024',
  SearchByInvoiceName2:'12344',
  SelectSearchByInvoiceNameRecord2:'12344',
  selectInvoiceLineNumber:'12320886456-1',
  SelectFundIDFromthelist:'Fund A(A)',
  SelectCurrentBudgerFromthelist:'A-FYA2023',
  SelectTransactionListDetailsResultsFromCurrentBudget:'3/6/2023, 7:48 AM',
  SelectviewDetailsPreviousBudgets:'BFYRO-FYRO2021',
  SearchFundName:'AF2',
  SelectFundNameRecordList:'AF2',
  SelectCurrentBudgerFromthelistFunds:'AF2-AF2024',
  SelectTransactionListDetailsResultsFromEmbaranceDate:'6/20/2023, 5:39 AM',
  ViewDetailsPreviousBudgetsRecord:'AF2-AF2021'
};
describe('Users-loans App', () => {
  it('login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // cy.visit(topMenu.ledgerPath);
  });

  it('C377030-Available balance"" is displayed as a negative number when running a deficit', () => {
    cy.visit(topMenu.financePath);
    fiscalYears.clickOnFiscialYear();
    financeHelper.searchByName(testData.Fiscalname);
    financeHelper.selectFirstFinace(testData.Selectname);
    fiscalYears.clickOnLedgerTab();
    financeHelper.searchByName(testData.Ledgername);
    ledgers.selectLedger(testData.SelectLedgerName);
    groups.clickOnGroupTab();
    groups.searchByName(testData.GroupsName);
    groups.selectGroup(testData.SelectGroupName);
    funds.clickOnFundsTab();
    funds.searchByName(testData.FundName);
    funds.selectFund(testData.SelectFundName);
    funds.selectBudgetDetails();
  });
  it('C396360-Save invoice fiscal year after fund distribution change to fund using different ledger if FY was undefined', () => {
    cy.visit(topMenu.invoicesPath);
    invoices.searchByNumber(testData.SearchByInvoiceName);
    invoices.clickOnFirstInvoicesResultList(testData.SelectSearchByInvoiceNameRecord);
    invoices.selectInvoiceLine(testData.SelectInvoiceLineNumber);
    invoices.editInvoiceLine();
    invoices.SelectFundID(); // need to modified FundID
    invoices.editVendorInvoiceNumber();
    cy.visit(topMenu.financePath);
    financeHelper.searchByName(testData.searchByFinanceName);
    financeHelper.selectFirstLedger(testData.SelectsearchByFinanceNameRecord);
    ledgers.clickonViewledgerDetails();
    // ledgers.rollover()
    // ledgers.fillInRolloverInfo(testData.FillRolloverFiscalYearINFo);
    ledgers.resetAll();
    financeHelper.searchByName(testData.Ledgername2);
    financeHelper.selectFirstLedger(testData.SelectLedgerName2);
    ledgers.clickOnFiscalyearTab();
    invoices.searchByParameter(testData.SearchByParameterFiscalYear, testData.SearchByNameFiscalYesar);
    financeHelper.selectFirstFiscalRecord(testData.selectFirstFiscalRecord);
    fiscalYears.EditFiscalYEarDetails();
    fiscalYears.FilltheStartAndEndDateoncalenderstartDateField1(); // need to change the startdate and end date
    ledgers.resetAll();
    invoices.searchByParameter(testData.SearchByParameterFiscalYear2, testData.SearchByNameFiscalYear2);
    financeHelper.selectFirstFiscalRecord(testData.SelectSecondFiscalRecord);
    fiscalYears.EditFiscalYEarDetails();
    fiscalYears.FilltheStartAndEndDateoncalenderstartDateField2(); // need to change the startdate and end date
    cy.visit(topMenu.invoicesPath);
    invoices.searchByNumber(testData.SearchByInvoiceName2);
    invoices.clickOnFirstInvoicesResultList(testData.SelectSearchByInvoiceNameRecord2);
    invoices.approveInvoice();// it is not getting approved so here script will be failed.
    invoices.selectInvoiceLine(testData.selectInvoiceLineNumber);
    invoices.SelectFundIDFromthelist(testData.SelectFundIDFromthelist);
    invoices.SelectCurrentBudgerFromthelist(testData.SelectCurrentBudgerFromthelist);
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromCurrentBudget(testData.SelectTransactionListDetailsResultsFromCurrentBudget);
    invoices.CloseTwoXmarkInOneScreen();
    ledgers.closeOpenedPage();
    ledgers.closeOpenedPage();
    invoices.viewDetailsPreviousBudgets(testData.SelectviewDetailsPreviousBudgets);
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromPreviousBudget();
    cy.visit(topMenu.financePath);
    ledgers.clickOnFundTab();
    invoices.searchByParameter('Name', testData.SearchFundName);
    financeHelper.selectFirstFundRecord(testData.SelectFundNameRecordList);
    invoices.SelectCurrentBudgerFromthelist(testData.SelectTransactionListDetailsResultsFromEmbaranceDate);
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromEmbarance(testData.SelectTransactionListDetailsResultsFromEmbaranceDate);
    ledgers.closeOpenedPage();
    ledgers.closeOpenedPage();
    invoices.viewDetailsPreviousBudgets(testData.ViewDetailsPreviousBudgetsRecord);
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromPreviousBudgetEmbrance();
  });

  it('C359604-Make more than one preview for one ledger and same fiscal year with ""Test rollover"", check test rollover results', () => {
    // cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));
    cy.visit(topMenu.financePath);
    financeHelper.searchByName('AE2');
    financeHelper.selectFirstLedger('AE2');
    ledgers.clickonViewledgerDetails();
    ledgers.rollover();
    ledgers.selectFirstCheckBox('AE2025');
    ledgers.clickonViewledgerDetails();
    ledgers.rolloverLogs();
    // invoices.TransactionListDetailsResultsFromRolledLogs();
    ledgers.closeOpenedPage();
    ledgers.clickOnFundTab();
    invoices.searchByParameter('Name', 'AE2');
    financeHelper.selectFirstFundRecord('AE2');
    ledgers.clickOnFiscalyearTab();
    ledgers.clickOnLedgerTab();
    financeHelper.searchByName('Test N8');
    financeHelper.selectFirstLedger('Test N8');
    ledgers.clickonViewledgerDetails();
    ledgers.rollover();
    ledgers.fillInRolloverInfo('FYG1111');
    ledgers.clickonViewledgerDetails();
    ledgers.selectFund();
    invoices.SelectCurrentBudgerFromthelist('Test N11-FYG2024');
    ledgers.closeOpenedPage();
    invoices.viewDetailsPlannedBudgets('Test N11-FYG1111');
    invoices.ClickOnViewTransactionsHyperText();
    invoices.TransactionListDetailsResultsFromEmbarance('6/20/2023, 4:41 AM');
  });
  it('C375267-Encumbrances are rolled over correctly when order fund distribution was changed and related paid invoice exists (based on Remaining)', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.financePath);
    financeHelper.searchByName('autotest_ledger_275.5001376680388208');
    financeHelper.selectFirstLedger('autotest_ledger_275.5001376680388208');
    ledgers.clickonViewledgerDetails();
    ledgers.rollover();
    ledgers.selectFirstCheckBox('FY2024');
    ledgers.clickonViewledgerDetails();
    ledgers.rolloverLogs();
    ledgers.closeOpenedPage();
    ledgers.clickonViewledgerDetails();
    ledgers.clickonRollerlogResult('07/11/2023-result');
    ledgers.rollover();
    ledgers.fillInRolloverInfo('FY2022');
    ledgers.clickonViewledgerDetails();
    ledgers.resetAll();
    financeHelper.searchByName('AJ');
    financeHelper.selectFirstLedger('AJ');
    ledgers.selectFund();
    ledgers.closeOpenedPage();
    financeHelper.searchByName('AJ2');
    financeHelper.selectFirstFundRecord('AJ2');
  });
});

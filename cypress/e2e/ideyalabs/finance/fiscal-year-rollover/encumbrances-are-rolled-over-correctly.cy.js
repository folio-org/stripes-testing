import financeHelper from '../../../../support/fragments/finance/financeHelper';
import ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import invoices from '../../../../support/fragments/invoices/invoices';
import topMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';

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
};

describe('Finance: Fiscal Year Rollover', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C375267 Encumbrances are rolled over correctly when order fund distribution was changed and related paid invoice exists (based on Remaining) (Thunderjet)', { tags: [testTypes.ideaLabsTests] }, () => {
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
    invoices.selectCurrentBudgerFromthelist(
      encumbranceData.selectCurrentBudgerFromthelist
    );
    invoices.clickOnViewTransactionsHyperText();
    invoices.transactionListDetailsResultsFromEmbarance(
      encumbranceData.transactionListDetailsResultsFromEmbarance
    );
  });
});

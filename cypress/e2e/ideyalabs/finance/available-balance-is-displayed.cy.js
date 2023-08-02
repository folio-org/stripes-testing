import financeHelper from '../../../support/fragments/finance/financeHelper';
import fiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import funds from '../../../support/fragments/finance/funds/funds';
import groups from '../../../support/fragments/finance/groups/groups';
import ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import topMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';

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

describe('Finance: Funds', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C377030 "Available balance" is displayed as a negative number when running a deficit(Thunderjet)', { tags: [testTypes.ideaLabsTests] }, () => {
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
});

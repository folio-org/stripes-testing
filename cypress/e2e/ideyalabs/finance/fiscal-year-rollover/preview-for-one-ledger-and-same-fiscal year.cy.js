import financeHelper from '../../../../support/fragments/finance/financeHelper';
import ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import invoices from '../../../../support/fragments/invoices/invoices';
import topMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';

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

describe('Finance: Fiscal Year Rollover', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C359604 Make more than one preview for one ledger and same fiscal year with ""Test rollover"", check test rollover results(Thunderjet)', { tags: [testTypes.ideaLabsTests] }, () => {
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
    invoices.selectCurrentBudgerFromthelist(rollOverData.currentBudeget);
    ledgers.closeOpenedPage();
    invoices.viewDetailsPlannedBudgets(rollOverData.plannedBudget);
    invoices.clickOnViewTransactionsHyperText();
    invoices.transactionListDetailsResultsFromEmbarance(
      rollOverData.selectEmbranceResult
    );
  });
});

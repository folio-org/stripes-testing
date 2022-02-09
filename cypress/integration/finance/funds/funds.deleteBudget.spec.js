import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
import TestType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import Transaction from '../../../support/fragments/finance/fabrics/newTransaction';

describe('ui-finance: Delete budget from fund', () => {
  const currentBudgetSectionId = 'currentBudget';
  const fund = { ...NewFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.deleteLedgerApi(createdLedgerId);
  });

  it('C343211 Delete Budget', { tags: [TestType.smoke] }, () => {
    const quantityArray = [0, 100];
    const transactionFactory = new Transaction();
    Funds.createFundViaUI(fund)
      .then(
        createdLedger => {
          createdLedgerId = createdLedger.id;
          quantityArray.forEach(
            quantity => {
              Funds.addBudget(quantity);
              Funds.checkCreatedBudget(fund.code, DateTools.getCurrentFiscalYearCode());
              Funds.checkBudgetQuantity(quantity);
              Funds.openTransactions();
              if (quantity === 0) {
                // check empty transaction
                FinanceHelp.checkZeroSearchResultsMessage();
              } else {
                Funds.checkTransaction(0, transactionFactory.create('allocation', `$${quantity.toFixed(2)}`, fund.code, '', 'User', ''));
              }
              FinanceHelp.clickOnCloseIconButton();
              Funds.deleteBudgetViaActions();
              Funds.checkDeletedBudget(currentBudgetSectionId);
            }
          );
          Funds.deleteFundViaActions();
          FinanceHelp.searchByName(fund.name);
          Funds.checkZeroSearchResultsHeader();
        }
      );
  });
});

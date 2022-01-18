import Funds from '../../../support/fragments/finance/funds/funds';
import { getCurrentFiscalYearCode } from '../../../support/utils/dateTools';
import { testType } from '../../../support/utils/tagTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import newFund from '../../../support/fragments/finance/funds/newFund';

describe('ui-finance: Delete budget from fund', () => {
  const currentBudgetSectionId = 'currentBudget';
  const fund = { ...newFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.deleteLedgerApi(createdLedgerId);
  });

  it('C343211 delete budget', { tags: [testType.smoke] }, () => {
    const quantityArray = [0, 100];
    cy.createFundViaUI(fund)
      .then(createdLedger => { createdLedgerId = createdLedger.id; });
    quantityArray.forEach(
      quantity => {
        Funds.addBudget(quantity);
        Funds.checkCreatedBudget(fund.code, getCurrentFiscalYearCode());
        Funds.checkBudgetQuantity(quantity);
        Funds.openTransactions();
        if (quantity === 0) {
          // check empty transaction
          FinanceHelp.checkZeroSearchResultsMessage();
        } else {
          Funds.checkTransaction(quantity, fund.code);
        }
        FinanceHelp.clickOnCloseIconButton();
        Funds.deleteBudgetViaActions();
        Funds.checkDeletedBudget(currentBudgetSectionId);
      }
    );
    Funds.deleteFundViaActions();
    FinanceHelp.searchByName(fund.name);
    Funds.checkZeroSearchResultsHeader();
  });
});

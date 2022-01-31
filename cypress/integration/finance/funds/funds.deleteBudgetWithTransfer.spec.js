import Funds from '../../../support/fragments/finance/funds/funds';
import TopMenu from '../../../support/fragments/topMenu';
import { getCurrentFiscalYearCode } from '../../../support/utils/dateTools';
import testType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import newFund from '../../../support/fragments/finance/funds/newFund';
import { calloutTypes } from '../../../../interactors';

describe('ui-finance: Delete budget with transfer transaction from fund', () => {
  const fundFrom = { ...newFund.defaultFund };
  const fundTo = { ...newFund.defaultFund };

  it('C343240 delete budget with transfer transaction', { tags: [testType.smoke] }, () => {
    // TODO: update test in testrail - it should contain rather business actions than buttons clicks etc.
    const hundredQunatity = 100;
    const budgetCanNotBeDeletedMessage = 'Budget can not be deleted, because it has transactions';
    Funds.createFundViaUI(fundFrom);
    // create second fund
    fundTo.name = 'to_' + fundTo.name;
    fundTo.code = 'to_' + fundTo.code;
    fundTo.externalAccount = 'to_' + fundTo.externalAccount;
    Funds.createFundViaUI(fundTo);
    // add 0 budget to second fund
    Funds.addBudget(0);
    Funds.checkCreatedBudget(fundTo.code, getCurrentFiscalYearCode());
    Funds.checkBudgetQuantity(0);
    cy.visit(TopMenu.fundPath);
    // add 100 budget to first fund and perform transfer
    FinanceHelp.searchByName(fundFrom.name);
    FinanceHelp.selectFromResultsList();
    Funds.addBudget(hundredQunatity);
    Funds.checkCreatedBudget(fundFrom.code, getCurrentFiscalYearCode());
    Funds.checkBudgetQuantity(hundredQunatity);
    Funds.transferAmount(hundredQunatity / 2, fundFrom, fundTo);
    Funds.checkBudgetQuantity(hundredQunatity / 2);
    Funds.tryToDeleteBudgetWithTransaction();
    // verify that budget was not deleted and quantity still equals 50
    FinanceHelp.checkCalloutMessage(budgetCanNotBeDeletedMessage, calloutTypes.error);
    Funds.checkBudgetQuantity(hundredQunatity / 2);
  });
});

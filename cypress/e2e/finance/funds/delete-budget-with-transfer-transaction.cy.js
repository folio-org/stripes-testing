import { calloutTypes } from '../../../../interactors';
import { APPLICATION_NAMES } from '../../../support/constants';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Funds from '../../../support/fragments/finance/funds/funds';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DateTools from '../../../support/utils/dateTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Funds', () => {
  const fundFrom = { ...NewFund.defaultFund };
  const fundTo = { ...NewFund.defaultFund };
  const hundredQunatity = 100;
  const budgetCanNotBeDeletedMessage = 'Budget can not be deleted, because it has transactions';

  before('Create test data and login', () => {
    cy.getAdminToken();
    // create first fund
    Funds.createFundViaApiAndUi(fundFrom);
    // create second fund
    fundTo.name = 'to_' + fundTo.name;
    fundTo.code = 'to_' + fundTo.code;
    fundTo.externalAccount = 'to_' + fundTo.externalAccount;
    Funds.createFundViaApiAndUi(fundTo);
    // add 0 budget to second fund
    Funds.addBudget(0);
    Funds.checkCreatedBudget(fundTo.code, DateTools.getCurrentFiscalYearCode());
    Funds.checkBudgetQuantity(0);

    TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.FINANCE);
    FinanceHelp.selectFundsNavigation();
    Funds.waitLoading();
  });

  // TODO: update test in testrail - it should contain rather business actions than buttons clicks etc.
  it(
    'C343240 Delete the budget with transfer transaction (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C343240'] },
    () => {
      // add 100 budget to first fund and perform transfer
      FinanceHelp.searchByName(fundFrom.name);
      Funds.selectFund(fundFrom.name);
      Funds.addBudget(hundredQunatity);
      Funds.checkCreatedBudget(fundFrom.code, DateTools.getCurrentFiscalYearCode());
      Funds.checkBudgetQuantity(hundredQunatity);
      Funds.transferAmount(hundredQunatity / 2, fundFrom, fundTo);
      Funds.checkBudgetQuantity(hundredQunatity / 2);
      Funds.tryToDeleteBudgetWithTransaction();
      // verify that budget was not deleted and quantity still equals 50
      InteractorsTools.checkCalloutMessage(budgetCanNotBeDeletedMessage, calloutTypes.error);
      Funds.checkBudgetQuantity(hundredQunatity / 2);
    },
  );
});

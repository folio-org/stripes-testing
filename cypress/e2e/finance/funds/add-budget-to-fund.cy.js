import { matching } from '@interactors/html';
import { APPLICATION_NAMES } from '../../../support/constants';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import States from '../../../support/fragments/finance/states';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Funds', () => {
  const testData = {
    fiscalYear: { ...FiscalYears.defaultUiFiscalYear },
    ledger: { ...Ledgers.getDefaultLedger() },
    fund: { ...Funds.defaultUiFund },
    budget: {
      ...Budgets.getDefaultBudget(),
      allocated: 0,
    },
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(testData.fiscalYear).then((fyResponse) => {
      testData.fiscalYear.id = fyResponse.id;
      testData.ledger.fiscalYearOneId = testData.fiscalYear.id;

      Ledgers.createViaApi(testData.ledger).then((ledgerResponse) => {
        testData.ledger.id = ledgerResponse.id;
        testData.fund.ledgerId = testData.ledger.id;

        Funds.createViaApi(testData.fund).then((fundResponse) => {
          testData.fund.id = fundResponse.fund.id;
        });
      });
    });

    cy.loginAsAdmin();
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Budgets.getBudgetViaApi({ query: `fundId="${testData.fund.id}"` }).then((budgetsResponse) => {
      Budgets.deleteViaApi(budgetsResponse.budgets[0].id);
    });
    Funds.deleteFundViaApi(testData.fund.id);
    cy.deleteLedgerApi(testData.ledger.id);
    FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
  });

  it('C4057 Add budget to a fund (thunderjet)', { tags: ['smoke', 'thunderjet', 'C4057'] }, () => {
    TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.FINANCE);
    FinanceHelper.clickFundButton();
    FinanceHelper.searchByName(testData.fund.name);
    Funds.selectFund(testData.fund.name);
    Funds.addBudget(0);
    InteractorsTools.checkCalloutMessage(matching(new RegExp(States.budgetCreatedSuccessfully)));
    BudgetDetails.waitLoading();
  });
});

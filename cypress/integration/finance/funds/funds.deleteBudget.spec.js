import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import { getCurrentFiscalYearCode } from '../../../support/utils/dateTools';
import { testType } from '../../../support/utils/tagTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';

describe('ui-finance: Delete budget from fund', () => {
  const currentBudgetSectionId = 'currentBudget';
  const ledger = {
    id: uuid(),
    name: `autotest_ledger_${getRandomPostfix()}`,
    code: `autotest_code_${getRandomPostfix()}`,
    description: `autotest_ledger_ description_${getRandomPostfix()}`,
    ledgerStatus: 'Frozen',
    currency: 'USD',
    restrictEncumbrance: false,
    restrictExpenditures: false,
    acqUnitIds: '',
    fiscalYearOneId: ''
  };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy
      .okapiRequest({
        path: 'acquisitions-units/units',
        limit: 1,
      })
      .then(({ body }) => {
        ledger.acqUnitIds = [body.acquisitionsUnits[0].id];
      });

    cy
      .okapiRequest({
        path: 'finance/fiscal-years',
        limit: 1,
      })
      .then(({ body }) => {
        ledger.fiscalYearOneId = body.fiscalYears[0].id;
      });
  });

  beforeEach(() => {
    cy.createLedgerApi({
      ...ledger
    });
  });

  afterEach(() => {
    cy.deleteLedgerApi(ledger.id);
  });

  it('C343211 should delete budget for a new fund', { tags: [testType.smoke] }, () => {
    const defaultFund = { ...NewFund.defaultFund };
    const zeroQuantity = 0;
    const hundredQuantity = 100;
    defaultFund.ledgerName = ledger.name;

    cy.visit('/finance/fund');
    Funds.createDefaultFund(defaultFund);
    Funds.checkCreatedFund(defaultFund.name);

    Funds.addBudget(zeroQuantity);
    Funds.checkCreatedBudget(defaultFund.code, getCurrentFiscalYearCode());
    Funds.checkBudgetQuantity(zeroQuantity);
    Funds.openTransactions();
    // check empty transaction
    FinanceHelp.checkZeroSearchResultsMessageLabel();
    FinanceHelp.clickOnCloseIconButton();
    Funds.deleteBudgetViaActions();
    Funds.checkDeletedBudget(currentBudgetSectionId);

    Funds.addBudget(hundredQuantity);
    Funds.checkCreatedBudget(defaultFund.code, getCurrentFiscalYearCode());
    Funds.checkBudgetQuantity(hundredQuantity);
    Funds.openTransactions();
    Funds.checkTransaction(hundredQuantity, defaultFund.code);
    FinanceHelp.clickOnCloseIconButton();
    Funds.deleteBudgetViaActions();
    Funds.checkDeletedBudget(currentBudgetSectionId);

    Funds.deleteFundViaActions();
    FinanceHelp.searchByName(defaultFund.name);
    Funds.checkZeroSearchResultsHeader();
  });
});

import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import { getCurrentFiscalYearCode } from '../../../support/utils/dateTools';
import { testType } from '../../../support/utils/tagTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import TopMenu from '../../../support/fragments/topMenu';

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

  it('C343211 delete budget', { tags: [testType.smoke] }, () => {
    const defaultFund = { ...NewFund.defaultFund };
    const quantityArray = [0, 100];
    defaultFund.ledgerName = ledger.name;

    cy.visit(TopMenu.fundPath);
    Funds.createFundViaUi(defaultFund);
    Funds.checkCreatedFund(defaultFund.name);

    quantityArray.forEach(
      quantity => {
        Funds.addBudget(quantity);
        Funds.checkCreatedBudget(defaultFund.code, getCurrentFiscalYearCode());
        Funds.checkBudgetQuantity(quantity);
        Funds.openTransactions();
        if (quantity === 0) {
          // check empty transaction
          FinanceHelp.checkZeroSearchResultsMessage();
        } else {
          Funds.checkTransaction(quantity, defaultFund.code);
        }
        FinanceHelp.clickOnCloseIconButton();
        Funds.deleteBudgetViaActions();
        Funds.checkDeletedBudget(currentBudgetSectionId);
      }
    );

    Funds.deleteFundViaActions();
    FinanceHelp.searchByName(defaultFund.name);
    Funds.checkZeroSearchResultsHeader();
  });
});
